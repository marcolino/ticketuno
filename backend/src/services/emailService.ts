import { Resend } from 'resend';
import type { CreateEmailOptions, CreateEmailResponse } from 'resend';
import mjml2html from 'mjml';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';

import { database } from '../db/database';
import { SendEmailOptions } from '@ticketuno/shared';
import { i18n } from '../i18n';
import config from '../config';
import { getErrorMessage } from '@ticketuno/shared';

const resend = new Resend(process.env.RESEND_API_KEY!);

type Translator = (key: string, options?: Record<string, unknown>) => string;

type HelperOptions = {
  data?: {
    root?: {
      translator?: Translator;
    };
  };
  hash?: Record<string, unknown>;
};

let handlebarsHelpersRegistered = false;

i18n.on('failedLoading', (lng, ns, msg) => {
  console.error(`i18n failed loading ${lng}/${ns}:`, msg);
})

class EmailService {
  private templatePath = path.join(__dirname, '../templates/emails');
  private partialsRegistered = false;

  constructor() {
    this.registerHandlebarsHelpers();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private registerHandlebarsHelpers() {
    if (handlebarsHelpersRegistered) return;

    Handlebars.registerHelper(
      't',
      function (key: string, options: HelperOptions): string {
        try {
          const translator = options.data?.root?.translator;

          if (typeof translator !== 'function') {
            console.warn('[EMAIL][HB] translator missing for key:', key);
            return key;
          }

          const result = translator(key, options.hash ?? {});

          console.log('[EMAIL][HB]', key, '=>', result);

          return result;
        } catch (err: unknown) {
          console.error('[EMAIL][HB] error:', err);
          return key;
        }
      }
    );

    handlebarsHelpersRegistered = true;
  }

  private async registerPartials() {
    if (this.partialsRegistered) return;

    const partialsDir = path.join(this.templatePath, 'partials');

    try {
      const files = await fs.readdir(partialsDir);

      for (const file of files) {
        const content = await fs.readFile(
          path.join(partialsDir, file),
          'utf-8'
        );

        Handlebars.registerPartial(
          file.replace('.mjml', ''),
          content
        );
      }

      console.log('[EMAIL] Partials loaded:', files);
      this.partialsRegistered = true;
    } catch (err) {
      console.warn('[EMAIL] No partials loaded:', err);
    }
  }

  // =====================================================
  // SEND
  // =====================================================

  async send(
    options: SendEmailOptions & { lang?: string }
  ): Promise<CreateEmailResponse> {
    try {
      const payload = await this.prepare(options);
      //console.log('[EMAIL] Sending email:', payload);
      const response = await resend.emails.send(payload);

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log('[EMAIL] Sent successfully:', response.data?.id);

      return response;
    } catch (err) {
      console.error(
        '[EMAIL] Send failed:',
        getErrorMessage(err)
      );
      throw err;
    }
  }

  // =====================================================
  // PREPARE
  // =====================================================

  async prepare(
    options: SendEmailOptions & { lang?: string }
  ): Promise<CreateEmailOptions> {
    const {
      to,
      subject,
      template,
      variables = {},
      lang,
      text,
      html,
      isMarketing = false,
      attachments,
    } = options;

    if (!config.email.from) {
      throw new Error('config.email.from missing');
    }

    const recipients = Array.isArray(to) ? to : [to];
    const userEmail = recipients[0];

    // -------------------------------------------------
    // Resolve language
    // -------------------------------------------------

    let finalLang = lang || '';

    if (!finalLang) {
      const user = await database.getUserByEmail(userEmail);
      finalLang =
        user?.language ||
        config.app.defaultLanguage
    }

    finalLang = finalLang.toLowerCase().split('-')[0];

    // -------------------------------------------------
    // Translator
    // -------------------------------------------------

    const translator = i18n.getFixedT(finalLang, 'common');

    // console.log('[EMAIL] Translation test:', {
    //   Dear: translator('Dear'),
    //   BestRegards: translator('Best regards'),
    //   Team: translator('The team of'),
    // });

    let finalHtml = html || '';
    const finalText =
      text ||
      translator('Please view this email in HTML format');

    // -------------------------------------------------
    // TEMPLATE MODE
    // -------------------------------------------------

    if (template) {
      await this.registerPartials();

      const templateFile = path.join(
        this.templatePath,
        'body',
        `${template}.mjml`
      );

      console.log('[EMAIL] Loading template:', templateFile);

      const contentFile = await fs.readFile(
        templateFile,
        'utf-8'
      );

      const templateVariables = {
        ...variables,
        appName: config.app.name,
        logoUrl: `${config.app.baseUrlProduction}/images/logo.png`,
        translator,
      };

      const contentCompiled = Handlebars.compile(contentFile)(
        templateVariables
      );

      // -------------------------------------------------
      // USER LINKS
      // -------------------------------------------------

      let unsubscribeUrl: string | null = null;
      let preferencesUrl: string | null = null;

      const user = await database.getUserByEmail(userEmail);

      if (user) {
        if (isMarketing) {
          const token = await database.createToken(
            user.id,
            'communication.marketingEmails'
          );

          unsubscribeUrl =
            `${config.app.baseUrlFrontend}/unsubscribe/${token}`;
        }

        const token = await database.createToken(
          user.id,
          'consent'
        );

        preferencesUrl =
          `${config.app.baseUrlFrontend}/consent/${token}`;
      }

      // -------------------------------------------------
      // LAYOUT
      // -------------------------------------------------

      const layoutFile = await fs.readFile(
        path.join(this.templatePath, 'layout.mjml'),
        'utf-8'
      );

      const fullMjml = Handlebars.compile(layoutFile)({
        ...templateVariables,
        translator,
        body: contentCompiled,
        unsubscribeUrl,
        preferencesUrl,
        isMarketing,
        copyrightYear: new Date().getFullYear(),
      });

      // -------------------------------------------------
      // MJML COMPILE
      // -------------------------------------------------

      const result = mjml2html(fullMjml, {
        validationLevel: 'soft',
      });

      if (result.errors?.length) {
        console.error('[EMAIL] MJML errors:', result.errors);
      }

      finalHtml = result.html;

      console.log('[EMAIL] HTML generated length:', finalHtml.length);
    }

    // -------------------------------------------------
    // FINAL PAYLOAD
    // -------------------------------------------------
    const payload: CreateEmailOptions = finalHtml ?
      {
        from: config.email.from,
        to: recipients,
        subject,
        html: finalHtml,
        ...(finalText ? { text: finalText } : {}),
        ...(attachments?.length ? { attachments } : {}),
      }
    : {
        from: config.email.from,
        to: recipients,
        subject,
        text: finalText!,
        ...(attachments?.length ? { attachments } : {}),
      }
    ;

    return payload;
  }
}

export default new EmailService();

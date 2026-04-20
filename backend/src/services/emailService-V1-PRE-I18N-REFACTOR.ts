import { Resend } from 'resend';
import type { CreateEmailOptions, CreateEmailResponse } from 'resend';
import i18next from 'i18next';
import mjml2html from 'mjml';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { database } from '../db/database';
import { SendEmailOptions, /*AttachmentWithContentType, Attachment*/ } from '../shared/types/email';
import { i18n } from '../i18n';
import config from '../config';
import { getErrorMessage } from '../shared/utils/misc';

const resend = new Resend(process.env.RESEND_API_KEY!);
let handlebarsHelpersRegistered = false;

// type SendEmailOptions = {
//   to: string | string[];
//   subject: string;
//   template?: string;
//   variables?: Record<string, unknown>;
//   text?: string;
//   html?: string;
//   isMarketing?: boolean;
// };

class EmailService {
  private templatePath = path.join(__dirname, '../templates/emails');
  private partialsRegistered = false;

  constructor() {
    registerHandlebarsHelpers();
  }

  private async registerPartials() {
    if (this.partialsRegistered) return;

    const partialsDir = path.join(this.templatePath, 'partials');
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

    this.partialsRegistered = true;
  }

  // Public: send email
  async send(options: SendEmailOptions & { lang?: string }): Promise<CreateEmailResponse> {
    const payload = await this.prepare(options); // Prepare the email payload

    // Call the real email send service
    try {
      const response = await resend.emails.send(payload);
      if (response.error) {
        throw new Error(response.error.message || i18n.t('Email send error'));
      }
      if (!response.data) {
        throw new Error(i18n.t('Email send failed'));
      }
      console.log('Email sent:', response.data.id);
      return response;
    } catch (err: unknown) {
      console.error(i18n.t('Email send failed: {{err}}', { err: getErrorMessage(err) }));
      throw err;
    }
  }

  async prepare(options: SendEmailOptions & { lang?: string }) {
    const {
      to,
      subject,
      template,
      variables = {},
      lang = null,
      text = i18n.t('Please view this email in HTML format'),
      html,
      isMarketing = false,
      attachments,
    } = options;

    if (!config.email.from) {
      throw new Error(i18n.t('Email FROM is not defined in environment'));
    }
    
    const recipients = Array.isArray(to) ? to : [to];

    const userEmail = recipients[0]; // We decide the first recipient email identifyes the user
    
    let finalLang = lang;
    // if (!finalLang) {
    //   finalLang = config.app.defaultLanguage;
    // }

    console.log("LLL1", {
      requestedLang: lang,
      finalLang,
      userEmail
    });
    if (!finalLang) {
      const user = await database.getUserByEmail(userEmail);
      console.log("LLL2", user?.language);
      finalLang = user?.language || config.app.defaultLanguage;
    }
    console.log("LLL3", {
      requestedLang: lang,
      finalLang,
      userEmail
    });
    
    let finalHtml = html;
    let finalText = text;

    if (!finalHtml && !finalText && !template) {
      throw new Error(i18n.t('Either html or text content or a template must be provided'));
    }

    // Using MJML template
    if (template) {
      await this.registerPartials();

      // Load content template
      const contentFile = await fs.readFile(
        path.join(this.templatePath, 'body', `${template}.mjml`), 'utf-8'
      );

      variables.seatNumbers = variables.seatNumbers && variables.seatNumbers.toString().replace(',', ',\n');
      variables.appName = config.app.name;
      variables.logoUrl = `${config.app.baseUrlProduction}/images/logo.png`; // in emails, use production url even when developing
    
      const contentCompiled = Handlebars.compile(contentFile)({
        ...variables,
        t: i18n.getFixedT(finalLang)
      });

      // Load layout
      const layoutFile = await fs.readFile(
        path.join(this.templatePath, 'layout.mjml'), 'utf-8'
      );

      let unsubscribeUrl: string | null = null;
      let preferencesUrl: string | null = null;
      const user = await database.getUserByEmail(userEmail);
      if (!user) { // we send to a recipient who is not a registered user, do not offer to unsubscribe...
        console.log(`First recipient email (${userEmail}) does not belong to a registered user, not using unsubscribe token...`); // to be tested ...
      } else {
        // TODO: why do we do: createToken for specific 'communication.marketingEmails', and not just createToken for 'consent' ?
        if (isMarketing) {
          const token = await database.createToken(user.id, 'communication.marketingEmails');
          unsubscribeUrl = `${config.app.baseUrlFrontend}/unsubscribe/${token}`;
        }
        const token = await database.createToken(user.id, 'consent');
        preferencesUrl = `${config.app.baseUrlFrontend}/consent/${token}`;
      }
      
      const fullMjml = Handlebars.compile(layoutFile)({
        ...variables,
        body: contentCompiled,
        copyrightYear: new Date().getFullYear(),
        unsubscribeUrl,
        preferencesUrl,
        isMarketing,
        t: i18n.getFixedT(finalLang)
      });

      const { html: compiledHtml, errors } = mjml2html(fullMjml, {
        validationLevel: "soft", // This prevents runtime crashes from minor MJML issues
      });

      if (errors?.length) {
        console.error(errors);
        throw new Error('MJML compilation failed');
      }

      finalHtml = compiledHtml;

      // Basic text fallback (optional improvement)
      finalText = finalText || i18n.t('Please view this email in HTML format');
    }

    // Only use defined fields
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

function registerHandlebarsHelpers() {
  if (handlebarsHelpersRegistered) return;

  Handlebars.registerHelper('t', function (key, options) {
    const t = options.data.root.t;
    return t(key, options.hash);
  });

  handlebarsHelpersRegistered = true;
}

export default new EmailService();

import { Resend } from 'resend';
import type { CreateEmailOptions } from 'resend';
import i18next from 'i18next';
import mjml2html from 'mjml';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { database } from '../db/database';
//import { generateConsentToken } from '../utils/email';
import config from '../config';

const resend = new Resend(process.env.RESEND_API_KEY!);
let handlebarsHelpersRegistered = false;

type SendEmailOptions = { // TODO: put to ../shared/types/email.ts ...
  to: string | string[];
  subject: string;
  template?: string;
  variables?: Record<string, unknown>;
  text?: string;
  html?: string;
  isMarketing?: boolean;
};

class EmailService {
  private templatePath = path.join(process.cwd(), 'src/templates/emails');
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

  async send(options: SendEmailOptions & { lang?: string }) {
    const {
      to,
      subject,
      template,
      variables = {},
      lang = null,
      text = 'Please view this email in HTML format.',
      html,
      isMarketing = false,
    } = options;

    if (!config.email.from) {
      throw new Error('Email FROM is not defined in environment');
    }
    
    const recipients = Array.isArray(to) ? to : [to];

    const userEmail = recipients[0]; // We decide the first recipient email identifyes the user
    
    let finalLang = lang;
    if (!finalLang) {
      /*const user = await database.getUserByEmail(userEmail);*/
      finalLang = /*user?.language ||*/ 'it'; // TODO: add preferred language to user, and TODO: default language (it) in config
    }
    let finalHtml = html;
    let finalText = text;

    if (!finalHtml && !finalText && !template) {
      throw new Error('Either html or text content or a template must be provided');
    }

    // Using MJML template
    if (template) {
      await this.registerPartials();

      // Load content template
      const contentFile = await fs.readFile(
        path.join(this.templatePath, 'templates', `${template}.mjml`), 'utf-8'
      );

      variables.logoUrl = `https://ticketuno.fly.dev/images/logo.png`; // TODO: use config, but always prod url even when developing

      const contentCompiled = Handlebars.compile(contentFile)({
        ...variables,
        t: i18next.getFixedT(finalLang)
      });

      // Load layout
      const layoutFile = await fs.readFile(
        path.join(this.templatePath, 'layout.mjml'), 'utf-8'
      );

      let unsubscribeUrl: string | null = null;
      let preferencesUrl: string | null = null;
      const user = await database.getUserByEmail(userEmail);
      if (!user) { // we send to a recipient who is not a registered user, do not offer to unsubscribe...
        console.log(`First recipient email (${userEmail}) does not belong to a registered user, not using unsubscribe token...`); // TODO: to be tested ...
      } else {
        if (isMarketing) {
          const token = await database.createToken(user.id, 'communication.marketingEmails');
          //const unsubscribeToken = await generateConsentsToken(user.id, "marketing-unsubscribe");
          unsubscribeUrl = `${config.app.baseUrl}/unsubscribe/${token}/communication.marketingEmails`;
        }
        const token = await database.createToken(user.id, 'consent');
        preferencesUrl = `${config.app.baseUrl}/consent/${token}`;
      }
      
      const fullMjml = Handlebars.compile(layoutFile)({
        ...variables,
        body: contentCompiled,
        copyrightYear: new Date().getFullYear(),
        unsubscribeUrl,
        preferencesUrl,
        isMarketing,
        t: i18next.getFixedT(finalLang)
      });

      const { html: compiledHtml, errors } = mjml2html(fullMjml);

      if (errors?.length) {
        console.error(errors);
        throw new Error('MJML compilation failed');
      }

      finalHtml = compiledHtml;

      // Basic text fallback (optional improvement)
      finalText = finalText || 'Please view this email in HTML format.'; // TODO: t()
    }

    // Only use defined fields
    const payload: CreateEmailOptions = finalHtml ?
      {
        from: config.email.from,
        to: recipients,
        subject,
        html: finalHtml,
        ...(finalText ? { text: finalText } : {}),
      }
    : {
        from: config.email.from,
        to: recipients,
        subject,
        text: finalText!,
      }
    ;
    
    // Call the real email send service
    try {
      const response = await resend.emails.send(payload);
      if (response.error) {
        throw new Error(response.error.message);
      }
      console.log('Email sent:', response.data?.id);
      return response.data;
    } catch (err: unknown) {
      console.error('Email send failed:', err);
      throw err;
    }
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

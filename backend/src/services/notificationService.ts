import { getErrorMessage } from '@ticketuno/shared';
//import { sharedConfig as config } from '@ticketuno/shared';
import config from '../config';

export const audit = async (message: string) => {
  notifySlack(message);
};

export const notify = async (message: string) => {
  notifySlack(message);
};

export const notifySlack = async (message: string) => {
  try {
    await fetch(
      `${config.slack.webhookUrl}/${process.env.SLACK_WEBHOOK_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (error) {
    console.error('Slack notification failed:', getErrorMessage(error));
  }
};

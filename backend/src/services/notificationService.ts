import { getErrorMessage } from '../utils/errorHandler';
import config from '../config';

export const notifySlack = async (message: string) => {
  try {
    //curl - X POST - H 'Content-type: application/json' --data '{"text":"Hello, World!"}' REDACTED

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

/**
 * Usage in your fire-and-forget block:
  } catch (err) {
    console.error('Email failed:', err);
    await notifySlack(`🚨 Booking email failed for refs: ${bookingRefs.join(', ')}\nError: ${getErrorMessage(err)}`);
  }
 */

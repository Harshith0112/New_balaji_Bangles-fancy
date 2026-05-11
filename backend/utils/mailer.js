import { Resend } from 'resend';

let cachedClient = null;
let warnedNoKey = false;

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedClient) cachedClient = new Resend(key);
  return cachedClient;
}

function buildFrom() {
  const fromAddr = (process.env.MAIL_FROM || 'onboarding@resend.dev').trim();
  const fromName = (process.env.MAIL_FROM_NAME || '').trim();
  return fromName ? `${fromName} <${fromAddr}>` : fromAddr;
}

/**
 * Send a transactional email via Resend.
 *
 * Never throws — callers can `await sendEmail(...)` without a try/catch and
 * a missing API key just no-ops with a warning. This keeps user-facing actions
 * (register, place order, status update) from failing because of mail issues.
 *
 * If MAIL_TEST_TO is set, the recipient is overridden to that address (subject
 * is prefixed with [TEST]). This is needed while using `onboarding@resend.dev`
 * because Resend only delivers test mail to the account owner's verified inbox.
 *
 * @param {Object} args
 * @param {string|string[]} args.to
 * @param {string} args.subject
 * @param {string} args.html
 * @param {string} [args.text]
 * @param {string} [args.replyTo]
 * @returns {Promise<{ ok: boolean, id?: string, error?: string, skipped?: boolean }>}
 */
export async function sendEmail({ to, subject, html, text, replyTo } = {}) {
  const recipientList = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipientList.length) {
    return { ok: false, error: 'No recipient', skipped: true };
  }
  if (!subject || !html) {
    return { ok: false, error: 'Missing subject or html', skipped: true };
  }

  const client = getClient();
  if (!client) {
    if (!warnedNoKey) {
      console.warn('[mailer] RESEND_API_KEY is not set — emails will be skipped.');
      warnedNoKey = true;
    }
    return { ok: false, error: 'RESEND_API_KEY missing', skipped: true };
  }

  const testTo = String(process.env.MAIL_TEST_TO || '').trim();
  const finalTo = testTo ? [testTo] : recipientList;
  const finalSubject = testTo ? `[TEST] ${subject}` : subject;

  try {
    const result = await client.emails.send({
      from: buildFrom(),
      to: finalTo,
      subject: finalSubject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo } : {}),
    });
    if (result?.error) {
      console.error('[mailer] Resend returned error:', result.error);
      return { ok: false, error: result.error?.message || 'Resend error' };
    }
    return { ok: true, id: result?.data?.id };
  } catch (err) {
    console.error('[mailer] sendEmail failed:', err?.message || err);
    return { ok: false, error: err?.message || 'Unknown mailer error' };
  }
}

export default sendEmail;

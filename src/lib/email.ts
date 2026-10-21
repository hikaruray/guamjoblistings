// Send one transactional email and say whether it actually went.
//
// Resend never throws on a failed send — a bad key, an unverified domain, a
// refused address, the shared free quota (100 a day across three businesses)
// running out, even a network error all come back as `{ error }`
// (ENGINEERING_LESSONS.md; measured 2026-10-15 with an invalid key). Until
// 2026-10-21 the routes that use this wrapped the send in try/catch and
// counted anything that did not throw as delivered, so every failure looked
// exactly like a success. Same shape as Mokaru's sendMail.
//
// Never throws, so callers can send several at once with Promise.all and one
// failure cannot take another message with it.
//
// When RESEND_API_KEY is unset (local dev) the message is logged instead and
// reported as not delivered, which is the truth.

import "server-only";
import { Resend } from "resend";
import { FROM_EMAIL } from "./config";

export async function sendMail(message: {
  to: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[EMAIL — not configured] to=${message.to}\n${message.subject}\n${message.text}`,
    );
    return false;
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM_EMAIL,
      ...message,
    });
    if (!error) return true;
    // Subject, not address: it names the posting without putting anyone's
    // email in the logs.
    console.error("[EMAIL NOT SENT]", { subject: message.subject, error });
  } catch (err) {
    console.error("[EMAIL NOT SENT]", { subject: message.subject, err });
  }
  return false;
}

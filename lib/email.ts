// Minimal wrapper around the Resend transactional email API. Each tenant
// supplies their OWN Resend API key in Settings > Email Sending - this file
// never contains any real credentials and never fabricates a successful
// send. If the provider call fails, the real error message is returned so
// it can be stored on SentMessage.providerError (see app/api/messages/route.ts).

type SendEmailArgs = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
};

type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function sendEmailViaResend({
  apiKey,
  from,
  to,
  subject,
  html,
}: SendEmailArgs): Promise<SendEmailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        (data && (data.message || data.error)) ||
        `Resend API returned HTTP ${res.status}`;
      return { success: false, error: String(message) };
    }

    return { success: true, id: data.id || "" };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error contacting Resend" };
  }
}

// Converts a plain-text message body into simple HTML paragraphs, since
// message templates/composed messages are authored as plain text.
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

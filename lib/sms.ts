type SendSmsArgs = {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
};

export type SendSmsResult =
  | { success: true; id: string }
  | { success: false; error: string };

export function normalizeSmsNumber(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return "+" + raw.slice(1).replace(/\D/g, "");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return digits ? "+" + digits : "";
}

export async function sendSmsViaTwilio({ accountSid, authToken, from, to, body }: SendSmsArgs): Promise<SendSmsResult> {
  try {
    const normalizedFrom = normalizeSmsNumber(from);
    const normalizedTo = normalizeSmsNumber(to);
    if (!accountSid || !authToken || !normalizedFrom || !normalizedTo) {
      return { success: false, error: "Twilio SMS settings or recipient number are incomplete." };
    }
    const params = new URLSearchParams({ From: normalizedFrom, To: normalizedTo, Body: body.slice(0, 1600) });
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: String(data?.message || data?.error || `Twilio API returned HTTP ${res.status}`) };
    }
    return { success: true, id: String(data?.sid || "") };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error contacting Twilio" };
  }
}

async function postSms(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) return { status: "queued" as const, providerId: null };

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!response.ok) throw new Error(`Twilio API returned ${response.status}`);
  const data = await response.json() as { sid?: string };
  return { status: "sent" as const, providerId: data.sid ?? null };
}

export async function sendSms(to: string, message: string) {
  return postSms(to.replace(/[^+\d]/g, ""), message);
}

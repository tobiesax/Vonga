import { createHash } from "node:crypto";

export async function addNewsletterSubscriber(email: string) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !audienceId) return;
  const datacenter = apiKey.split("-").pop();
  const hash = createHash("md5").update(email.toLowerCase()).digest("hex");
  const response = await fetch(`https://${datacenter}.api.mailchimp.com/3.0/lists/${audienceId}/members/${hash}`, {
    method: "PUT",
    headers: { Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: email, status_if_new: "subscribed" }),
  });
  if (!response.ok) throw new Error(`Mailchimp API returned ${response.status}: ${await response.text()}`);
}

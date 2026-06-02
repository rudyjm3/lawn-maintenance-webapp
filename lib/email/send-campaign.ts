import { resend } from "@/lib/email/client"
const FROM = process.env.RESEND_FROM_EMAIL ?? "news@greenroute.app"

export interface CampaignEmailPayload {
  clientName: string
  clientEmail: string
  subject: string
  body: string
  businessName: string
  unsubscribeUrl: string
}

export async function sendCampaignEmail(payload: CampaignEmailPayload): Promise<{ success: boolean; message: string }> {
  const { clientName, clientEmail, subject, body, businessName, unsubscribeUrl } = payload

  // Convert plain newlines to HTML paragraphs
  const htmlBody = body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${businessName}</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:14px;">Hi ${clientName},</p>
      ${htmlBody}
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
        You're receiving this because you're a valued client of ${businessName}.
        <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({ from: FROM, to: clientEmail, subject, html })
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Campaign email sent to ${clientEmail}.` }
}

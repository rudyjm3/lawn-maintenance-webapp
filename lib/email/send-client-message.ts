import { resend } from "@/lib/email/client"

const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@greenroute.app"

export interface SendClientMessageResult {
  success: boolean
  message: string
}

export async function sendClientMessage({
  toEmail,
  toName,
  subject,
  body,
}: {
  toEmail: string
  toName: string
  subject: string
  body: string
}): Promise<SendClientMessageResult> {
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">GreenRoute</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${toName},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${escapedBody}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">— GreenRoute Team</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject,
    html,
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: `Email sent to ${toEmail}.` }
}

import { resend } from "@/lib/email/client"
const FROM = process.env.RESEND_FROM_EMAIL ?? "reviews@greenroute.app"

export interface ReviewRequestPayload {
  clientName: string
  clientEmail: string
  serviceName: string
  address: string
  serviceDate: string
  businessName: string
  reviewUrl: string
}

export async function sendReviewRequestEmail(payload: ReviewRequestPayload): Promise<{ success: boolean; message: string }> {
  const { clientName, clientEmail, serviceName, address, serviceDate, businessName, reviewUrl } = payload

  const formattedDate = new Date(serviceDate + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">GreenRoute</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">How did we do?</h2>
      <p style="margin:0 0 24px;color:#374151;font-size:14px;">Hi ${clientName}, we recently completed <strong>${serviceName}</strong> at ${address} on ${formattedDate}. We'd love to hear your feedback!</p>

      <table style="width:100%;margin-bottom:24px;">
        <tr><td style="padding:0 0 6px;color:#6b7280;font-size:14px;">Service</td><td style="padding:0 0 6px;text-align:right;color:#374151;font-size:14px;font-weight:500;">${serviceName}</td></tr>
        <tr><td style="color:#6b7280;font-size:14px;">Date</td><td style="text-align:right;color:#374151;font-size:14px;">${formattedDate}</td></tr>
      </table>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${reviewUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Leave a Review</a>
      </div>

      <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">It only takes 30 seconds. Thank you for choosing ${businessName}.</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `How was your ${serviceName}? — Quick review for ${businessName}`,
    html,
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: `Review request sent to ${clientEmail}.` }
}

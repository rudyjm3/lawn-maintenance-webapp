import { resend } from "@/lib/email/client"

const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@greenroute.app"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://greenroute.app"

export interface RescheduleNotificationPayload {
  clientName: string
  clientEmail: string
  serviceName: string
  address: string
  originalDate: string   // YYYY-MM-DD
  proposedDate: string   // YYYY-MM-DD
  token: string          // reschedule_request.token
  businessName: string
  businessPhone: string | null
}

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })
}

export async function sendRescheduleNotification(
  payload: RescheduleNotificationPayload,
): Promise<{ success: boolean; message: string }> {
  const { clientName, clientEmail, serviceName, address, originalDate, proposedDate, token, businessName, businessPhone } = payload

  const portalUrl = `${BASE_URL}/reschedule/${token}`
  const phoneBlock = businessPhone
    ? `<a href="tel:${businessPhone}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#374151;text-decoration:none;font-size:14px;font-weight:500;">📞 Call us: ${businessPhone}</a>`
    : ""

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${businessName}</h1>
    </div>
    <div style="padding:32px;">
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#92400e;">🌧️ Service rescheduled due to weather</p>
      </div>

      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Hi ${clientName},</h2>
      <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
        Due to forecasted weather conditions we've rescheduled your upcoming service. Here are the updated details:
      </p>

      <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 12px;font-size:13px;color:#6b7280;font-weight:600;border-radius:6px 0 0 0;">Service</td>
          <td style="padding:10px 12px;font-size:14px;color:#111827;border-radius:0 6px 0 0;">${serviceName}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-size:13px;color:#6b7280;">Address</td>
          <td style="padding:10px 12px;font-size:14px;color:#374151;">${address}</td>
        </tr>
        <tr style="background:#fef2f2;">
          <td style="padding:10px 12px;font-size:13px;color:#6b7280;">Original date</td>
          <td style="padding:10px 12px;font-size:14px;color:#991b1b;text-decoration:line-through;">${fmt(originalDate)}</td>
        </tr>
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 12px;font-size:13px;color:#6b7280;font-weight:600;">New date</td>
          <td style="padding:10px 12px;font-size:14px;color:#15803d;font-weight:600;">${fmt(proposedDate)}</td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:14px;color:#374151;">Does the new date work for you?</p>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px;">
        <a href="${portalUrl}?action=confirm"
           style="display:block;text-align:center;padding:12px 20px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
          ✅ Yes, the new date works
        </a>
        <a href="${portalUrl}"
           style="display:block;text-align:center;padding:12px 20px;background:#fff;border:1px solid #d1d5db;color:#374151;border-radius:8px;text-decoration:none;font-size:15px;font-weight:500;">
          📅 Request a different date
        </a>
        ${phoneBlock}
      </div>

      <p style="margin:0;font-size:13px;color:#9ca3af;">
        If you have any questions, please don't hesitate to reach out. We apologize for any inconvenience and appreciate your understanding.
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Your service on ${fmt(originalDate)} has been rescheduled — ${businessName}`,
    html,
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: `Reschedule notification sent to ${clientEmail}.` }
}

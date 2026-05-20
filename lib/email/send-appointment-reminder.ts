import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? "reminders@greenroute.app"

export interface AppointmentReminderPayload {
  clientName: string
  clientEmail: string
  serviceName: string
  address: string
  serviceDate: string  // "YYYY-MM-DD"
  businessName: string
  estimatedDurationMin?: number | null
}

export interface SendAppointmentReminderResult {
  success: boolean
  message: string
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export async function sendAppointmentReminderEmail(
  payload: AppointmentReminderPayload,
): Promise<SendAppointmentReminderResult> {
  const { clientName, clientEmail, serviceName, address, serviceDate, businessName, estimatedDurationMin } = payload

  const formattedDate = new Date(serviceDate + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  const durationRow = estimatedDurationMin
    ? `<tr><td style="padding:6px 0 0;color:#6b7280;font-size:14px;">Est. duration</td><td style="padding:6px 0 0;text-align:right;color:#374151;font-size:14px;">${formatDuration(estimatedDurationMin)}</td></tr>`
    : ""

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">GreenRoute</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Your appointment is tomorrow</h2>
      <p style="margin:0 0 24px;color:#374151;font-size:14px;">Hi ${clientName}, just a reminder that your scheduled service is coming up tomorrow.</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#15803d;">${serviceName}</p>
        <table style="width:100%;">
          <tr><td style="padding:0 0 6px;color:#6b7280;font-size:14px;">Address</td><td style="padding:0 0 6px;text-align:right;color:#374151;font-size:14px;">${address}</td></tr>
          <tr><td style="color:#6b7280;font-size:14px;">Date</td><td style="text-align:right;color:#374151;font-size:14px;">${formattedDate}</td></tr>
          ${durationRow}
        </table>
      </div>

      <p style="margin:0;font-size:13px;color:#6b7280;">If you have any questions or need to make changes, please contact us. Thank you for choosing ${businessName}.</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Reminder: ${serviceName} appointment tomorrow`,
    html,
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: `Appointment reminder sent to ${clientEmail}.` }
}

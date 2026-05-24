import { resend } from "@/lib/email/client"
import { type Estimate } from "@/types"
const FROM = process.env.RESEND_FROM_EMAIL ?? "estimates@greenroute.app"

export interface SendEstimateResult {
  success: boolean
  message: string
}

export async function sendEstimateEmail(estimate: Estimate): Promise<SendEstimateResult> {
  if (!estimate.client?.email) {
    return { success: false, message: "Client has no email address on file." }
  }

  const items = estimate.items ?? []
  const itemRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${Number(item.qty).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">$${Number(item.total_price).toFixed(2)}</td>
        </tr>`,
    )
    .join("")

  const validUntilText = estimate.valid_until
    ? `<p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Valid until: <strong>${new Date(estimate.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></p>`
    : ""

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
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Estimate ${estimate.estimate_number}</h2>
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Hi ${estimate.client.name},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:14px;">Please find your estimate below. If you have any questions, don't hesitate to reach out.</p>
      ${validUntilText}

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Description</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Qty</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Unit Price</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
        <table style="font-size:14px;min-width:240px;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Subtotal</td>
            <td style="padding:4px 0;text-align:right;color:#374151;">$${Number(estimate.subtotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Tax</td>
            <td style="padding:4px 0;text-align:right;color:#374151;">$${Number(estimate.tax).toFixed(2)}</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:8px 0 4px;font-weight:700;color:#111827;">Total</td>
            <td style="padding:8px 0 4px;text-align:right;font-weight:700;color:#111827;font-size:16px;">$${Number(estimate.total).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${estimate.notes ? `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;"><p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Notes</p><p style="margin:0;font-size:14px;color:#374151;">${estimate.notes}</p></div>` : ""}

      <p style="margin:0;font-size:13px;color:#6b7280;">Thank you for your business.</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: estimate.client.email,
    subject: `Estimate ${estimate.estimate_number} from GreenRoute`,
    html,
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: `Estimate sent to ${estimate.client.email}.` }
}

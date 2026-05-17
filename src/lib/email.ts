/**
 * Optional transactional email via Resend (no extra npm dep).
 * Set RESEND_API_KEY and EMAIL_FROM in .env.local to enable.
 */

export async function sendApprovalEmail(params: {
  to: string;
  employeeName: string;
  managerName: string;
  status: "approved" | "returned" | "rejected";
  appUrl?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "AtomQuest PMS <onboarding@resend.dev>";

  if (!apiKey) return;

  const subject =
    params.status === "approved"
      ? `Your goals were approved — ${params.employeeName}`
      : params.status === "returned"
        ? `Goals returned for rework — ${params.employeeName}`
        : `Goal sheet update — ${params.employeeName}`;

  const body =
    params.status === "approved"
      ? `Hi ${params.employeeName}, your manager ${params.managerName} has approved your goal sheet for this cycle.`
      : params.status === "returned"
        ? `Hi ${params.employeeName}, ${params.managerName} returned your goal sheet with feedback. Please review and resubmit in AtomQuest PMS.`
        : `Hi ${params.employeeName}, your goal sheet was rejected. Contact ${params.managerName} or HR for next steps.`;

  const wrap = "div";
  const html = `<${wrap} style="font-family: system-ui, sans-serif; max-width: 560px;">
      <h2 style="color: #1e40af;">AtomQuest PMS</h2>
      <p>${body}</p>
      ${params.appUrl ? `<p><a href="${params.appUrl}/goals">Open My Goals</a></p>` : ""}
    </${wrap}>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.warn("[email] Resend failed:", await res.text());
    }
  } catch (err) {
    console.warn("[email] send failed:", err);
  }
}

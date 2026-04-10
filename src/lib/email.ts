const RESEND_API_KEY = process.env.RESEND_API_KEY;

/**
 * Send an invite email to a care team member using Resend.
 * Gracefully degrades: if RESEND_API_KEY is not set, skips silently.
 */
export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  childName: string;
  role: string;
  inviteUrl: string;
}) {
  if (!RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not configured — skipping invite email");
    return;
  }

  // Resend free tier requires onboarding@resend.dev unless custom domain is verified
  const fromAddress = "The Companion <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: params.to,
        subject: `You've been invited to ${params.childName}'s care team`,
        html: buildInviteEmailHtml(params),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[email] Resend API error:", res.status, error);
    } else {
      console.log("[email] Invite email sent to", params.to);
    }
  } catch (err) {
    console.error("[email] Failed to send invite email:", err);
  }
}

function buildInviteEmailHtml(params: {
  inviterName: string;
  childName: string;
  role: string;
  inviteUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f6; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf9f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e8e5e0; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e8e5e0;">
              <div style="font-size: 28px; margin-bottom: 8px;">&#x1F9ED;</div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">The Companion</h1>
              <p style="margin: 4px 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #c96442;">Care Team Invitation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #1a1a1a;">
                <strong>${params.inviterName}</strong> has invited you to join <strong>${params.childName}</strong>&rsquo;s care team as a <strong>${params.role}</strong>.
              </p>
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #6b6560;">
                As a care team member, you&rsquo;ll be able to upload documents, view the child&rsquo;s profile, and communicate with the family through The Companion&rsquo;s secure portal.
              </p>
              <!-- Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${params.inviteUrl}" style="display: inline-block; background-color: #c96442; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 10px;">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.5; color: #9a9590; text-align: center;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f5f3ef; text-align: center; border-top: 1px solid #e8e5e0;">
              <p style="margin: 0; font-size: 11px; color: #9a9590;">
                The Companion &mdash; Navigating Ontario&rsquo;s autism services together
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

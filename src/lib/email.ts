const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = "The Companion <noreply@luisaliboni.com>";

/**
 * Low-level email sender via Resend API.
 * Handles API key check, fetch, and error logging.
 */
async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[email] Resend API error:", res.status, error);
    }
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}

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
  await sendEmail({
    to: params.to,
    subject: `You've been invited to ${params.childName}'s care team`,
    html: buildInviteEmailHtml(params),
  });
}

/**
 * Send a welcome email to a newly registered provider.
 */
/**
 * Send a notification when a message is received.
 * Fire-and-forget — never blocks the message send.
 */
export async function sendMessageNotificationEmail(params: {
  to: string;
  senderName: string;
  childName: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `New message from ${params.senderName} — The Companion`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #faf9f6;">
        <h2 style="color: #c96442; margin: 0 0 16px;">🧭 The Companion</h2>
        <p style="color: #333;">Hi,</p>
        <p style="color: #333;"><strong>${params.senderName}</strong> sent you a message about <strong>${params.childName}</strong>.</p>
        <p style="color: #333;">Open The Companion to read and reply.</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">This is an automated notification.</p>
      </div>
    `,
  });
}

export async function sendProviderWelcomeEmail(params: {
  to: string;
  organizationName: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Welcome to The Companion — ${params.organizationName}`,
    html: buildWelcomeEmailHtml(params),
  });
}

function buildWelcomeEmailHtml(params: {
  organizationName: string;
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
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e8e5e0;">
              <div style="font-size: 28px; margin-bottom: 8px;">&#x1F9ED;</div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">The Companion</h1>
              <p style="margin: 4px 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #c96442;">Provider Registration</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #1a1a1a;">
                Welcome, <strong>${params.organizationName}</strong>!
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #6b6560;">
                Your provider profile has been created on The Companion. Families navigating Ontario&rsquo;s autism services can now find you when searching for providers.
              </p>
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #6b6560;">
                <strong>What&rsquo;s next:</strong>
              </p>
              <ul style="margin: 0 0 28px; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #6b6560;">
                <li>Your profile is now visible in our provider directory</li>
                <li>You can log in to your dashboard to update your profile and waitlist</li>
                <li>Once verified, you&rsquo;ll receive a badge and priority placement</li>
              </ul>
              <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #9a9590;">
                Your temporary password is: <strong>Companion2026!</strong>
              </p>
              <p style="margin: 0 0 0; font-size: 12px; line-height: 1.5; color: #9a9590;">
                Please change it after your first login.
              </p>
            </td>
          </tr>
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

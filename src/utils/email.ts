import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendAnnouncementEmail = async (
  recipients: { email: string; name: string }[],
  title: string,
  content: string,
): Promise<void> => {
  if (!recipients.length) return;

 const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px 0; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0; }
      .header { background: #0f2d12; padding: 36px 28px; text-align: center; }
      .logo { font-size: 30px; font-weight: 700; color: #86efac; letter-spacing: 4px; margin-bottom: 6px; }
      .subtitle { color: #6ee7a0; font-size: 12px; letter-spacing: 0.5px; line-height: 1.8; }
      .divider { width: 40px; height: 2px; background: #22c55e; margin: 14px auto 0; border-radius: 1px; }
      .body { padding: 32px 28px; background: #ffffff; }
      .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; margin-bottom: 18px; }
      .announcement-title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; border-left: 3px solid #22c55e; padding-left: 14px; line-height: 1.4; }
      .content { color: #4b5563; line-height: 1.8; font-size: 15px; white-space: pre-wrap; }
      .footer { background: #f9fafb; padding: 18px 28px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; line-height: 1.7; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">NISGS</div>
        <div class="subtitle">National Institution of Surveying &amp; Geoinformatics Students</div>
        <div class="subtitle">Obafemi Awolowo University</div>
        <div class="divider"></div>
      </div>
      <div class="body">
        <div class="badge">&#128226; ANNOUNCEMENT</div>
        <div class="announcement-title">${title}</div>
        <div class="content">${content}</div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} NISGS &nbsp;&middot;&nbsp; Obafemi Awolowo University<br>
        This is an automated message from the NISGS Student Portal.
      </div>
    </div>
  </body>
  </html>
`;

  // Send in batches of 50
  const batchSize = 50;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map((r) =>
        resend.emails.send({
          from:
            process.env.FROM_EMAIL ||
            "NISGS OAU <noreply@cryptoneve.com>",
          to: r.email,
          subject: `${title}`,
          html: emailHtml,
        }),
      ),
    );
  }
};

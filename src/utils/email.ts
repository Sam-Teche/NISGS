import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendAnnouncementEmail = async (
  recipients: { email: string; name: string }[],
  title: string,
  content: string
): Promise<void> => {
  if (!recipients.length) return;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #1a4a1a; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #0d2b0d, #1a5c1a); padding: 32px 24px; text-align: center; }
        .logo { font-size: 28px; font-weight: 900; color: #4ade80; letter-spacing: 3px; }
        .subtitle { color: #86efac; font-size: 12px; margin-top: 4px; letter-spacing: 1px; }
        .body { padding: 32px 24px; }
        .announcement-title { font-size: 22px; font-weight: 700; color: #4ade80; margin-bottom: 16px; border-left: 4px solid #4ade80; padding-left: 12px; }
        .content { color: #ccc; line-height: 1.7; font-size: 15px; white-space: pre-wrap; }
        .footer { background: #0d1a0d; padding: 16px 24px; text-align: center; color: #555; font-size: 12px; border-top: 1px solid #1a3a1a; }
        .badge { display: inline-block; background: #1a4a1a; color: #4ade80; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 1px; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">NISGS</div>
          <div class="subtitle">National Institution of Surveying & Geoinformatics Students</div>
          <div class="subtitle">Obafemi Awolowo University</div>
        </div>
        <div class="body">
          <div class="badge">📢 ANNOUNCEMENT</div>
          <div class="announcement-title">${title}</div>
          <div class="content">${content}</div>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} NISGS • Obafemi Awolowo University<br>
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
      batch.map(r =>
        resend.emails.send({
          from: process.env.FROM_EMAIL || 'NISGS <noreply@nisgs.edu.ng>',
          to: r.email,
          subject: `[NISGS] ${title}`,
          html: emailHtml
        })
      )
    );
  }
};

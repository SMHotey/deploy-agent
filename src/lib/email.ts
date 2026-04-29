import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export function createEmailTransport() {
  // Check for SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Check for SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Fallback to ethereal (for development)
  if (process.env.NODE_ENV === 'development') {
    console.warn('No email configuration found. Using ethereal for development.');
    return null; // Will use ethereal in sendEmail
  }

  console.warn('No email configuration found. Email notifications disabled.');
  return null;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    let transport = createEmailTransport();

    // For development without SMTP config, create test account
    if (!transport && process.env.NODE_ENV === 'development') {
      const testAccount = await nodemailer.createTestAccount();
      transport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    if (!transport) {
      console.warn('Email transport not configured. Skipping email send.');
      return false;
    }

    const from = process.env.EMAIL_FROM || '"Deploy Agent" <noreply@deploy-agent.com>';

    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Email preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendDeploymentNotification(
  userEmail: string,
  deploymentId: string,
  projectName: string,
  status: 'READY' | 'ERROR',
  url?: string
): Promise<boolean> {
  const subject = `Deployment ${status === 'READY' ? 'Successful' : 'Failed'}: ${projectName}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Deployment ${status === 'READY' ? '✅ Successful' : '❌ Failed'}</h2>
      <p><strong>Project:</strong> ${projectName}</p>
      <p><strong>Deployment ID:</strong> ${deploymentId}</p>
      <p><strong>Status:</strong> ${status}</p>
      ${url ? `<p><a href="${url}">View Deployment →</a></p>` : ''}
      <hr style="margin: 20px 0;" />
      <p style="color: #666; font-size: 12px;">
        Deploy Agent - One-click deployment automation
      </p>
    </div>
  `;

  const text = `Deployment ${status} for ${projectName}\nDeployment ID: ${deploymentId}\n${url ? `URL: ${url}` : ''}`;

  return sendEmail({
    to: userEmail,
    subject,
    text,
    html,
  });
}

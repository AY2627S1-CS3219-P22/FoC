/*
Email server for OTP send
Using Nodemailer
*/

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost', //TODO: Fill in with real smtp host
    port: Number(process.env.SMTP_PORT ?? 1025), //TODO: Fill in with real smtp port
    secure: false
})

interface EmailOptions {
    to: string, 
    subject: string, 
    text?: string, 
    html?: string,
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions): Promise<void> => {
    try {
      const info = await transporter.sendMail({
        from: '"Your Name" <your-email@example.com>', //TODO: Fill in with real email
        to,
        subject,
        ...(text ? { text } : {}),
        ...(html ? { html } : {}),
      });
  
      console.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  };
  
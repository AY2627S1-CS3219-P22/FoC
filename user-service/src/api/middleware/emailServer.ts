/*
Email server for OTP send
Using Nodemailer
*/

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: "localhost",
    port: 1025, 
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
        from: '"Your Name" <your-email@example.com>',
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
//Define nodemailer

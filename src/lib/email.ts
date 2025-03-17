import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

async function createTransporter() {
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  // Use the refresh token you just got from OAuth Playground
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

//   Dynamically obtain a short-lived access token
  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.error('getAccessToken error:', err); // Log the real error
        reject('Failed to create access token');
      }
      resolve(token);
    });
  });

  

  // Create a Nodemailer transporter using OAuth2
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,  
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  });
}

export async function sendStudentInvitation({ to, subject, text }: { to: string; subject: string; text: string; }) {
    try {
      const transporter = await createTransporter();
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
      });
      console.log('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
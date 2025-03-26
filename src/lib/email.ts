import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

// Cache the transporter to reuse connections
let cachedTransporter: nodemailer.Transporter | null = null;
let tokenExpiryTime = 0;

/**
 * Creates an OAuth2 client with proper credentials
 */
function createOAuth2Client() {
  return new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
}

/**
 * Gets a fresh access token using refresh token
 */
async function getAccessToken() {
  const oauth2Client = createOAuth2Client();
  
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return new Promise<string>((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.error('getAccessToken error:', err);
        reject(new Error(`Failed to create access token: ${err.message}`));
        return;
      }
      
      if (!token) {
        reject(new Error('No access token returned'));
        return;
      }
      
      // Set token expiry to 55 minutes from now (tokens usually last 60 minutes)
      // This gives us a 5-minute buffer before actual expiration
      tokenExpiryTime = Date.now() + (55 * 60 * 1000);
      resolve(token);
    });
  });
}

/**
 * Creates a configured nodemailer transporter with OAuth2 authentication
 * This implementation includes token freshness checks
 */
async function createTransporter() {
  const now = Date.now();
  
  // If we have a cached transporter and the token is still valid, use it
  if (cachedTransporter && tokenExpiryTime > now) {
    return cachedTransporter;
  }
  
  try {
    // Get fresh access token
    const accessToken = await getAccessToken();
    
    // Create a new transporter with the fresh token
    const transporter = nodemailer.createTransport({
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
    
    // Verify the transporter works
    await transporter.verify();
    
    // Cache the transporter for future use
    cachedTransporter = transporter;
    
    return transporter;
  } catch (error) {
    // Clear cache if there was an error
    cachedTransporter = null;
    tokenExpiryTime = 0;
    throw error;
  }
}

/**
 * Sends an email to a student with invitation details
 * Includes retry logic for resilience
 */
export async function sendStudentInvitation({ 
  to, 
  subject, 
  text 
}: { 
  to: string; 
  subject: string; 
  text: string; 
}) {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get fresh transporter (will reuse if token is valid)
      const transporter = await createTransporter();
      
      // Send mail
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
      });
      
      console.log('Email sent successfully!');
      return true;
    } catch (error: any) {
      console.error(`Email attempt ${attempt + 1} failed:`, error);
      
      // Clear cache on auth errors to force a fresh token on next attempt
      if (error.message && (
          error.message.includes('invalid_grant') || 
          error.message.includes('Invalid Credentials') ||
          error.message.includes('invalid_token')
      )) {
        cachedTransporter = null;
        tokenExpiryTime = 0;
      }
      
      // If this was our last attempt, rethrow the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return false;
}

/**
 * Preemptively refreshes the access token to ensure it's always fresh
 * Call this function periodically from a scheduled task
 */
export async function refreshEmailToken(): Promise<boolean> {
  try {
    cachedTransporter = null;
    tokenExpiryTime = 0;
    await createTransporter();
    return true;
  } catch (error) {
    console.error('Failed to refresh email token:', error);
    return false;
  }
}

/**
 * Tests the email connection by sending a test email
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}
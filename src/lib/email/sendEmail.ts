import { Resend } from 'resend';
import StudentInvitation from '@/src/components/emails/StudentInvitation';
import PasswordResetNotification from '@/src/components/emails/PasswordResetNotification';
import { getBaseUrl } from '@/src/lib/utils/url';

export interface EmailPayload {
  to: string;
  firstName: string;
  lastName: string;
  className: string;
  classCode: string;
  email?: string;
  password?: string;
  isNewStudent: boolean;
  isPasswordReset?: boolean;
}

export async function sendEmail(payload: EmailPayload) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = getBaseUrl();
    
    // Validate required fields
    if (!payload.to || !payload.firstName || !payload.lastName) {
      return { success: false, error: 'Missing required fields' };
    }
    
    // For non-password reset emails, validate class info
    if (!payload.isPasswordReset && (!payload.className || !payload.classCode)) {
      return { success: false, error: 'Missing class information' };
    }

    // Determine the right subject
    const subject = payload.isPasswordReset
      ? `Important: Your ShortStack Password Has Been Changed`
      : payload.isNewStudent
        ? `Welcome to ${payload.className} - Your Login Information`
        : `You've Been Added to ${payload.className}`;

    // Choose the correct email template
    const emailTemplate = payload.isPasswordReset
      ? await PasswordResetNotification({ 
          firstName: payload.firstName,
          lastName: payload.lastName,
          appUrl
        })
      : await StudentInvitation({ 
          firstName: payload.firstName,
          lastName: payload.lastName,
          className: payload.className, 
          classCode: payload.classCode,
          email: payload.email || payload.to,
          password: payload.password,
          isNewStudent: payload.isNewStudent,
          isPasswordReset: payload.isPasswordReset || false,
          appUrl,
        });

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `ShortStacks Education <${process.env.RESEND_FROM_EMAIL || 'access@shortstacksffk.com'}>`,
      to: [payload.to],
      subject: subject,
      react: emailTemplate,
    });

    if (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendEmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending email' 
    };
  }
}
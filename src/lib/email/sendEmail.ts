import { Resend } from 'resend';
import StudentInvitation from '@/src/components/emails/StudentInvitation';
import PasswordResetNotification from '@/src/components/emails/PasswordResetNotification';
import { getBaseUrl } from '@/src/lib/utils/url';

export interface EmailPayload {
  to: string;
  firstName: string;
  lastName: string;
  className?: string;
  classCode?: string;
  email?: string;
  password?: string;
  isNewStudent?: boolean;
  isPasswordReset?: boolean;
}

export async function sendEmail(payload: EmailPayload) {
  if (typeof window !== 'undefined') {
    return { success: false, error: 'sendEmail must be called from server-side' };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: 'Missing RESEND_API_KEY on server' };

  const resend = new Resend(key);

  try {
    const {
      to,
      firstName,
      lastName,
      className = '',
      classCode = '',
      email,
      password,
      isNewStudent = false,
      isPasswordReset = false
    } = payload;

    const appUrl = getBaseUrl();
    const subject = isPasswordReset
      ? `Important: Your ShortStack Password Has Been Changed`
      : isNewStudent
        ? `Welcome to ${className} - Your Login Information`
        : `You've Been Added to ${className}`;

    const reactTemplate = isPasswordReset
      ? await PasswordResetNotification({ firstName, lastName, appUrl })
      : await StudentInvitation({
          firstName,
          lastName,
          className,
          classCode,
          email: email || to,
          password,
          isNewStudent,
          isPasswordReset,
          appUrl
        });

    const res = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ? `ShortStacks Education <${process.env.RESEND_FROM_EMAIL}>` : 'ShortStacks Education <access@shortstacksffk.com>',
      to: [to],
      subject,
      react: reactTemplate
    });

    return { success: true, data: res };
  } catch (err: any) {
    // Prefer structured error info if Resend returns it
    const message = err?.message || String(err);
    console.error('sendEmail error:', err);
    return { success: false, error: message };
  }
}
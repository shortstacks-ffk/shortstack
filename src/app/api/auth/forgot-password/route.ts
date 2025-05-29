import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { Resend } from 'resend';
import ForgotPasswordEmail from '@/src/components/emails/ForgotPasswordEmail';

// Generate a random 7-digit verification code
function generateVerificationCode(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists (teachers only for now)
    const user = await db.user.findUnique({
      where: { email, role: "TEACHER" },
    });

    // For security reasons, don't reveal whether user exists or not
    // Instead, always return success even if user doesn't exist
    // But only send email if user exists
    
    if (user) {
      // Generate verification code
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Code valid for 1 hour

      // Store the verification code in database
      await db.passwordReset.upsert({
        where: { email },
        update: {
          code: verificationCode,
          expiresAt,
          used: false,
        },
        create: {
          email,
          code: verificationCode,
          expiresAt,
        },
      });

      // Send email with verification code
      const resend = new Resend(process.env.RESEND_API_KEY);
      const firstName = user.name?.split(' ')[0] || 'User';
      
      await resend.emails.send({
        from: `ShortStack Education <${process.env.RESEND_FROM_EMAIL || 'noreply@shortstack.edu'}>`,
        to: [email],
        subject: "Your ShortStack Password Reset Code",
        react: await ForgotPasswordEmail({
          firstName,
          verificationCode,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }),
      });
    }

    // Always return success for security reasons
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
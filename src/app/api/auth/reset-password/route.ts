import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import PasswordResetNotification from '@/src/components/emails/PasswordResetNotification';
import { getBaseUrl } from "@/src/lib/utils/url";

// function getBaseUrl() {
//   return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
// }

export async function POST(req: Request) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "Email, token, and new password are required" }, { status: 400 });
    }

    // Validate password
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /[0-9]/;

    if (!uppercaseRegex.test(newPassword) || !lowercaseRegex.test(newPassword) || !numberRegex.test(newPassword)) {
      return NextResponse.json({ 
        error: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      }, { status: 400 });
    }

    // Check if reset record exists and is valid
    const resetRecord = await db.passwordReset.findFirst({
      where: { 
        email,
        resetToken: token,
        used: false,
        resetTokenExpiresAt: { gt: new Date() } // Not expired
      },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await db.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      },
    });

    // Mark the reset record as used
    await db.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    });

    // Send password change notification email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const firstName = user.name?.split(' ')[0] || 'User';
      const lastName = user.name?.split(' ')[1] || '';

      await resend.emails.send({
        from: `ShortStack Education <${process.env.RESEND_FROM_EMAIL || 'noreply@shortstack.edu'}>`,
        to: [email],
        subject: "Important: Your ShortStack Password Has Been Changed",
        react: await PasswordResetNotification({ 
          firstName,
          lastName,
          appUrl: getBaseUrl()
        }),
      });
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send password change notification:', emailError);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
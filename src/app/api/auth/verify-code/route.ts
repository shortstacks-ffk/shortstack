import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { randomBytes } from 'crypto';

// Generate a random reset token
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 });
    }

    // Check if reset record exists and is valid
    const resetRecord = await db.passwordReset.findFirst({
      where: { 
        email,
        code,
        used: false,
        expiresAt: { gt: new Date() } // Not expired
      },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    // Generate a reset token that will be used for the actual password reset
    const resetToken = generateResetToken();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setMinutes(tokenExpiresAt.getMinutes() + 10); // Token valid for 10 minutes

    // Update the record with the reset token
    await db.passwordReset.update({
      where: { id: resetRecord.id },
      data: {
        resetToken,
        resetTokenExpiresAt: tokenExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      resetToken,
    });
    
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });
  }
}
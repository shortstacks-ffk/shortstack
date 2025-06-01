import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import StudentInvitation from '@/src/components/emails/StudentInvitation';
import PasswordResetNotification from '@/src/components/emails/PasswordResetNotification';

// Define the email payload interface
export interface EmailPayload {
  to: string;
  firstName: string;
  lastName: string;
  className: string;
  classCode: string;
  email?: string; // Optional as it might be the same as 'to'
  password?: string; // Optional for existing students
  isNewStudent: boolean;
  isPasswordReset?: boolean; // Add this field
}

// Main email sending endpoint - POST /api/email
export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  let payload: EmailPayload;
  
  try {
    // Try to parse the request body with better error handling
    try {
      payload = await request.json();
    } catch (parseError: any) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({ 
        success: false, 
        error: `Invalid JSON payload: ${parseError.message}`,
        tip: "Ensure your Content-Type header is set to application/json and the JSON is valid"
      }, { status: 400 });
    }
    
    // Check if payload is empty
    if (!payload || Object.keys(payload).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Empty request body'
      }, { status: 400 });
    }
    
    const { 
      to, 
      firstName, 
      lastName, 
      className, 
      classCode, 
      email,
      password,
      isNewStudent,
      isPasswordReset = false // Extract with default value
    } = payload;
    
    // Validate required fields
    if (!to || !firstName || !lastName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: to, firstName, lastName' 
      }, { status: 400 });
    }
    
    // For non-password reset emails, validate class info
    if (!isPasswordReset && (!className || !classCode)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields for class invitation: className, classCode' 
      }, { status: 400 });
    }
    
    // New students should have passwords unless it's a password reset
    if (isNewStudent && !password && !isPasswordReset) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password is required for new students' 
      }, { status: 400 });
    }

    // Determine the right subject based on all email types
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const subject = isPasswordReset
      ? `Important: Your ShortStack Password Has Been Changed`
      : isNewStudent
        ? `Welcome to ${className} - Your Login Information`
        : `You've Been Added to ${className}`;

    // Choose the correct email template
    const emailTemplate = isPasswordReset
      ? await PasswordResetNotification({ 
          firstName,
          lastName,
          appUrl
        })
      : await StudentInvitation({ 
          firstName,
          lastName,
          className, 
          classCode,
          email: email || to,
          password,
          isNewStudent,
          isPasswordReset,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        });

    // Send the email using the appropriate template
    const { data, error } = await resend.emails.send({
      from: `ShortStacks Education <${process.env.RESEND_FROM_EMAIL || 'access@shortstacksffk.com'}>`,
      to: [to],
      subject: subject,
      react: emailTemplate,
    });

    if (error) {
      console.error('Failed to send email with Resend:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
}


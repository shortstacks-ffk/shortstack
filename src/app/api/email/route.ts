import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import StudentInvitation from '@/src/components/emails/StudentInvitation';

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
    if (!to || !firstName || !lastName || !className || !classCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // New students should have passwords
    if (isNewStudent && !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password is required for new students' 
      }, { status: 400 });
    }

    // Determine the right subject based on all email types
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const subject = isPasswordReset
      ? `Important: Your ShortStack Password Has Been Updated`
      : isNewStudent
        ? `Welcome to ${className} - Your Login Information`
        : `You've Been Added to ${className}`;

    // Send the email using React template
    const { data, error } = await resend.emails.send({
      from: `ShortStack Education <${process.env.RESEND_FROM_EMAIL || 'noreply@shortstack.edu'}>`,
      to: [to],
      subject: subject,
      react: StudentInvitation({ 
        firstName,
        lastName,
        className, 
        classCode,
        email: email || to,
        password,
        isNewStudent,
        isPasswordReset, // Make sure to pass this
        appUrl
      }),
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
    console.error('Error sending invitation email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
}


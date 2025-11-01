import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, EmailPayload as SendEmailPayload } from '@/src/lib/email/sendEmail';

// Main email sending endpoint - POST /api/email
export async function POST(request: NextRequest) {
  let payload: SendEmailPayload;

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
      password,
      isNewStudent,
      isPasswordReset = false // Extract with default value
    } = payload as any;
    
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

    // Use server-side helper (calls Resend directly on the server)
    const result = await sendEmail(payload);

    if (!result.success) {
      console.error('Failed to send email via helper:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to send email' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: result.data 
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
}


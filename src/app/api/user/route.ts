import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated with Clerk
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get current user details from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    // Return normalized user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
        email: user.emailAddresses[0]?.emailAddress || '',
        imageUrl: user.imageUrl,
      }
    });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get user data' 
    }, { status: 500 });
  }
}
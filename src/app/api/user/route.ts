import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated with NextAuth
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get additional profile information based on role
    let profileData = null;
    
    if (session.user.role === 'TEACHER') {
      profileData = await db.teacher.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          institution: true,
          bio: true,
          profileImage: true
        }
      });
    } else if (session.user.role === 'STUDENT') {
      profileData = await db.student.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            ...(session.user.email ? [{ schoolEmail: session.user.email }] : [])
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolEmail: true,
          profileImage: true,
          teacherId: true
        }
      });
    }
    
    // Return normalized user data from session with profile data
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id || '',
        name: (session.user.firstName && session.user.lastName) ? 
              `${session.user.firstName} ${session.user.lastName}`.trim() : 
              (profileData ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() : '') || 
              'User',
        email: session.user.email || '',
        imageUrl: profileData?.profileImage || '',
        role: session.user.role,
        profile: profileData
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

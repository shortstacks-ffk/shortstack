import { NextResponse } from 'next/server';
import { refreshEmailToken } from '@/src/lib/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const success = await refreshEmailToken();
    
    if (success) {
      return NextResponse.json({ status: 'ok', message: 'Email token refreshed successfully' });
    } else {
      return NextResponse.json({ status: 'error', message: 'Failed to refresh token' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Email health check failed:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Unknown error' }, 
      { status: 500 }
    );
  }
}
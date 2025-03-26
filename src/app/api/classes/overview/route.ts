import { NextResponse } from 'next/server';
import { db } from "@/src/lib/db";

export async function POST(request: Request) {
  try {
    const { code, overview } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Class code is required' },
        { status: 400 }
      );
    }

    console.log(`Attempting to update class with code: ${code}`);

    // Check if the class exists first
    const existingClass = await db.class.findUnique({
      where: { code }
    });

    if (!existingClass) {
      return NextResponse.json(
        { error: `Class with code ${code} not found` },
        { status: 404 }
      );
    }

    // Now update the class with the correct field
    const updatedClass = await db.class.update({
      where: { code },
      data: { 
        overview: overview,
        updatedAt: new Date() // Make sure this updates
      },
      select: {
        id: true,
        name: true,
        code: true,
        overview: true
      }
    });

    return NextResponse.json(updatedClass);
    
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update class overview', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth/config';
import { db } from '@/src/lib/db';
import { list, del } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'SUPER') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // List all blobs in storage
    const { blobs } = await list();
    
    // Get all file URLs from the database
    const databaseFiles = await db.file.findMany({ select: { url: true } });
    const databaseAssignments = await db.assignment.findMany({ 
      where: { url: { not: '' } },
      select: { url: true } 
    });
    const databaseSubmissions = await db.studentAssignmentSubmission.findMany({ 
      where: { fileUrl: { not: '' } },
      select: { fileUrl: true } 
    });
    
    // Combine all known URLs
    const knownUrls = new Set([
      ...databaseFiles.map(f => new URL(f.url).pathname.substring(1)),
      ...databaseAssignments
        .filter(a => a.url !== null)
        .map(a => new URL(a.url!).pathname.substring(1)),
      ...databaseSubmissions
        .filter(s => s.fileUrl !== null)
        .map(s => new URL(s.fileUrl!).pathname.substring(1))
    ]);
    
    // Find orphaned blobs
    const orphanedBlobs = blobs.filter(blob => !knownUrls.has(blob.pathname));
    
    // Delete orphaned blobs
    const deletionResults = [];
    for (const blob of orphanedBlobs) {
      try {
        await del(blob.pathname);
        deletionResults.push({
          pathname: blob.pathname,
          deleted: true
        });
      } catch (error) {
        deletionResults.push({
          pathname: blob.pathname,
          deleted: false,
          error: (error as Error).message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      totalOrphaned: orphanedBlobs.length,
      deletionResults
    });
  } catch (error) {
    console.error("Error cleaning up orphaned blobs:", error);
    return NextResponse.json(
      { error: "Failed to clean up orphaned blobs" },
      { status: 500 }
    );
  }
}
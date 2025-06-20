import { del } from '@vercel/blob';

/**
 * Deletes a file from Vercel Blob storage using its URL
 * @param fileUrl The complete URL of the file to delete
 * @returns Boolean indicating success or failure
 */
export async function deleteFromBlobStorage(fileUrl: string): Promise<boolean> {
  if (!fileUrl) return false;
  
  try {
    console.log(`Attempting to delete blob: ${fileUrl}`);
    
    // Extract the blob path from the URL
    const urlObj = new URL(fileUrl);
    const pathname = urlObj.pathname;
    // The pathname typically starts with a leading slash that we need to remove
    const blobPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    
    if (!blobPath) {
      console.error("Invalid blob path extracted from URL:", fileUrl);
      return false;
    }
    
    console.log(`Deleting blob at path: ${blobPath}`);
    await del(blobPath);
    console.log("Blob deleted successfully");
    return true;
  } catch (error) {
    console.error('Failed to delete from blob storage:', error);
    return false;
  }
}
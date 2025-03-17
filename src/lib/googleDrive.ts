import { google } from 'googleapis';
import { Readable } from 'stream';

// Convert Buffer to Readable Stream
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signal the end of the stream
  return stream;
}

// Keep a cache of folder IDs to avoid repeated lookups
const folderCache: Record<string, string> = {};

// Configure Google Drive API client
function getDriveClient() {
  // Use service account for server-side operations
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

// Create folders if they don't exist
export async function createFolderIfNotExists(folderName: string) {
  // Check cache first
  if (folderCache[folderName]) {
    return folderCache[folderName];
  }
  
  const drive = getDriveClient();
  
  // Check if folder exists
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (response.data.files && response.data.files.length > 0) {
    // Cache the folder ID
    folderCache[folderName] = response.data.files[0].id;
    return response.data.files[0].id;
  }

  // Create folder if it doesn't exist
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  
  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });
  
  // Cache the new folder ID
  folderCache[folderName] = folder.data.id;
  return folder.data.id;
}

export async function uploadFileToDrive(file: Buffer, fileName: string, mimeType: string) {
  try {
    const drive = getDriveClient();
    
    // Ensure the uploads folder exists (using cache when possible)
    const folderId = await createFolderIfNotExists('shortstack_uploads');
    
    // Convert buffer to stream
    const fileStream = bufferToStream(file);
    
    // Upload file to Google Drive and create public permissions in one step
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: fileStream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    if (!response.data.id) {
      throw new Error('Failed to upload file to Google Drive');
    }
    
    // Make the file publicly accessible with a link
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Return direct web and download links
    return {
      success: true,
      fileId: response.data.id,
      webViewLink: `https://drive.google.com/file/d/${response.data.id}/view`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${response.data.id}`,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}
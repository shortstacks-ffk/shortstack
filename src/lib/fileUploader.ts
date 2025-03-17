interface UploadResponse {
    success: boolean;
    fileUrl?: string;
    downloadUrl?: string;
    fileId?: string;
    error?: string;
  }
  
  export async function uploadFile(file: File, fileName?: string): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (fileName) {
        formData.append('fileName', fileName);
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Upload failed',
        };
      }
      
      return {
        success: true,
        fileUrl: result.fileUrl,
        downloadUrl: result.downloadUrl,
        fileId: result.fileId,
      };
    } catch (error: any) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }
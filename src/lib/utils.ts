import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The function `formatFileSize` converts a given number of bytes into a human-readable file size
 * format.
 * @param {number} bytes - The `formatFileSize` function takes a `bytes` parameter of type number,
 * which represents the size of a file in bytes. The function converts this size into a human-readable
 * format by converting it into kilobytes (KB), megabytes (MB), gigabytes (GB), or terabytes (
 * @returns The function `formatFileSize` takes a number of bytes as input and returns a formatted
 * string representing the file size in appropriate units (Bytes, KB, MB, GB, TB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatCurrency(amount: number, showSymbol: boolean = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    // Only include the currency symbol if showSymbol is true
    currencyDisplay: showSymbol ? 'symbol' : 'code',
    currencySign: 'accounting'
  }).format(amount).replace('USD', '').trim();
}

export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "?";

  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";

  return `${firstInitial}${lastInitial}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

// Generate a random account number for bank accounts
export function generateAccountNumber(): string {
  // Generate a 10-digit random number (typical for account numbers)
  const randomNumber = Math.floor(Math.random() * 9000000000) + 1000000000;
  return randomNumber.toString();
}



// Update the getSimpleFileType function
export const getSimpleFileType = (fileType?: string, fileName?: string): string => {
  // Check for common file extensions in the filename first
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    
    // PowerPoint files
    if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx') || lowerName.endsWith('.pptm')) {
      return 'PPT';
    }
    // Word documents
    if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx') || lowerName.endsWith('.rtf')) {
      return 'DOC';
    }
    // Excel files
    if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) {
      return 'XLS';
    }
    // PDF files
    if (lowerName.endsWith('.pdf')) {
      return 'PDF';
    }
    // Image files
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || 
        lowerName.endsWith('.png') || lowerName.endsWith('.gif') ||
        lowerName.endsWith('.svg') || lowerName.endsWith('.webp')) {
      return 'IMG';
    }
    // Video files
    if (lowerName.endsWith('.mp4') || lowerName.endsWith('.mov') || 
        lowerName.endsWith('.avi') || lowerName.endsWith('.webm')) {
      return 'VID';
    }
    // Audio files
    if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav') || 
        lowerName.endsWith('.ogg') || lowerName.endsWith('.m4a')) {
      return 'AUD';
    }
    // Archive files
    if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar') || lowerName.endsWith('.7z')) {
      return 'ZIP';
    }
    
    // If we can identify a file extension
    const nameParts = lowerName.split('.');
    if (nameParts.length > 1) {
      const ext = nameParts[nameParts.length - 1];
      return ext.toUpperCase();
    }
  }
  
  // Fall back to content type detection
  if (fileType) {
    const lowerType = fileType.toLowerCase();
    
    // PowerPoint files
    if (lowerType.includes('powerpoint') || 
        lowerType.includes('presentation') || 
        lowerType.includes('ppt')) {
      return 'PPT';
    }
    
    // Word documents
    if (lowerType.includes('word') || 
        lowerType.includes('doc') || 
        lowerType.includes('rtf')) {
      return 'DOC';
    }
    
    // Excel files
    if (lowerType.includes('excel') || 
        lowerType.includes('spreadsheet') || 
        lowerType.includes('csv') ||
        lowerType.includes('sheet')) {
      return 'XLS';
    }
    
    // PDF files
    if (lowerType.includes('pdf')) {
      return 'PDF';
    }
    
    // Image files
    if (lowerType.includes('image') || 
        lowerType.includes('jpeg') || 
        lowerType.includes('png') ||
        lowerType.includes('gif') ||
        lowerType.includes('svg')) {
      return 'IMG';
    }
    
    // Video files
    if (lowerType.includes('video')) {
      return 'VID';
    }
    
    // Audio files
    if (lowerType.includes('audio')) {
      return 'AUD';
    }
    
    // Archive files
    if (lowerType.includes('zip') || 
        lowerType.includes('rar') || 
        lowerType.includes('archive') ||
        lowerType.includes('compressed')) {
      return 'ZIP';
    }
    
    // Text files
    if (lowerType.includes('text/plain') || lowerType.includes('txt')) {
      return 'TXT';
    }
    
    // HTML files
    if (lowerType.includes('html')) {
      return 'HTML';
    }
    
    // Generic types
    const parts = lowerType.split('/');
    if (parts.length > 1) {
      return parts[1].toUpperCase().substring(0, 3);
    }
  }
  
  return 'FILE';
};

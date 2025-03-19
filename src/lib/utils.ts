import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

<<<<<<< HEAD

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
=======
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
>>>>>>> 2b034591553f8b2649339e91ce5804af167b8aea

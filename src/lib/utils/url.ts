/**
 * Gets the base URL for the application with the correct protocol
 */
export function getBaseUrl(): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return process.env.VERCEL_URL 
    ? `${protocol}://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
}
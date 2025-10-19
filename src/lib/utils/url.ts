/**
 * Gets the base URL for the application with the correct protocol
 */
export function getBaseUrl(): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const baseUrl = process.env.VERCEL_URL 
    ? `${protocol}://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
  
  // Add logging in production to debug URL issues
  if (process.env.NODE_ENV === 'production') {
    console.log('getBaseUrl() called in production:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      baseUrl
    });
  }
  
  return baseUrl;
}
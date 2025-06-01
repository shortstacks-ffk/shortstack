import { cookies } from "next/headers";

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  
  // Clear all next-auth related cookies
  const cookiesToClear = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.pkce.code_verifier',
    'next-auth.state',
    '__Secure-next-auth.session-token',
    '__Secure-next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ];
  
  for (const name of cookiesToClear) {
    cookieStore.delete(name);
  }
}
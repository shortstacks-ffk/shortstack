import 'next/dist/server/api-utils';

declare module 'next/dist/server/api-utils' {
  interface NextApiRequest {
    params?: Record<string, string>;
  }
}
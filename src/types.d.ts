import 'next';

declare module 'next' {
  export interface NextApiRequest {
    params?: {
      [key: string]: string;
    };
  }
}
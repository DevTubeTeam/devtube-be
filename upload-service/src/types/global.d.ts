// src/types/global.d.ts
export {};

declare global {
  type ServiceResponse<T = any> = {
    statusCode: number;
    message: string;
    data: T | null;
    meta?: Record<string, any> | null;
  };
}

export {};

declare global {
  type ServiceResponse<T = any> = {
    statusCode: number;
    message: string;
    data: T | null;
    meta?: any;
  };
}

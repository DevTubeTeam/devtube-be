export interface GlobalResponse<T = any> {
  statusCode: number;
  message: string;
  data: T | null;
  meta?: any;
}

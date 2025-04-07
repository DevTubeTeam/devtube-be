import { GlobalResponse } from '../types/global-response.type';

export function success<T>(data: T, message = 'Thành công'): GlobalResponse<T> {
  return {
    statusCode: 200,
    message,
    data,
  };
}

export function fail(message: string, statusCode = 400): GlobalResponse<null> {
  return {
    statusCode,
    message,
    data: null,
  };
}

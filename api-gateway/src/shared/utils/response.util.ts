
export function success<T>(data: T, message = 'Thành công'): ServiceResponse<T> {
  return {
    statusCode: 200,
    message,
    data,
  };
}

export function fail(message: string, statusCode = 400): ServiceResponse<null> {
  return {
    statusCode,
    message,
    data: null,
  };
}

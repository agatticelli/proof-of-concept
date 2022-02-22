const responseBuilder = (statusCode: number, data: any, headers?: any) => ({
  statusCode,
  body: data ? JSON.stringify(data) : '',
  headers,
});
const error = (statusCode: number, message: string) => responseBuilder(statusCode, { message });

export const ok = (data: any) => responseBuilder(200, data);
export const redirect = (url: string, code = 301) => responseBuilder(code, null, { Location: url });
export const badRequest = (message = 'Bad Request') => error(400, message);
export const notFound = (message = 'Not Found') => error(404, message);

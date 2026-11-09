export type ErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly retryAfterSeconds?: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message = 'The request is invalid.') =>
  new AppError(400, 'validation_error', message);

export const unauthorized = (message = 'Please sign in.', code = 'unauthorized') =>
  new AppError(401, code, message);

export const forbidden = (message = 'You do not have access to this action.', code = 'forbidden') =>
  new AppError(403, code, message);

export const notFound = (message = 'Not found.') => new AppError(404, 'not_found', message);

export const conflict = (message: string, code = 'conflict') => new AppError(409, code, message);

export const lockedOut = (message: string, retryAfterSeconds: number) => {
  const error = new AppError(429, 'locked_out', message);
  return Object.assign(error, { retryAfterSeconds });
};

export const passwordChangeRequired = () =>
  new AppError(403, 'password_change_required', 'Change the initial password before continuing.');

/**
 * Base error class for all application errors.
 *
 * Services should extend this so route handlers can map errors to HTTP
 * responses consistently.
 */

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PROVIDER"
  | "INTERNAL";

export abstract class AppError extends Error {
  abstract readonly code: AppErrorCode;
  abstract readonly httpStatus: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED" as const;
  readonly httpStatus = 401;
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN" as const;
  readonly httpStatus = 403;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND" as const;
  readonly httpStatus = 404;
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION" as const;
  readonly httpStatus = 400;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT" as const;
  readonly httpStatus = 409;
}

export class RateLimitedError extends AppError {
  readonly code = "RATE_LIMITED" as const;
  readonly httpStatus = 429;
}

/** Failure originating from an external AI / model / vector provider. */
export class ProviderError extends AppError {
  readonly code = "PROVIDER" as const;
  readonly httpStatus = 502;
  constructor(
    public readonly provider: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`[${provider}] ${message}`, options);
  }
}

export class InternalError extends AppError {
  readonly code = "INTERNAL" as const;
  readonly httpStatus = 500;
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

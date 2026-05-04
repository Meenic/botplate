import type { AppError } from "./errors";

/**
 * Result type for error handling without exceptions.
 *
 * Use this for expected failures (session not found, validation errors, etc).
 * Reserve exceptions for truly unexpected errors.
 */
export type Result<T, E extends AppError = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E extends AppError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export function unwrap<T, E extends AppError>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw r.error;
}

export function map<T, U, E extends AppError>(
  r: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r;
}

export async function mapAsync<T, U, E extends AppError>(
  r: Result<T, E>,
  fn: (value: T) => Promise<U>,
): Promise<Result<U, E>> {
  return r.ok ? ok(await fn(r.value)) : r;
}

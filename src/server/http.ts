import { ZodError } from "zod";
import { isAppError } from "./errors";
import { logger } from "./logger";

/**
 * Centralized error → Response mapper for App Router route handlers.
 *
 * - `AppError` subclasses → JSON body via `toJSON()` + their `httpStatus`.
 * - `ZodError` → 400 with the validation issues, mapped to our wire shape.
 * - Anything else → log and re-throw so Next's runtime surfaces a real
 *   stack and a 500 to the client.
 */
export function errorToResponse(err: unknown): Response {
  if (isAppError(err)) {
    return Response.json({ error: err.toJSON() }, { status: err.httpStatus });
  }
  if (err instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION",
          message: "Invalid request",
          issues: err.issues,
        },
      },
      { status: 400 },
    );
  }
  logger.error("Unhandled route error", { err });
  throw err;
}

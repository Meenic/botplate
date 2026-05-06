import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";

/**
 * Pass to `toUIMessageStreamResponse({ onError })`. Never leak stack traces
 * to the client mid-stream; surface a stable, typed message.
 */
export function streamErrorHandler(error: unknown): string {
  if (isAppError(error)) {
    logger.warn("stream.app_error", {
      code: error.code,
      message: error.message,
    });
    return error.message;
  }

  // Handle provider errors with more context
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;

    // Rate limit errors
    const metadata = err.metadata as Record<string, unknown> | undefined;
    if (err.code === 429 || metadata?.error_type === "rate_limit_exceeded") {
      logger.error("stream.rate_limit", {
        code: err.code,
        message: err.message,
        metadata,
      });
      return "Rate limit exceeded. Please wait a moment and try again.";
    }

    // Other structured errors
    if ("message" in err && typeof err.message === "string") {
      logger.error("stream.structured_error", {
        code: err.code,
        message: err.message,
        metadata,
      });
      return err.message;
    }
  }

  logger.error("stream.unknown_error", {
    error: String(error),
    type: typeof error,
  });
  return "An error occurred while streaming the response.";
}

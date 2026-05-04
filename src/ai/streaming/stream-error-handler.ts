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
  logger.error("stream.unknown_error", { error: String(error) });
  return "stream_error";
}

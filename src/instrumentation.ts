import type {
  OnFinishEvent,
  OnStartEvent,
  OnStepFinishEvent,
  TelemetryIntegration,
} from "ai";
import { bindTelemetryIntegration } from "ai";
import { env } from "@/env";

/**
 * Custom telemetry integration for logging AI SDK events to console.
 * Provides detailed logging of tokens, model info, and timing.
 */
class ConsoleTelemetryIntegration implements TelemetryIntegration {
  async onStart(event: OnStartEvent) {
    console.log("[ai-telemetry] Generation started:", {
      modelId: event.model.modelId,
      functionId: event.functionId,
      metadata: event.metadata,
    });
  }

  async onFinish(event: OnFinishEvent) {
    console.log("[ai-telemetry] Generation finished:", {
      modelId: event.model.modelId,
      functionId: event.functionId,
      totalTokens: event.totalUsage.totalTokens,
      inputTokens: event.totalUsage.inputTokens,
      outputTokens: event.totalUsage.outputTokens,
      metadata: event.metadata,
    });
  }

  async onStepFinish(event: OnStepFinishEvent) {
    console.log("[ai-telemetry] Step finished:", {
      stepNumber: event.stepNumber,
      totalTokens: event.usage.totalTokens,
      inputTokens: event.usage.inputTokens,
      outputTokens: event.usage.outputTokens,
    });
  }
}

export const consoleTelemetryIntegration = () =>
  bindTelemetryIntegration(new ConsoleTelemetryIntegration());

/**
 * Instrumentation hook. Boots OpenTelemetry via `@vercel/otel` when
 * OTEL_ENABLED=true. The dynamic import keeps the OTEL SDK out of cold starts
 * (and out of build-time static analysis) when telemetry is disabled.
 *
 * `experimental_telemetry: { isEnabled: env.OTEL_ENABLED, functionId, metadata }`
 * is passed to every streamText / generateText call in services so spans are
 * created automatically. See:
 *   - https://ai-sdk.dev/docs/ai-sdk-core/telemetry
 *   - https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry
 */
export async function register(): Promise<void> {
  if (env.OTEL_ENABLED) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: env.OTEL_SERVICE_NAME });
  }

  if (env.NODE_ENV !== "production") {
    console.log("[instrumentation] server initialized", {
      otel: env.OTEL_ENABLED,
    });
  }
}

/**
 * Optional hook for server-side errors. Wire to Sentry / Axiom /
 * Datadog later. Typed stub for now.
 */
export async function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "proxy";
  },
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.error("[instrumentation] request error", {
      message: error.message,
      digest: error.digest,
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
    });
  }
  // TODO: forward to error tracker once configured.
}

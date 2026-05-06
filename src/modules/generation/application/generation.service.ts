import "server-only";
import { generateText, Output } from "ai";
import type { z } from "zod";
import type { LanguageModelRegistry } from "@/ai/registry/language-model.registry";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { env } from "@/env";
import { consoleTelemetryIntegration } from "@/instrumentation";

export interface GenerateTextInput {
  readonly prompt: string;
  readonly system?: string;
  readonly modelId?: LanguageModelLogicalId;
}

export interface GenerateObjectInput<TSchema extends z.ZodType> {
  readonly prompt: string;
  readonly schema: TSchema;
  readonly system?: string;
  readonly modelId?: LanguageModelLogicalId;
}

/**
 * Single-shot generation.
 */
export class GenerationService {
  constructor(private readonly models: LanguageModelRegistry) {}

  async text(input: GenerateTextInput): Promise<string> {
    const { prompt, system, modelId = "chat.default" } = input;
    const { text } = await generateText({
      model: this.models.get(modelId),
      system,
      prompt,
      experimental_telemetry: {
        isEnabled: env.OTEL_ENABLED,
        functionId: "generation.text",
        metadata: { modelId },
        integrations: env.OTEL_ENABLED ? [consoleTelemetryIntegration()] : [],
      },
    });
    return text;
  }

  async object<TSchema extends z.ZodType>(
    input: GenerateObjectInput<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const { prompt, schema, system, modelId = "chat.default" } = input;
    const { output } = await generateText({
      model: this.models.get(modelId),
      system,
      prompt,
      output: Output.object({ schema }),
      experimental_telemetry: {
        isEnabled: env.OTEL_ENABLED,
        functionId: "generation.object",
        metadata: { modelId },
        integrations: env.OTEL_ENABLED ? [consoleTelemetryIntegration()] : [],
      },
    });
    return output as z.infer<TSchema>;
  }
}

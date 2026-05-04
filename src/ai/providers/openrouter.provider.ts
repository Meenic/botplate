import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { LanguageModelPort } from "@/ai/ports/language-model.port";
import {
  LANGUAGE_MODEL_CATALOG,
  type LanguageModelLogicalId,
  type ModelEntry,
} from "@/ai/registry/models.config";
import { env } from "@/env";

/**
 * Shared OpenRouter client factory. Both adapters use the same API key.
 */
function makeClient(): OpenRouterProvider {
  return createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
}

/**
 * OpenRouter adapter for the language model port.
 */
export class OpenRouterLanguageModelProvider extends LanguageModelPort {
  private readonly client: OpenRouterProvider;

  constructor() {
    super();
    this.client = makeClient();
  }

  resolve(id: LanguageModelLogicalId): LanguageModel {
    const entry: ModelEntry = LANGUAGE_MODEL_CATALOG[id];
    return this.client.chat(entry.providerModelId, entry.settings);
  }
}

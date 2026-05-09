import {
  createOpenRouter,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import { customProvider, type LanguageModel } from "ai";
import type { LanguageModelPort } from "@/ai/ports/language-model.port";
import { LANGUAGE_MODEL_CATALOG } from "@/ai/registry/models.config";
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
export class OpenRouterLanguageModelProvider implements LanguageModelPort {
  private readonly client: OpenRouterProvider;
  private readonly provider;

  constructor() {
    this.client = makeClient();

    // Build the language models map from your existing catalog
    const models: Record<string, ReturnType<OpenRouterProvider["chat"]>> = {};
    for (const [id, entry] of Object.entries(LANGUAGE_MODEL_CATALOG)) {
      models[id] = this.client.chat(entry.providerModelId, entry.settings);
    }

    this.provider = customProvider({
      languageModels: models,
      fallbackProvider: this.client,
    });
  }

  resolve(id: string): LanguageModel {
    return this.provider.languageModel(id);
  }
}

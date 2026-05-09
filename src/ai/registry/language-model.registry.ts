import type { LanguageModel } from "ai";
import type { LanguageModelPort } from "@/ai/ports/language-model.port";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";

/**
 * Per-request cache so multiple resolves in the same handler share one instance.
 * Wraps a LanguageModelPort and caches resolved models.
 */
export class LanguageModelRegistry {
  private readonly cache = new Map<LanguageModelLogicalId, LanguageModel>();

  constructor(private readonly port: LanguageModelPort) {}

  get(id: LanguageModelLogicalId): LanguageModel {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const model = this.port.resolve(id);
    this.cache.set(id, model);
    return model;
  }
}

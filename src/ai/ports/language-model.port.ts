import type { LanguageModel } from "ai";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";

/**
 * Interface for resolving logical model IDs to concrete LanguageModel instances.
 */
export abstract class LanguageModelPort {
  abstract resolve(id: LanguageModelLogicalId): LanguageModel;
}

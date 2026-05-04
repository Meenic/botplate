/**
 * Logical model catalog.
 *
 * Reference models by capability (e.g. "chat.default"), not vendor.
 * Swap providers by editing here instead of hunting through the codebase.
 *
 * Provider IDs use the "vendor/model" format expected by OpenRouter.
 */

export type ModelCapability = "chat" | "fast" | "vision" | "reasoning";

export type KnownProviderModelId =
  | "google/gemini-3-flash-preview"
  | "google/gemini-3.1-flash-lite-preview"
  | (string & {});

export type ModelEntry = {
  readonly providerModelId: KnownProviderModelId;
  readonly capabilities: readonly ModelCapability[];
  readonly settings?: Readonly<Record<string, unknown>>;
};

export const LANGUAGE_MODEL_CATALOG = {
  "chat.default": {
    providerModelId: "google/gemini-3.1-flash-lite-preview",
    capabilities: ["chat"],
  },
  "chat.fast": {
    providerModelId: "google/gemini-3-flash-preview",
    capabilities: ["chat", "fast"],
  },
} as const satisfies Record<string, ModelEntry>;

export type LanguageModelLogicalId = keyof typeof LANGUAGE_MODEL_CATALOG;

import type { LanguageModelUsage, UIMessage } from "ai";

/**
 * Metadata shape sent by the server via `messageMetadata` in
 * `toUIMessageStreamResponse`. Shared across client and server
 * so we get compile-time safety instead of runtime narrowing.
 */
export type ChatMessageMetadata = {
  /** Sent on part.type === "start" */
  timestamp?: number;
  modelId?: string;
  /** Sent on part.type === "finish" */
  totalUsage?: LanguageModelUsage;
  finishReason?: string;
};

/** Fully-typed UIMessage used across client & server. */
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

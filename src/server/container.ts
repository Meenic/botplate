import "server-only";
import { OpenRouterLanguageModelProvider } from "@/ai/providers/openrouter.provider";
import { LanguageModelRegistry } from "@/ai/registry/language-model.registry";
import { ChatStreamingService } from "@/modules/chat/application/chat-streaming.service";
import { DrizzleConversationRepository } from "@/modules/chat/infrastructure/conversation.repository";
import { GenerationService } from "@/modules/generation/application/generation.service";

/**
 * Request-scoped DI factory. One container per request keeps caches
 * (e.g. resolved models) bounded and avoids cross-request leakage.
 */
export function createContainer() {
  const port = new OpenRouterLanguageModelProvider();
  const models = new LanguageModelRegistry(port);
  const conversations = new DrizzleConversationRepository();
  return {
    conversations,
    chat: new ChatStreamingService(models, conversations),
    generation: new GenerationService(models),
  };
}

export type Container = ReturnType<typeof createContainer>;

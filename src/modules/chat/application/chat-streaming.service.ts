import "server-only";
import {
  convertToModelMessages,
  generateId,
  streamText,
  type UIMessage,
} from "ai";
import type { LanguageModelRegistry } from "@/ai/registry/language-model.registry";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { streamErrorHandler } from "@/ai/streaming/stream-error-handler";
import { env } from "@/env";
import { chatTools } from "@/modules/chat/application/tools";
import type { ConversationRepository } from "@/modules/chat/infrastructure/conversation.repository";
import { NotFoundError } from "@/server/errors";

export interface StartStreamInput {
  readonly userId: string;
  readonly conversationId: string;
  readonly lastMessage: UIMessage;
  readonly modelId?: LanguageModelLogicalId;
  readonly system?: string;
}

const DEFAULT_SYSTEM =
  "You are Botplate, a helpful, concise assistant. Prefer accuracy over verbosity.";

/**
 * Streaming-first chat orchestrator with per-message persistence.
 *
 * Flow:
 *  1. Verify the caller owns the conversation.
 *  2. Load prior messages from the repo and append the new user turn.
 *  3. Persist the user message synchronously so partial failures still leave
 *     a durable trail.
 *  4. Stream the assistant response. `consumeStream()` keeps the model call
 *     running even if the client disconnects, so onFinish always fires.
 *  5. In onFinish, diff the final UIMessage[] against the in-memory thread by
 *     id and persist only the new (assistant) row(s).
 */
export class ChatStreamingService {
  constructor(
    private readonly models: LanguageModelRegistry,
    private readonly conversations: ConversationRepository,
  ) {}

  async start(input: StartStreamInput): Promise<Response> {
    const {
      userId,
      conversationId,
      lastMessage,
      modelId = "chat.default",
      system = DEFAULT_SYSTEM,
    } = input;

    const owned = await this.conversations.getOwned(conversationId, userId);
    if (!owned) throw new NotFoundError("conversation not found");

    const previous = await this.conversations.listMessages(conversationId);
    const thread: UIMessage[] = [...previous, lastMessage];

    await this.conversations.insertMessages(conversationId, [lastMessage]);

    const result = streamText({
      model: this.models.get(modelId),
      system,
      messages: await convertToModelMessages(thread),
      tools: chatTools,
      experimental_telemetry: {
        isEnabled: env.OTEL_ENABLED,
        functionId: "chat.stream",
        metadata: { conversationId, userId, modelId },
      },
    });

    // Keep the upstream call running even if the client aborts, so onFinish
    // still persists the assistant message.
    result.consumeStream();

    return result.toUIMessageStreamResponse({
      originalMessages: thread,
      generateMessageId: generateId,
      onFinish: async ({ messages: full }) => {
        const knownIds = new Set(thread.map((m) => m.id));
        const newly = full.filter((m) => !knownIds.has(m.id));
        if (newly.length > 0) {
          await this.conversations.insertMessages(conversationId, newly);
        }
        await this.conversations.touch(conversationId);
      },
      onError: streamErrorHandler,
    });
  }
}

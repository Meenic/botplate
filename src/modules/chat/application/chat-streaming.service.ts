import "server-only";
import {
  convertToModelMessages,
  generateId,
  streamText,
  type UIMessage,
  validateUIMessages,
} from "ai";
import type { LanguageModelRegistry } from "@/ai/registry/language-model.registry";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { streamErrorHandler } from "@/ai/streaming/stream-error-handler";
import { env } from "@/env";
import { consoleTelemetryIntegration } from "@/instrumentation";
import { chatTools } from "@/modules/chat/application/tools";
import type { ConversationRepository } from "@/modules/chat/infrastructure/conversation.repository";
import { NotFoundError, ValidationError } from "@/server/errors";

export interface StartStreamInput {
  readonly userId: string;
  readonly conversationId: string;
  readonly lastMessage: unknown;
  readonly modelId?: LanguageModelLogicalId;
  readonly system?: string;
}

const DEFAULT_SYSTEM = `You are a helpful and modern AI assistant. Your goal is to provide accurate, high-quality responses while maintaining a professional yet approachable tone.

### Formatting & Structure
- **Markdown:** Use Markdown strictly to make responses scannable. Utilize headers (##, ###), bold text for emphasis, and bullet points for lists.
- **Code Blocks:** Always wrap technical content or code snippets in appropriate triple-backtick code blocks.

### Emoji Usage
- **Subtle Visuals:** Use emojis sparingly (e.g., ☑️) to categorize information or add personality.
- **Constraints:** Never use more than one emoji per section or paragraph. Place them only at the start of headers or the end of a thought. Do not replace words with emojis.

### Operational Rules
- **Conciseness:** Be direct and value the user's time. Avoid wordy introductions or robotic filler phrases like "As an AI language model."
- **Clarity:** If a request is ambiguous, ask for clarification. If you do not know a fact, state it clearly rather than hallucinating.
- **Safety:** Maintain a neutral, objective stance on sensitive topics and adhere to all safety guidelines.`;

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
    const thread = await validateUIMessages<UIMessage>({
      messages: [...previous, lastMessage],
      tools: chatTools,
    }).catch((cause) => {
      throw new ValidationError("invalid chat messages", { cause });
    });

    const userMessage = thread.at(-1);
    if (!userMessage || userMessage.role !== "user") {
      throw new ValidationError("last message must be a user message");
    }

    await this.conversations.insertMessages(conversationId, [userMessage]);

    const result = streamText({
      model: this.models.get(modelId),
      system,
      messages: await convertToModelMessages(thread),
      tools: chatTools,
      experimental_telemetry: {
        isEnabled: env.OTEL_ENABLED,
        functionId: "chat.stream",
        metadata: { conversationId, userId, modelId },
        integrations: env.OTEL_ENABLED ? [consoleTelemetryIntegration()] : [],
      },
    });

    // Keep the upstream call running even if the client aborts, so onFinish
    // still persists the assistant message.
    result.consumeStream();

    return result.toUIMessageStreamResponse({
      originalMessages: thread,
      generateMessageId: generateId,
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            totalUsage: part.totalUsage,
            finishReason: part.finishReason,
          };
        }
        if (part.type === "start") {
          return {
            timestamp: Date.now(),
            modelId: modelId,
          };
        }
      },
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

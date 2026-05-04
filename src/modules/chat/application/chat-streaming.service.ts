import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { LanguageModelRegistry } from "@/ai/registry/language-model.registry";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { streamErrorHandler } from "@/ai/streaming/stream-error-handler";
import { chatTools } from "@/modules/chat/application/tools";

export interface StartStreamInput {
  readonly messages: UIMessage[];
  readonly modelId?: LanguageModelLogicalId;
  readonly system?: string;
}

const DEFAULT_SYSTEM =
  "You are Botplate, a helpful, concise assistant. Prefer accuracy over verbosity.";

/**
 * Streaming-first chat orchestrator.
 * TODO: Wire persistence by injecting a repository and closing over
 * it in an onFinish callback.
 */
export class ChatStreamingService {
  constructor(private readonly models: LanguageModelRegistry) {}

  async start(input: StartStreamInput): Promise<Response> {
    const {
      messages,
      modelId = "chat.default",
      system = DEFAULT_SYSTEM,
    } = input;

    const result = streamText({
      model: this.models.get(modelId),
      system,
      messages: await convertToModelMessages(messages),
      tools: chatTools,
    });

    return result.toUIMessageStreamResponse({ onError: streamErrorHandler });
  }
}

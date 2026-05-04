import type { UIMessage } from "ai";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { createContainer } from "@/server/container";

export const maxDuration = 30;

export async function POST(req: Request): Promise<Response> {
  const { messages, modelId } = (await req.json()) as {
    messages: UIMessage[];
    modelId?: LanguageModelLogicalId;
  };
  const { chat } = createContainer();
  return chat.start({ messages, modelId });
}

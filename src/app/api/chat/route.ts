import type { UIMessage } from "ai";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { requireUser } from "@/server/auth-context";
import { createContainer } from "@/server/container";
import { errorToResponse } from "@/server/http";

export const maxDuration = 30;

interface ChatRequestBody {
  message: UIMessage;
  id: string;
  modelId?: LanguageModelLogicalId;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireUser();
    const { message, id, modelId } = (await req.json()) as ChatRequestBody;
    const { chat } = createContainer();
    return await chat.start({
      userId: user.id,
      conversationId: id,
      lastMessage: message,
      modelId,
    });
  } catch (err) {
    return errorToResponse(err);
  }
}

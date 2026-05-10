import { z } from "zod";
import {
  LANGUAGE_MODEL_CATALOG,
  type LanguageModelLogicalId,
} from "@/ai/registry/models.config";
import { requireUser } from "@/server/auth-context";
import { createContainer } from "@/server/container";
import { errorToResponse } from "@/server/http";

export const maxDuration = 30;

const Body = z.object({
  id: z.string().min(1),
  message: z.unknown(),
  modelId: z
    .string()
    .refine((id): id is LanguageModelLogicalId => id in LANGUAGE_MODEL_CATALOG)
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireUser();
    const { message, id, modelId } = Body.parse(await req.json());
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

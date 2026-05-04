import { z } from "zod";
import { createContainer } from "@/server/container";
import { errorToResponse } from "@/server/http";

const Body = z.object({
  prompt: z.string().min(1),
  system: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const data = Body.parse(await req.json());
    const { generation } = createContainer();
    const text = await generation.text(data);
    return Response.json({ text });
  } catch (err) {
    return errorToResponse(err);
  }
}

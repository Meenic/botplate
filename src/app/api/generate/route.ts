import { z } from "zod";
import { createContainer } from "@/server/container";

const Body = z.object({
  prompt: z.string().min(1),
  system: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const { generation } = createContainer();
  const text = await generation.text(parsed.data);
  return Response.json({ text });
}

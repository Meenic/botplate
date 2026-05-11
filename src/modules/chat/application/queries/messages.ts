import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth-context";
import { createContainer } from "@/server/container";

export async function getConversationMessages({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, { conversations }] = await Promise.all([
    requireUser(),
    createContainer(),
  ]);

  const messages = await conversations.listOwnedMessages(id, user.id);
  if (!messages) notFound();

  return messages;
}

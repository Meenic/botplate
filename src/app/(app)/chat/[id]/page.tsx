import { notFound } from "next/navigation";
import { AnonymousBootstrap } from "@/modules/chat/ui/anonymous-bootstrap";
import { ChatWindow } from "@/modules/chat/ui/chat-window";
import { getCurrentUser } from "@/server/auth-context";
import { createContainer } from "@/server/container";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return <AnonymousBootstrap />;

  const { conversations } = createContainer();
  const owned = await conversations.getOwned(id, user.id);
  if (!owned) notFound();

  const initialMessages = await conversations.listMessages(id);
  return <ChatWindow chatId={id} initialMessages={initialMessages} />;
}

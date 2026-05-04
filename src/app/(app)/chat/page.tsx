import { generateId } from "ai";
import { redirect } from "next/navigation";
import { AnonymousBootstrap } from "@/modules/chat/ui/anonymous-bootstrap";
import { getCurrentUser } from "@/server/auth-context";
import { createContainer } from "@/server/container";

/**
 * `/chat` always provisions a new conversation and redirects to `/chat/[id]`.
 * The URL is the source of truth — there's no client-side conversation state.
 *
 * If no session exists yet, render the bootstrap shim which signs the user in
 * anonymously and refreshes; this Server Component then re-runs with a session.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return <AnonymousBootstrap />;

  const id = generateId();
  const { conversations } = createContainer();
  await conversations.create({ id, userId: user.id });
  redirect(`/chat/${id}`);
}

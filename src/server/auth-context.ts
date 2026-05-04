import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/server/errors";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("authentication required");
  return user;
}

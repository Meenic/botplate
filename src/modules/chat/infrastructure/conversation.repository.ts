import "server-only";
import type { UIMessage } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/modules/chat/schema/chat";

export interface ConversationRow {
  readonly id: string;
  readonly userId: string;
}

export abstract class ConversationRepository {
  abstract create(input: {
    id: string;
    userId: string;
    title?: string | null;
  }): Promise<void>;

  abstract getOwned(
    id: string,
    userId: string,
  ): Promise<ConversationRow | null>;

  abstract listMessages(conversationId: string): Promise<UIMessage[]>;

  abstract insertMessages(
    conversationId: string,
    msgs: UIMessage[],
  ): Promise<void>;

  abstract touch(conversationId: string): Promise<void>;
}

export class DrizzleConversationRepository extends ConversationRepository {
  async create({
    id,
    userId,
    title = null,
  }: {
    id: string;
    userId: string;
    title?: string | null;
  }): Promise<void> {
    await db.insert(conversations).values({ id, userId, title });
  }

  async getOwned(id: string, userId: string): Promise<ConversationRow | null> {
    const rows = await db
      .select({
        id: conversations.id,
        userId: conversations.userId,
      })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listMessages(conversationId: string): Promise<UIMessage[]> {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return rows.map(
      (r) =>
        ({
          id: r.id,
          role: r.role,
          parts: r.parts,
        }) as UIMessage,
    );
  }

  async insertMessages(
    conversationId: string,
    msgs: UIMessage[],
  ): Promise<void> {
    if (msgs.length === 0) return;
    await db.insert(messages).values(
      msgs.map((m) => ({
        id: m.id,
        conversationId,
        role: m.role,
        parts: m.parts as unknown[],
      })),
    );
  }

  async touch(conversationId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }
}

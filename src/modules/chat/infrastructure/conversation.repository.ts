import type { UIMessage } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/modules/chat/schema/chat";

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ConversationRow = Pick<Conversation, "id" | "userId">;

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
  abstract listOwnedMessages(
    conversationId: string,
    userId: string,
  ): Promise<UIMessage[] | null>;
  abstract insertMessages(
    conversationId: string,
    msgs: UIMessage[],
  ): Promise<void>;
  abstract touch(conversationId: string): Promise<void>;
}

export class DrizzleConversationRepository extends ConversationRepository {
  async create(input: { id: string; userId: string; title?: string | null }) {
    await db.insert(conversations).values(input);
  }

  async getOwned(id: string, userId: string) {
    const row = await db
      .select({ id: conversations.id, userId: conversations.userId })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .limit(1);

    return row[0] ?? null;
  }

  async listMessages(conversationId: string): Promise<UIMessage[]> {
    const rows = await db
      .select({
        id: messages.id,
        role: messages.role,
        parts: messages.parts,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return rows;
  }

  async listOwnedMessages(
    conversationId: string,
    userId: string,
  ): Promise<UIMessage[] | null> {
    const owned = await this.getOwned(conversationId, userId);
    if (!owned) return null;
    return this.listMessages(conversationId);
  }

  async insertMessages(conversationId: string, msgs: UIMessage[]) {
    if (msgs.length === 0) return;
    await db.batch([
      db.insert(messages).values(
        msgs.map((m) => ({
          id: m.id,
          conversationId,
          role: m.role,
          parts: m.parts,
        })),
      ),
    ]);
  }

  async touch(conversationId: string) {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }
}

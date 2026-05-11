"use client";

import type { UIMessage } from "ai";
import { ChatLayout } from "./chat-layout";
import { MessageAI } from "./message-ai";
import { MessageUser } from "./message-user";

interface MessageListProps {
  initialMessages: UIMessage[];
  isStreaming?: boolean;
  renderActions?: (message: UIMessage) => React.ReactNode;
}

export function MessageList({
  initialMessages,
  isStreaming = false,
  renderActions,
}: MessageListProps) {
  return (
    <div
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      aria-busy={isStreaming}
    >
      <div className="px-4 sm:px-6">
        <ChatLayout className="py-6 space-y-6">
          {initialMessages.map((message) =>
            message.role === "user" ? (
              <MessageUser
                key={message.id}
                message={message}
                actions={renderActions?.(message)}
              />
            ) : (
              <MessageAI
                key={message.id}
                message={message}
                actions={renderActions?.(message)}
              />
            ),
          )}
        </ChatLayout>
      </div>
    </div>
  );
}

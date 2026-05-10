"use client";

import type { UIMessage } from "ai";
import { useScrollToBottom } from "./hooks/use-scroll-to-bottom";
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
  // Passing the messages array as dep means the sentinel scrolls into view
  // on every render caused by a new message or a streaming chunk.
  const bottomRef = useScrollToBottom();

  return (
    <div
      className="space-y-6"
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      aria-busy={isStreaming}
    >
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

      {/* Invisible sentinel */}
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}

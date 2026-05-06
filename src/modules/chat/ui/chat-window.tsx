"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { ChatUIMessage } from "../chat.types";
import { AIMessage } from "./ai-message";
import { ChatInput } from "./chat-input";
import { useScrollToBottom } from "./hooks/use-scroll-to-bottom";
import { UserMessage } from "./user-message";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ messages, id }) => ({
    body: { message: messages[messages.length - 1], id },
  }),
});

export interface ChatWindowProps {
  chatId: string;
  initialMessages: ChatUIMessage[];
}

export function ChatWindow({ chatId, initialMessages }: ChatWindowProps) {
  const { messages, sendMessage, status, stop, error, regenerate } =
    useChat<ChatUIMessage>({
      id: chatId,
      messages: initialMessages,
      experimental_throttle: 50,
      transport,
      onFinish: ({ message, isAbort, isDisconnect, isError }) => {
        console.log("Chat finished:", {
          messageId: message.id,
          isAbort,
          isDisconnect,
          isError,
        });
      },
      onError: (error) => {
        console.error("Chat error:", error);
      },
    });

  // Handle auto-scrolling
  useScrollToBottom(messages, status);

  function handleMessageSubmit(message: string) {
    sendMessage({ text: message });
  }

  // Evaluate if the whitespace spacer should be visible
  const lastMessage = messages[messages.length - 1];
  const isUserLast = lastMessage?.role === "user";
  const isGenerating = status === "submitted" || status === "streaming";
  const showSpacer = isUserLast || isGenerating;

  return (
    <>
      <div className="min-h-dvh w-full max-w-3xl mx-auto px-4 pt-6 pb-40">
        <div className="flex flex-col gap-4">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            const isStreaming = status === "streaming" && isLast;

            return message.role === "user" ? (
              <UserMessage key={message.id} message={message} />
            ) : (
              <AIMessage
                key={message.id}
                message={message}
                isStreaming={isStreaming}
                onRegenerate={regenerate}
                status={status}
              />
            );
          })}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <span>Something went wrong.</span>
              <button
                type="button"
                onClick={() => regenerate()}
                disabled={status !== "ready" && status !== "error"}
                className="underline hover:underline-offset-2 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Dynamic Whitespace Spacer */}
          {showSpacer && <div className="h-[40vh]" aria-hidden="true" />}
        </div>
      </div>

      {/* Input background mask */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-3xl px-4 pb-6 pointer-events-none">
        <div className="absolute -bottom-4 left-4 right-4 h-20 bg-background -z-10" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-3xl px-4 pb-6">
        <ChatInput
          status={status}
          onSubmit={handleMessageSubmit}
          onStop={stop}
        />
      </div>
    </>
  );
}

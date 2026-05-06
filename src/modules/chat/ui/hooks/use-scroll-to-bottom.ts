import type { ChatStatus, UIMessage } from "ai";
import { useEffect, useRef } from "react";

export function useScrollToBottom(messages: UIMessage[], status: ChatStatus) {
  const prevMessageCount = useRef(0);
  const prevLastId = useRef<string | undefined>(undefined);
  const prevStatus = useRef<ChatStatus>("ready");

  useEffect(() => {
    const scrollingElement = document.scrollingElement;
    if (!scrollingElement) return;

    const currentCount = messages.length;
    const lastMessage = messages[currentCount - 1];
    const currentLastId = lastMessage?.id;

    const countChanged = currentCount !== prevMessageCount.current;
    const lastIdChanged = currentLastId !== prevLastId.current;
    const isNewMessage = countChanged || lastIdChanged;

    const streamingFinished =
      prevStatus.current === "streaming" && status === "ready";
    const isNewUserMessage = isNewMessage && lastMessage?.role === "user";

    prevMessageCount.current = currentCount;
    prevLastId.current = currentLastId;
    prevStatus.current = status;

    if (isNewUserMessage || streamingFinished) {
      scrollingElement.scrollTo({
        top: scrollingElement.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, status]);
}

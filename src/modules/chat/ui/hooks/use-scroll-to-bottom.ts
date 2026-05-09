import type { ChatStatus, UIMessage } from "ai";
import { useEffect, useEffectEvent } from "react";

export function useScrollToBottom(messages: UIMessage[], status: ChatStatus) {
  const onScroll = useEffectEvent(() => {
    const scrollingElement = document.scrollingElement;
    if (!scrollingElement) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user" || status === "ready") {
      scrollingElement.scrollTo({
        top: scrollingElement.scrollHeight,
        behavior: "smooth",
      });
    }
  });

  useEffect(() => {
    onScroll();
  });
}

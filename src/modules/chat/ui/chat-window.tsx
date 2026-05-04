"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export function ChatWindow() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const busy = status !== "ready";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border p-4">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-semibold">
              {m.role === "user" ? "You" : "AI"}:{" "}
            </span>
            {m.parts.map((part, i) =>
              part.type === "text" ? (
                <span key={`${m.id}-${i}`}>{part.text}</span>
              ) : null,
            )}
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="flex-1 rounded-md border px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask Botplate..."
        />
        <button
          type="submit"
          className="rounded-md border px-4 py-2 disabled:opacity-50"
          disabled={busy}
        >
          Send
        </button>
      </form>
    </div>
  );
}

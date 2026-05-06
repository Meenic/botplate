"use client";

import { Check, Copy, Edit } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChatUIMessage } from "../chat.types";

function extractTextForClipboard(message: ChatUIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export interface UserMessageProps {
  message: ChatUIMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractTextForClipboard(message));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="flex justify-end group">
      <div className="relative pb-6">
        <div className="rounded-4xl bg-secondary max-w-lg px-4 py-2.5 leading-relaxed whitespace-pre-wrap wrap-break-word">
          {message.parts.map((part, index) => {
            const key = `${part.type}-${index}`;

            if (part.type === "text") {
              return <span key={key}>{part.text}</span>;
            }

            if (part.type === "file" && part.mediaType?.startsWith("image/")) {
              return (
                // biome-ignore lint/performance/noImgElement: AI SDK streams data URLs with unknown dimensions
                <img
                  key={key}
                  src={part.url}
                  alt={part.filename ?? "Attachment"}
                  className="max-w-full rounded-lg my-1"
                />
              );
            }

            return null;
          })}
        </div>
        <div className="absolute right-0 -bottom-4 flex opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy"}
            aria-label={copied ? "Copied to clipboard" : "Copy message"}
            className="rounded-lg"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Edit"
            aria-label="Edit message"
            className="rounded-lg"
            onClick={() => {
              console.log("Edit clicked for message:", message.id);
            }}
          >
            <Edit />
          </Button>
        </div>
      </div>
    </div>
  );
}

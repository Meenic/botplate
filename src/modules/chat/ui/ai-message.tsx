"use client";

import { type ChatStatus, isToolUIPart } from "ai";
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatUIMessage } from "../chat.types";
import { Markdown } from "./markdown";

function extractTextForClipboard(message: ChatUIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export interface AIMessageProps {
  message: ChatUIMessage;
  isStreaming: boolean;
  onRegenerate?: () => void;
  status?: ChatStatus;
}

export function AIMessage({
  message,
  isStreaming,
  onRegenerate,
  status,
}: AIMessageProps) {
  const [copied, setCopied] = useState(false);

  const hasContent = message.parts.some(
    (part) =>
      (part.type === "text" && part.text.length > 0) ||
      part.type === "reasoning" ||
      part.type === "file" ||
      isToolUIPart(part),
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractTextForClipboard(message));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  if (!hasContent && isStreaming) {
    return <Skeleton className="h-8 w-8 rounded-full bg-primary" />;
  }

  return (
    <div className="relative">
      <div className="leading-relaxed">
        {message.parts.map((part, index) => {
          const key = `${part.type}-${index}`;

          if (part.type === "text") {
            return <Markdown key={key} content={part.text} />;
          }

          if (part.type === "reasoning") {
            return (
              <details
                key={key}
                className="my-2 rounded-lg border border-border bg-muted/50"
              >
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground select-none">
                  Reasoning
                </summary>
                <pre className="whitespace-pre-wrap px-3 pb-3 text-sm text-muted-foreground">
                  {part.text}
                </pre>
              </details>
            );
          }

          if (part.type === "file" && part.mediaType?.startsWith("image/")) {
            return (
              // biome-ignore lint/performance/noImgElement: AI SDK streams data URLs with unknown dimensions
              <img
                key={key}
                src={part.url}
                alt="Generated content"
                className="my-2 max-w-full rounded-lg"
              />
            );
          }

          if (part.type === "dynamic-tool") {
            return (
              <div
                key={key}
                className="my-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
              >
                <span className="font-medium">Tool: </span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em]">
                  {part.toolName}
                </code>
                {part.state === "output-available" && (
                  <span className="ml-2 text-muted-foreground">✓ Done</span>
                )}
              </div>
            );
          }

          if (part.type === "source-url") {
            return (
              <span key={key} className="text-sm">
                [
                <a
                  href={part.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 decoration-dotted hover:text-accent"
                >
                  {part.title ?? new URL(part.url).hostname}
                </a>
                ]
              </span>
            );
          }

          return null;
        })}
      </div>
      {hasContent && !isStreaming && (
        <div className="flex gap-2 mt-2">
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
            title="Like"
            aria-label="Like this response"
            className="rounded-lg"
          >
            <ThumbsUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Dislike"
            aria-label="Dislike this response"
            className="rounded-lg"
          >
            <ThumbsDown />
          </Button>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Regenerate"
              aria-label="Regenerate this response"
              className="rounded-lg"
              onClick={onRegenerate}
              disabled={status === "streaming" || status === "submitted"}
            >
              <RefreshCw />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

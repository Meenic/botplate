import type { UIMessage } from "ai";
import { ChevronDown } from "lucide-react";
import { Markdown } from "./markdown";

interface MessagePartProps {
  part: UIMessage["parts"][number];
  role: UIMessage["role"];
}

export function MessagePart({ part, role }: MessagePartProps) {
  if (part.type === "text") {
    return role === "assistant" ? (
      <Markdown content={part.text} />
    ) : (
      <p className="whitespace-pre-wrap wrap-break-word">{part.text}</p>
    );
  }

  if (part.type === "reasoning") {
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 select-none">
          <span className="text-sm font-medium text-muted-foreground">
            Reasoning
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word">
          {part.text}
        </div>
      </details>
    );
  }

  if (part.type === "step-start") {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[MessagePart] unhandled part type:",
      (part as { type: string }).type,
    );
  }

  return null;
}

import type { UIMessage } from "ai";
import { MessagePart } from "./message-part";

interface MessageAIProps {
  message: UIMessage;
  actions?: React.ReactNode;
}

export function MessageAI({ message, actions }: MessageAIProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="space-y-3">
          {message.parts.map((part, i) => (
            <MessagePart
              key={`${message.id}-${part.type}-${i}`}
              part={part}
              role={message.role}
            />
          ))}
        </div>
        {actions && <div className="mt-2 flex">{actions}</div>}
      </div>
    </div>
  );
}

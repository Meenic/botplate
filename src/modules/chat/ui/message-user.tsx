import type { UIMessage } from "ai";
import { MessagePart } from "./message-part";

interface MessageUserProps {
  message: UIMessage;
  actions?: React.ReactNode;
}

export function MessageUser({ message, actions }: MessageUserProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%]">
        <div className="rounded-4xl bg-secondary px-4 py-2.5">
          {message.parts.map((part, i) => (
            <MessagePart
              key={`${message.id}-${part.type}-${i}`}
              part={part}
              role={message.role}
            />
          ))}
        </div>
        {actions && <div className="mt-1 flex justify-end px-1">{actions}</div>}
      </div>
    </div>
  );
}

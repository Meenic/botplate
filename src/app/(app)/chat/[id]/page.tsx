import { Suspense, use } from "react";
import { getConversationMessages } from "@/modules/chat/application/queries/messages";
import { MessageList } from "@/modules/chat/ui/message-list";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-2xl">
        <Suspense fallback={<MessageListSkeleton />}>
          <ChatMessages params={params} />
        </Suspense>
      </div>
    </div>
  );
}

function ChatMessages({ params }: { params: Promise<{ id: string }> }) {
  const messages = use(getConversationMessages({ params }));
  return <MessageList initialMessages={messages} />;
}

function MessageListSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {/* AI bubble */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      {/* User bubble */}
      <div className="flex justify-end">
        <div className="max-w-[70%] space-y-2">
          <div className="h-4 w-48 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      {/* AI bubble */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

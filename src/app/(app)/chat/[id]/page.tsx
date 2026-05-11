import { Suspense, use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getConversationMessages } from "@/modules/chat/application/queries/messages";
import { MessageList } from "@/modules/chat/ui/message-list";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<MessageListSkeleton />}>
        <ChatMessages params={params} />
      </Suspense>
    </div>
  );
}

function ChatMessages({ params }: { params: Promise<{ id: string }> }) {
  const messages = use(getConversationMessages({ params }));
  return <MessageList initialMessages={messages} />;
}

function MessageListSkeleton() {
  return (
    <div className="px-4 sm:px-6" aria-hidden>
      <div className="mx-auto max-w-2xl py-6 space-y-6">
        {/* AI bubble */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-full" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
          </div>
        </div>

        {/* User bubble */}
        <div className="flex justify-end">
          <div className="max-w-[70%] space-y-2">
            <Skeleton className="h-4 w-48 rounded-full" />
          </div>
        </div>

        {/* AI bubble */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-5/6 rounded-full" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
            <Skeleton className="h-4 w-1/3 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

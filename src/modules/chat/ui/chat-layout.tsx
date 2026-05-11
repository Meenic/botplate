import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ChatLayout({ children, className }: ChatLayoutProps) {
  return <div className={cn("mx-auto max-w-2xl", className)}>{children}</div>;
}

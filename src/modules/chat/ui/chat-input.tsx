"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ChatStatus } from "ai";
import { ArrowUp, Square } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(500_000, "Message too long"),
});

type FormValues = z.infer<typeof formSchema>;

export interface ChatInputProps {
  status: ChatStatus;
  onSubmit: (message: string) => void;
  onStop?: () => void;
}

export function ChatInput({ status, onSubmit, onStop }: ChatInputProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const isDisabled = status !== "ready" || form.formState.isSubmitting;

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data.message);
    form.reset({ message: "" });
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline. Skip when an IME composition
    // is in progress (e.g. typing in Japanese, Chinese, Korean) — otherwise
    // committing a candidate sends the message.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Send a message">
      <Controller
        name="message"
        control={form.control}
        render={({ field }) => {
          const hasText = field.value.trim().length > 0;
          return (
            <InputGroup
              className={cn(
                "border-secondary-foreground/10 bg-secondary transition-colors",
                "hover:border-secondary-foreground/20",
                "has-[[data-slot=input-group-control]:focus-visible]:border-secondary-foreground/20!",
                "has-[[data-slot=input-group-control]:focus-visible]:ring-0!",
              )}
            >
              <InputGroupTextarea
                {...field}
                disabled={isDisabled}
                placeholder="Send a message..."
                className={cn(
                  "min-h-auto p-5 pb-0 text-base!",
                  "max-h-80 overflow-y-auto",
                )}
                rows={1}
                onKeyDown={handleKeyDown}
                aria-label="Message"
              />
              <InputGroupAddon align="block-end">
                {isStreaming ? (
                  <Button
                    key="stop"
                    type="button"
                    onClick={onStop}
                    disabled={!onStop}
                    size="icon"
                    className="ml-auto"
                    aria-label="Stop generating"
                  >
                    <Square className="fill-current" />
                  </Button>
                ) : (
                  <Button
                    key="send"
                    type="submit"
                    disabled={isDisabled || !hasText}
                    size="icon"
                    className="ml-auto"
                    aria-label="Send message"
                  >
                    <ArrowUp strokeWidth={3} />
                  </Button>
                )}
              </InputGroupAddon>
            </InputGroup>
          );
        }}
      />
    </form>
  );
}

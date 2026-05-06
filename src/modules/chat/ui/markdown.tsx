"use client";

import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Spacing constants
const SPACING = {
  block: "my-4",
  paragraph: "my-4",
  list: "my-3",
  heading1: "mt-6 mb-3",
  heading2: "mt-5 mb-2",
  heading3: "mt-4 mb-2",
  heading4: "mt-3 mb-2",
  heading5: "mt-3 mb-2",
  heading6: "mt-3 mb-2",
  divider: "my-6",
};

function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn(SPACING.block, "rounded-3xl border")}>
      <div className="flex items-center justify-between p-2">
        <span className="text-sm text-muted-foreground ml-2">
          {language || "text"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copy}
          aria-label="Copy code"
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 1.5rem 1.5rem",
          background: "transparent",
          fontSize: "14px",
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

const components: Components = {
  p: ({ className, ...props }) => (
    <p
      className={cn(SPACING.paragraph, "leading-relaxed", className)}
      {...props}
    />
  ),
  a: ({ className, children, href, ...props }) => {
    const isInternalAnchor = href?.startsWith("#");
    return (
      <a
        className={cn(
          "text-primary underline underline-offset-4 decoration-dotted hover:text-accent inline-flex items-center gap-0.5",
          className,
        )}
        href={href}
        target={isInternalAnchor ? undefined : "_blank"}
        rel={isInternalAnchor ? undefined : "noopener noreferrer"}
        {...props}
      >
        {children}
        {!isInternalAnchor && <ArrowUpRight className="h-3 w-3" />}
      </a>
    );
  },
  ul: ({ className, ...props }) => (
    <ul
      className={cn(SPACING.list, "list-disc space-y-1 pl-6", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(SPACING.list, "list-decimal space-y-1 pl-6", className)}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("leading-relaxed", className)} {...props} />
  ),
  h1: ({ className, ...props }) => (
    <h1
      className={cn(SPACING.heading1, "text-2xl font-semibold", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(SPACING.heading2, "text-xl font-semibold", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(SPACING.heading3, "text-lg font-semibold", className)}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(SPACING.heading4, "text-base font-semibold", className)}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(SPACING.heading5, "text-sm font-semibold", className)}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(SPACING.heading6, "text-xs font-semibold", className)}
      {...props}
    />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn("font-semibold", className)} {...props} />
  ),
  em: ({ className, ...props }) => (
    <em className={cn("italic", className)} {...props} />
  ),
  del: ({ className, ...props }) => (
    <del
      className={cn("line-through text-muted-foreground", className)}
      {...props}
    />
  ),
  img: ({ className, src, alt, ...props }) => (
    // biome-ignore lint/performance/noImgElement: Markdown component needs to support arbitrary external images
    <img
      className={cn("rounded-lg max-w-full h-auto", className)}
      src={src}
      alt={alt}
      {...props}
    />
  ),
  input: ({ className, type, checked, ...props }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className={cn(
            "mr-2 h-4 w-4 rounded border-border accent-primary",
            className,
          )}
          {...props}
        />
      );
    }
    return null;
  },
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(SPACING.block, "border-l-4 border-border pl-4", className)}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn(SPACING.divider, "border-border", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className={cn(SPACING.block, "overflow-x-auto rounded-lg border")}>
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn("bg-muted", className)} {...props} />
  ),
  tbody: ({ className, ...props }) => (
    <tbody
      className={cn(
        "[&_tr:nth-child(even)]:bg-muted/50 [&_tr:last-child_td]:border-b-0",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn("hover:bg-muted/80 transition-colors", className)}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border-b border-border px-4 py-3 text-left font-semibold",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn("border-b border-border px-4 py-3", className)}
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    const text = String(children ?? "").replace(/\n$/, "");

    // Block code (has language class or contains newlines)
    if (match || text.includes("\n")) {
      return <CodeBlock language={match?.[1] ?? ""}>{text}</CodeBlock>;
    }

    // Inline code
    return (
      <code
        className={cn(
          "rounded bg-muted px-1 py-px font-mono text-[0.875em] text-accent border-[0.5px]",
          className,
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

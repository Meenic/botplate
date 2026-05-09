"use client";

import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { syntaxTheme } from "@/lib/syntax-theme";
import { cn } from "@/lib/utils";

const SPACING = {
  block: "my-4",
  paragraph: "mt-0 mb-4",
  list: "my-3",
  heading1: "mt-6 mb-3",
  heading2: "mt-5 mb-2",
  heading3: "mt-4 mb-2",
  heading4: "mt-3",
  heading5: "mt-3",
  heading6: "mt-3",
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
    <div className={cn(SPACING.block, "rounded-3xl border overflow-hidden")}>
      <div className="flex items-center justify-between p-2">
        <span className="text-sm text-muted-foreground ml-3">
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
      <div>
        <SyntaxHighlighter
          language={language || "text"}
          style={syntaxTheme}
          customStyle={{
            margin: 0,
            padding: "0rem 1.25rem 0.75rem 1.25rem",
            borderRadius: 0,
            background: "transparent",
            fontSize: "12.25px",
            lineHeight: "1.7",
            overflowX: "auto",
            fontVariantLigatures: "none",
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

const components: Components = {
  p: ({ className, ...props }) => (
    <p
      className={cn(SPACING.paragraph, "wrap-break-word", className)}
      {...props}
    />
  ),
  a: ({ className, children, href, ...props }) => {
    const isInternal =
      href?.startsWith("#") ||
      href?.startsWith("/") ||
      href?.startsWith("./") ||
      href?.startsWith("../") ||
      href?.startsWith("mailto:") ||
      href?.startsWith("tel:");

    const isExternal = Boolean(href && !isInternal);

    return (
      <a
        className={cn(
          "text-primary underline underline-offset-4 decoration-dotted transition-colors hover:text-accent visited:text-muted-foreground",
          "wrap-anywhere",
          className,
        )}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
        {isExternal && <ArrowUpRight className="m-0.5 inline-block h-4 w-4" />}
      </a>
    );
  },
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        SPACING.list,
        "list-disc space-y-1 pl-6 [&.contains-task-list]:list-none",
        className,
      )}
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
    <li
      className={cn(
        "wrap-break-word leading-relaxed [&>input[type='checkbox']]:mr-2 [&>input[type='checkbox']]:mt-0.5 [&>input[type='checkbox']]:align-top",
        className,
      )}
      {...props}
    />
  ),
  h1: ({ className, ...props }) => (
    <h1
      className={cn(SPACING.heading1, "text-2xl font-medium", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(SPACING.heading2, "text-xl font-medium", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(SPACING.heading3, "text-lg font-medium", className)}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(SPACING.heading4, "text-base font-medium", className)}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(SPACING.heading5, "text-sm font-medium", className)}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(SPACING.heading6, "text-xs font-medium", className)}
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
      className={cn("text-muted-foreground line-through", className)}
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
          disabled
          readOnly
          className={cn(
            "h-4 w-4 shrink-0 rounded border-border accent-primary",
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
      className={cn("transition-colors hover:bg-muted/80", className)}
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

    if (match || text.includes("\n")) {
      return <CodeBlock language={match?.[1] ?? ""}>{text}</CodeBlock>;
    }

    return (
      <code
        className={cn(
          "rounded-md border border-border/70 bg-muted/80 px-[0.3rem] py-[0.05rem] font-mono text-[0.875em] text-accent",
          className,
        )}
        style={{
          fontVariantLigatures: "none",
          fontFeatureSettings: '"liga" 0, "calt" 0',
        }}
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
    <div
      className={cn(
        "selection:bg-accent/30 selection:text-foreground",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

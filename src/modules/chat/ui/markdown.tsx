"use client";

import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { syntaxTheme } from "./syntax-theme";

const SPACING = {
  block: "mb-4",
  heading: "mb-2",
  headingTop: "mt-6",
  list: "mb-4",
  listItem: "mb-1",
  hr: "my-6",
} as const;

export function CodeBlock({
  language,
  children,
  className,
}: {
  language: string;
  children: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1696);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-3xl bg-muted",
        SPACING.block,
        "last:mb-0",
        className,
      )}
    >
      {/* Header: language label + copy button */}
      <div className="sticky top-0 z-10 rounded-3xl flex items-center justify-between bg-muted p-2">
        <span className="font-mono text-xs text-muted-foreground select-none ml-3">
          {language}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>

      {/* Scrollable code body */}
      <div className="overflow-hidden rounded-b-3xl">
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          PreTag="div"
          customStyle={{
            background: "none",
            padding: "0rem 1.25rem 0.75rem 1.25rem",
            margin: 0,
            fontSize: "0.750rem",
            lineHeight: "1.7",
            overflowX: "auto",
            fontVariantLigatures: "none",
          }}
          codeTagProps={{
            style: { fontFamily: "var(--font-mono, monospace)" },
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// react markdown components
const components: Components = {
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "wrap-break-word leading-7 text-foreground",
        SPACING.block,
        "last:mb-0",
        className,
      )}
      {...props}
    />
  ),

  // Headings
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "scroll-m-20 text-2xl font-medium tracking-tight",
        SPACING.headingTop,
        SPACING.heading,
        "first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "scroll-m-20 text-xl font-medium tracking-tight",
        SPACING.headingTop,
        SPACING.heading,
        "first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "scroll-m-20 text-lg font-medium tracking-tight",
        SPACING.headingTop,
        SPACING.heading,
        "first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "scroll-m-20 text-base font-medium tracking-tight",
        SPACING.headingTop,
        SPACING.heading,
        "first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "scroll-m-20 text-sm font-medium tracking-tight",
        SPACING.headingTop,
        SPACING.heading,
        "first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "scroll-m-20 text-xs font-medium tracking-tight text-muted-foreground",
        SPACING.headingTop,
        SPACING.heading,
        "first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),

  // Lists
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "list-disc pl-6",
        SPACING.list,
        "last:mb-0",
        "[&_ul]:mt-1 [&_ul]:mb-1 [&_ol]:mt-1 [&_ol]:mb-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "list-decimal pl-6",
        SPACING.list,
        "last:mb-0",
        "[&_ul]:mt-1 [&_ul]:mb-1 [&_ol]:mt-1 [&_ol]:mb-1",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li
      className={cn(
        "leading-7",
        SPACING.listItem,
        "last:mb-0",
        "[&>p]:mb-1 [&>p:last-child]:mb-0",
        className,
      )}
      {...props}
    />
  ),

  // Inline text
  strong: ({ className, ...props }) => (
    <strong className={cn("font-medium", className)} {...props} />
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

  // Links
  a: ({ className, href, children, ...props }) => {
    const isExternal =
      typeof href === "string" &&
      (href.startsWith("http://") || href.startsWith("https://"));

    return (
      <a
        href={href}
        className={cn(
          "items-baseline gap-0.5 font-medium underline underline-offset-3",
          "decoration-dotted hover:text-accent transition-colors",
          "wrap-anywhere",
          className,
        )}
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        {...props}
      >
        {children}
        {isExternal && (
          <ArrowUpRight
            className="ml-0.5 inline h-3.5 w-3.5 shrink-0 self-center"
            aria-hidden
          />
        )}
      </a>
    );
  },

  // Code
  // Fenced code blocks delegate to <CodeBlock>.
  // The `pre` override is neutralised so CodeBlock controls its own container.
  // Inline code keeps a simple pill style.
  pre: ({ children }) => <>{children}</>,

  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className ?? "");
    const content = String(children);
    const isBlock = content.includes("\n");

    if (match) {
      return (
        <CodeBlock language={match[1]}>{content.replace(/\n$/, "")}</CodeBlock>
      );
    }

    if (isBlock) {
      return (
        <CodeBlock language="text">{content.replace(/\n$/, "")}</CodeBlock>
      );
    }

    return (
      <code
        className={cn(
          "rounded-sm bg-muted px-[0.35em] py-[0.15em]",
          "font-mono text-[0.875em] text-foreground",
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

  // Blockquote
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "relative pl-4",
        "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-border",
        SPACING.block,
        "last:mb-0",
        "[&>p]:mb-0",
        className,
      )}
      {...props}
    />
  ),

  // Horizontal rule
  hr: ({ className, ...props }) => (
    <hr className={cn("border-border", SPACING.hr, className)} {...props} />
  ),

  // Tables
  table: ({ className, ...props }) => (
    <div className={cn("w-full overflow-x-auto", SPACING.block, "last:mb-0")}>
      <table
        className={cn(
          "w-full border-collapse text-sm rounded-lg overflow-hidden",
          className,
        )}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn("border-b border-border", className)} {...props} />
  ),
  tbody: ({ className, ...props }) => (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/40",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "px-4 py-2.5 text-left font-medium text-foreground first:rounded-tl-lg last:rounded-tr-lg",
        "[[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "px-4 py-2.5 text-muted-foreground",
        "[[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),

  // Images
  img: ({ className, alt, ...props }) => (
    // biome-ignore lint/performance/noImgElement: intentional inside markdown
    <img
      className={cn("rounded-md", SPACING.block, "last:mb-0", className)}
      loading="lazy"
      alt={alt}
      {...props}
    />
  ),
};

// Markdown
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
        "[&>*:first-child]:mt-0",
        "[&>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

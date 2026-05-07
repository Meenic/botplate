import type { CSSProperties } from "react";

type SyntaxTheme = Record<string, CSSProperties>;

export const syntaxTheme: SyntaxTheme = {
  'code[class*="language-"]': {
    color: "var(--syntax-base)",
    background: "transparent",
  },
  'pre[class*="language-"]': {
    background: "transparent",
  },
  comment: { color: "var(--syntax-comment)", fontStyle: "italic" },
  prolog: { color: "var(--syntax-comment)" },
  doctype: { color: "var(--syntax-comment)" },
  cdata: { color: "var(--syntax-comment)" },
  punctuation: { color: "var(--syntax-punctuation)" },
  property: { color: "var(--syntax-property)" },
  keyword: { color: "var(--syntax-keyword)" },
  tag: { color: "var(--syntax-tag)" },
  "attr-name": { color: "var(--syntax-attr-name)" },
  boolean: { color: "var(--syntax-number)" },
  number: { color: "var(--syntax-number)" },
  constant: { color: "var(--syntax-number)" },
  string: { color: "var(--syntax-string)" },
  char: { color: "var(--syntax-string)" },
  "attr-value": { color: "var(--syntax-string)" },
  inserted: { color: "var(--syntax-string)" },
  selector: { color: "var(--syntax-string)" },
  function: { color: "var(--syntax-function)" },
  "class-name": { color: "var(--syntax-class-name)" },
  builtin: { color: "var(--syntax-class-name)" },
  atrule: { color: "var(--syntax-keyword)" },
  operator: { color: "var(--syntax-operator)" },
  variable: { color: "var(--syntax-variable)" },
  regex: { color: "var(--syntax-regex)" },
  important: { color: "var(--syntax-important)", fontWeight: "bold" },
  deleted: { color: "var(--syntax-deleted)" },
  symbol: { color: "var(--syntax-number)" },
  namespace: { opacity: "0.7" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
};

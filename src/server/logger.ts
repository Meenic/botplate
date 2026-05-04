import { env } from "@/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel = env.NODE_ENV === "production" ? "info" : "debug";

function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;
  const payload = {
    level,
    time: new Date().toISOString(),
    msg,
    ...(meta ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) =>
    emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    emit("error", msg, meta),
  child: (bindings: Record<string, unknown>) => ({
    debug: (msg: string, meta?: Record<string, unknown>) =>
      emit("debug", msg, { ...bindings, ...meta }),
    info: (msg: string, meta?: Record<string, unknown>) =>
      emit("info", msg, { ...bindings, ...meta }),
    warn: (msg: string, meta?: Record<string, unknown>) =>
      emit("warn", msg, { ...bindings, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) =>
      emit("error", msg, { ...bindings, ...meta }),
  }),
};

export type Logger = typeof logger;

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be set"),
  BETTER_AUTH_URL: z.url(),

  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),

  NEXT_PUBLIC_APP_URL: z.url(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [
    anonymous({
      // Phase 4 hook: when an anonymous user signs up with email/OAuth,
      // reparent conversations.user_id from anonymousUser.id to newUser.id.
      onLinkAccount: async ({ anonymousUser: _a, newUser: _n }) => {
        // TODO(phase 4): UPDATE conversations SET user_id = newUser.id
        //                WHERE user_id = anonymousUser.id;
      },
    }),
    nextCookies(),
  ],
});

import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";

// Look for .env in current directory, parent (monorepo root), or ../..
const possibleEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
  path.resolve(process.cwd(), "..", "..", ".env"),
];
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8787),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DATA_MODE: z.enum(["mock", "live"]).default("mock"),
  GITHUB_TOKEN: z.string().optional().default(""),
  GITHUB_USER: z.string().default("alex-dev"),
  GITHUB_REPOS: z
    .string()
    .default("acme/payments-platform,acme/web-dashboard")
    .transform((val) =>
      val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  LIVE_WRITES: z
    .string()
    .default("false")
    .transform((val) => val === "true" || val === "1"),
  BEDROCK_MODE: z.enum(["mock", "live"]).default("mock"),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_SESSION_TOKEN: z.string().optional().default(""),
  BEDROCK_MODEL_ID: z.string().default("us.amazon.nova-lite-v1:0"),
  STALE_REVIEW_HOURS: z.coerce.number().default(24),
});

export type Config = z.infer<typeof EnvSchema>;

let parsedConfig: Config;
try {
  parsedConfig = EnvSchema.parse(process.env);
} catch (error) {
  console.warn("⚠️ Invalid environment variables, falling back to safe defaults:", error);
  parsedConfig = EnvSchema.parse({});
}

export const config = parsedConfig;

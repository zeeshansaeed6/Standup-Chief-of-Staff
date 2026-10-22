import { z } from "zod";

// --- CI Status ---
export const CiStatusSchema = z.enum(["success", "failure", "pending", "unknown"]);
export type CiStatus = z.infer<typeof CiStatusSchema>;

// --- Blocker Type ---
export const BlockerTypeSchema = z.enum(["pr", "issue", "review_request"]);
export type BlockerType = z.infer<typeof BlockerTypeSchema>;

// --- Blocker ---
export const BlockerSchema = z.object({
  id: z.string(),
  type: BlockerTypeSchema,
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
  priorityScore: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  waitingOn: z.array(z.string()),
  ageHours: z.number(),
  ciStatus: CiStatusSchema,
});
export type Blocker = z.infer<typeof BlockerSchema>;

// --- Pull Request ---
export const PrFileChangeSchema = z.object({
  path: z.string(),
  additions: z.number(),
  deletions: z.number(),
});
export type PrFileChange = z.infer<typeof PrFileChangeSchema>;

export const PrCommentSchema = z.object({
  author: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type PrComment = z.infer<typeof PrCommentSchema>;

export const PullRequestSchema = z.object({
  id: z.string(),
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
  author: z.string(),
  assignees: z.array(z.string()),
  requestedReviewers: z.array(z.string()),
  reviewDecision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED", "NONE"]),
  ciStatus: CiStatusSchema,
  hasConflicts: z.boolean(),
  labels: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  filesChanged: z.array(PrFileChangeSchema),
  commentsCount: z.number(),
  recentComments: z.array(PrCommentSchema),
});
export type PullRequest = z.infer<typeof PullRequestSchema>;

// --- Issue ---
export const IssueSchema = z.object({
  id: z.string(),
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
  author: z.string(),
  assignees: z.array(z.string()),
  labels: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  isOverdue: z.boolean(),
  dueDate: z.string().optional(),
  blockedWaitingOnMe: z.boolean().optional(),
});
export type Issue = z.infer<typeof IssueSchema>;

// --- Bedrock Re-ranking & Briefing Schemas ---
export const RankedItemSchema = z.object({
  id: z.string(),
  rank: z.number(),
  whyItMatters: z.string(),
});
export type RankedItem = z.infer<typeof RankedItemSchema>;

export const BedrockRankingResponseSchema = z.object({
  ranked: z.array(RankedItemSchema),
  oneLineSummary: z.string(),
});
export type BedrockRankingResponse = z.infer<typeof BedrockRankingResponseSchema>;

export const BedrockPrSummaryResponseSchema = z.object({
  summary: z.string(),
  risk: z.enum(["low", "medium", "high"]),
  blockingFactors: z.array(z.string()),
  suggestedNextStep: z.string(),
  spoken: z.string(),
});
export type BedrockPrSummaryResponse = z.infer<typeof BedrockPrSummaryResponseSchema>;

// --- Confirmation Preview ---
export const ConfirmationPreviewSchema = z.object({
  action: z.enum(["nudge_reviewer", "snooze_issue"]),
  target: z.string(),
  draftMessage: z.string(),
});
export type ConfirmationPreview = z.infer<typeof ConfirmationPreviewSchema>;

// --- Tool Inputs ---
export const GetBlockersInputSchema = z.object({
  repos: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(10).default(5).optional(),
  includeSnoozed: z.boolean().default(false).optional(),
});
export type GetBlockersInput = z.infer<typeof GetBlockersInputSchema>;

export const SummarizePrInputSchema = z.object({
  repo: z.string(),
  number: z.number().int(),
});
export type SummarizePrInput = z.infer<typeof SummarizePrInputSchema>;

export const NudgeReviewerInputSchema = z.object({
  repo: z.string(),
  number: z.number().int(),
  reviewer: z.string(),
  tone: z.enum(["friendly", "firm", "urgent"]).default("friendly").optional(),
  confirm: z.boolean().default(false).optional(),
  confirmationId: z.string().optional(),
});
export type NudgeReviewerInput = z.infer<typeof NudgeReviewerInputSchema>;

export const SnoozeIssueInputSchema = z.object({
  repo: z.string(),
  issueNumber: z.number().int(),
  until: z.string(),
  confirm: z.boolean().default(false).optional(),
  confirmationId: z.string().optional(),
});
export type SnoozeIssueInput = z.infer<typeof SnoozeIssueInputSchema>;

// --- Tool Output Schemas ---
export const GetBlockersResultSchema = z.object({
  blockers: z.array(BlockerSchema),
  briefing: z.string(),
  generatedBy: z.enum(["bedrock", "fallback"]),
  degraded: z.string().optional(),
});
export type GetBlockersResult = z.infer<typeof GetBlockersResultSchema>;

export const SummarizePrResultSchema = z.object({
  pr: PullRequestSchema,
  summary: z.string(),
  risk: z.enum(["low", "medium", "high"]),
  blockingFactors: z.array(z.string()),
  suggestedNextStep: z.string(),
  spoken: z.string(),
  generatedBy: z.enum(["bedrock", "fallback"]).optional(),
  degraded: z.string().optional(),
});
export type SummarizePrResult = z.infer<typeof SummarizePrResultSchema>;

export const NudgeReviewerResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("needs_confirmation"),
    confirmationId: z.string(),
    preview: ConfirmationPreviewSchema,
    spoken: z.string(),
  }),
  z.object({
    status: z.literal("sent"),
    confirmationId: z.string().optional(),
    simulated: z.boolean(),
    spoken: z.string(),
    degraded: z.string().optional(),
  }),
]);
export type NudgeReviewerResult = z.infer<typeof NudgeReviewerResultSchema>;

export const SnoozeIssueResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("needs_confirmation"),
    confirmationId: z.string(),
    preview: ConfirmationPreviewSchema,
    until: z.string(),
    spoken: z.string(),
  }),
  z.object({
    status: z.literal("snoozed"),
    confirmationId: z.string().optional(),
    simulated: z.boolean(),
    until: z.string(),
    spoken: z.string(),
    degraded: z.string().optional(),
  }),
]);
export type SnoozeIssueResult = z.infer<typeof SnoozeIssueResultSchema>;

// --- Health Response ---
export const HealthResponseSchema = z.object({
  status: z.string(),
  dataMode: z.enum(["mock", "live"]),
  bedrockMode: z.enum(["mock", "live"]),
  version: z.string(),
  degraded: z.string().optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

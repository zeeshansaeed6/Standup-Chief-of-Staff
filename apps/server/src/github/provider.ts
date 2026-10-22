import type { PullRequest, Issue } from "@standup/shared";

export interface GitHubProvider {
  listAssignedWork(repos?: string[]): Promise<{
    pullRequests: PullRequest[];
    issues: Issue[];
  }>;
  getPullRequest(repo: string, number: number): Promise<PullRequest | null>;
  getReviewRequests(repos?: string[]): Promise<PullRequest[]>;
  commentOnPullRequest(
    repo: string,
    number: number,
    body: string
  ): Promise<{ id: number | string; url: string; simulated?: boolean }>;
  addLabelAndComment(
    repo: string,
    number: number,
    label: string,
    comment: string
  ): Promise<{ simulated?: boolean }>;
}

import type { PullRequest, Issue } from "@standup/shared";
import type { GitHubProvider } from "./provider.js";
import { RAW_PULL_REQUESTS, RAW_ISSUES } from "../fixtures/teamData.js";

export class MockProvider implements GitHubProvider {
  private currentUser: string;

  constructor(currentUser: string = "alex-dev") {
    this.currentUser = currentUser.toLowerCase();
  }

  private resolvePullRequests(): PullRequest[] {
    const now = Date.now();
    return RAW_PULL_REQUESTS.map((raw) => ({
      id: raw.id,
      repo: raw.repo,
      number: raw.number,
      title: raw.title,
      url: raw.url,
      author: raw.author,
      assignees: raw.assignees,
      requestedReviewers: raw.requestedReviewers,
      reviewDecision: raw.reviewDecision,
      ciStatus: raw.ciStatus,
      hasConflicts: raw.hasConflicts,
      labels: raw.labels,
      createdAt: new Date(now - raw.hoursAgo * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - raw.updatedHoursAgo * 3600 * 1000).toISOString(),
      filesChanged: raw.filesChanged,
      commentsCount: raw.commentsCount,
      recentComments: raw.recentComments.map((c) => ({
        author: c.author,
        body: c.body,
        createdAt: new Date(now - c.hoursAgo * 3600 * 1000).toISOString(),
      })),
    }));
  }

  private resolveIssues(): Issue[] {
    const now = Date.now();
    return RAW_ISSUES.map((raw) => {
      let dueDate: string | undefined = undefined;
      if (raw.dueHoursAgo !== undefined) {
        // if dueHoursAgo is positive, due in the past; if negative, due in the future
        dueDate = new Date(now - raw.dueHoursAgo * 3600 * 1000).toISOString();
      }
      return {
        id: raw.id,
        repo: raw.repo,
        number: raw.number,
        title: raw.title,
        url: raw.url,
        author: raw.author,
        assignees: raw.assignees,
        labels: raw.labels,
        createdAt: new Date(now - raw.hoursAgo * 3600 * 1000).toISOString(),
        updatedAt: new Date(now - raw.updatedHoursAgo * 3600 * 1000).toISOString(),
        isOverdue: raw.isOverdue,
        dueDate,
        blockedWaitingOnMe: raw.blockedWaitingOnMe,
      };
    });
  }

  public async listAssignedWork(repos?: string[]): Promise<{
    pullRequests: PullRequest[];
    issues: Issue[];
  }> {
    const allPrs = this.resolvePullRequests();
    const allIssues = this.resolveIssues();

    const filterRepos = (r: string) => (!repos || repos.length === 0 || repos.includes(r));

    const isMe = (user?: string) => {
      if (!user) return false;
      const u = user.toLowerCase();
      return u === this.currentUser || u === "alex-dev";
    };

    const prs = allPrs.filter((p) => {
      if (!filterRepos(p.repo)) return false;
      const isAuthor = isMe(p.author);
      const isAssignee = p.assignees.some(isMe);
      const isReviewer = p.requestedReviewers.some(isMe);
      return isAuthor || isAssignee || isReviewer;
    });

    const issues = allIssues.filter((i) => {
      if (!filterRepos(i.repo)) return false;
      const isAssignee = i.assignees.some(isMe);
      const isBlocked = !!i.blockedWaitingOnMe;
      return isAssignee || isBlocked;
    });

    return { pullRequests: prs, issues };
  }

  public async getPullRequest(repo: string, number: number): Promise<PullRequest | null> {
    const allPrs = this.resolvePullRequests();
    const match = allPrs.find(
      (p) => p.repo.toLowerCase() === repo.toLowerCase() && p.number === number
    );
    return match || null;
  }

  public async getReviewRequests(repos?: string[]): Promise<PullRequest[]> {
    const allPrs = this.resolvePullRequests();
    return allPrs.filter((p) => {
      if (repos && repos.length > 0 && !repos.includes(p.repo)) return false;
      return p.requestedReviewers.some((r) => {
        const u = r.toLowerCase();
        return u === this.currentUser || u === "alex-dev";
      });
    });
  }

  public async commentOnPullRequest(
    repo: string,
    number: number,
    body: string
  ): Promise<{ id: number | string; url: string; simulated: boolean }> {
    console.log(`[MockProvider] Simulated comment on ${repo}#${number}: "${body.slice(0, 60)}..."`);
    return {
      id: Math.floor(Math.random() * 100000),
      url: `https://github.com/${repo}/pull/${number}#issuecomment-simulated`,
      simulated: true,
    };
  }

  public async addLabelAndComment(
    repo: string,
    number: number,
    label: string,
    comment: string
  ): Promise<{ simulated: boolean }> {
    console.log(`[MockProvider] Simulated label [${label}] & comment on ${repo}#${number}: "${comment}"`);
    return { simulated: true };
  }
}

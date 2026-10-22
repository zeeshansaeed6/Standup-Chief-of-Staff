import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import type { PullRequest, Issue, CiStatus } from "@standup/shared";
import type { GitHubProvider } from "./provider.js";
import { MockProvider } from "./mockProvider.js";
import { PR_QUERY, ISSUES_QUERY } from "./graphql.js";
import { config } from "../config.js";

export class LiveGitHubProvider implements GitHubProvider {
  private octokit: Octokit;
  private graphqlWithAuth: typeof graphql;
  private currentUser: string;
  private mockFallback: MockProvider;

  constructor(token: string, currentUser: string) {
    this.octokit = new Octokit({ auth: token });
    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });
    this.currentUser = currentUser.toLowerCase();
    this.mockFallback = new MockProvider(currentUser);
  }

  public async listAssignedWork(repos?: string[]): Promise<{
    pullRequests: PullRequest[];
    issues: Issue[];
  }> {
    const targetRepos = repos && repos.length > 0 ? repos : config.GITHUB_REPOS;
    const allPrs: PullRequest[] = [];
    const allIssues: Issue[] = [];

    for (const repoSlug of targetRepos) {
      const [owner, name] = repoSlug.split("/");
      if (!owner || !name) continue;

      try {
        const prData: any = await this.graphqlWithAuth(PR_QUERY, { owner, name });
        const prNodes = prData?.repository?.pullRequests?.nodes || [];

        for (const node of prNodes) {
          const author = node.author?.login || "unknown";
          const assignees = (node.assignees?.nodes || []).map((a: any) => a.login);
          const requestedReviewers = (node.reviewRequests?.nodes || [])
            .map((r: any) => r.requestedReviewer?.login)
            .filter(Boolean);

          const isAuthor = author.toLowerCase() === this.currentUser;
          const isAssignee = assignees.some((a: string) => a.toLowerCase() === this.currentUser);
          const isReviewer = requestedReviewers.some((r: string) => r.toLowerCase() === this.currentUser);

          if (!isAuthor && !isAssignee && !isReviewer) continue;

          let ciStatus: CiStatus = "unknown";
          const rollupState = node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state;
          if (rollupState === "SUCCESS") ciStatus = "success";
          else if (rollupState === "FAILURE" || rollupState === "ERROR") ciStatus = "failure";
          else if (rollupState === "PENDING" || rollupState === "EXPECTED") ciStatus = "pending";

          allPrs.push({
            id: node.id || `pr_${node.number}`,
            repo: repoSlug,
            number: node.number,
            title: node.title,
            url: node.url,
            author,
            assignees,
            requestedReviewers,
            reviewDecision: node.reviewDecision || "NONE",
            ciStatus,
            hasConflicts: node.mergeable === "CONFLICTING",
            labels: (node.labels?.nodes || []).map((l: any) => l.name),
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            filesChanged: (node.files?.nodes || []).map((f: any) => ({
              path: f.path,
              additions: f.additions,
              deletions: f.deletions,
            })),
            commentsCount: node.comments?.totalCount || 0,
            recentComments: (node.comments?.nodes || []).map((c: any) => ({
              author: c.author?.login || "unknown",
              body: c.body || "",
              createdAt: c.createdAt,
            })),
          });
        }

        const issuesData: any = await this.graphqlWithAuth(ISSUES_QUERY, { owner, name });
        const issueNodes = issuesData?.repository?.issues?.nodes || [];

        for (const node of issueNodes) {
          const assignees = (node.assignees?.nodes || []).map((a: any) => a.login);
          const isAssignee = assignees.some((a: string) => a.toLowerCase() === this.currentUser);
          const labels = (node.labels?.nodes || []).map((l: any) => l.name);

          if (!isAssignee) continue;

          allIssues.push({
            id: node.id || `issue_${node.number}`,
            repo: repoSlug,
            number: node.number,
            title: node.title,
            url: node.url,
            author: node.author?.login || "unknown",
            assignees,
            labels,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            isOverdue: false,
          });
        }
      } catch (err) {
        console.warn(`[LiveGitHubProvider] Failed to fetch live data for ${repoSlug}, falling back to mock:`, err);
        const fallbackData = await this.mockFallback.listAssignedWork([repoSlug]);
        allPrs.push(...fallbackData.pullRequests);
        allIssues.push(...fallbackData.issues);
      }
    }

    return { pullRequests: allPrs, issues: allIssues };
  }

  public async getPullRequest(repo: string, number: number): Promise<PullRequest | null> {
    if (repo.startsWith("acme/")) {
      return this.mockFallback.getPullRequest(repo, number);
    }
    const [owner, name] = repo.split("/");
    if (!owner || !name) return null;

    try {
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo: name,
        pull_number: number,
      });

      const { data: files } = await this.octokit.pulls.listFiles({
        owner,
        repo: name,
        pull_number: number,
      });

      const { data: comments } = await this.octokit.issues.listComments({
        owner,
        repo: name,
        issue_number: number,
        per_page: 5,
      });

      return {
        id: String(pr.id),
        repo,
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        author: pr.user?.login || "unknown",
        assignees: (pr.assignees || []).map((a) => a.login),
        requestedReviewers: (pr.requested_reviewers || []).map((r: any) => r.login),
        reviewDecision: "REVIEW_REQUIRED",
        ciStatus: "unknown",
        hasConflicts: pr.mergeable === false,
        labels: pr.labels.map((l) => l.name),
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        filesChanged: files.map((f) => ({
          path: f.filename,
          additions: f.additions,
          deletions: f.deletions,
        })),
        commentsCount: pr.comments,
        recentComments: comments.map((c) => ({
          author: c.user?.login || "unknown",
          body: c.body || "",
          createdAt: c.created_at,
        })),
      };
    } catch (err) {
      console.warn(`[LiveGitHubProvider] Failed to fetch PR ${repo}#${number}, using mock fallback:`, err);
      return this.mockFallback.getPullRequest(repo, number);
    }
  }

  public async getReviewRequests(repos?: string[]): Promise<PullRequest[]> {
    const { pullRequests } = await this.listAssignedWork(repos);
    return pullRequests.filter((p) =>
      p.requestedReviewers.some((r) => r.toLowerCase() === this.currentUser)
    );
  }

  public async commentOnPullRequest(
    repo: string,
    number: number,
    body: string
  ): Promise<{ id: number | string; url: string; simulated?: boolean }> {
    if (!config.LIVE_WRITES || repo.startsWith("acme/")) {
      return this.mockFallback.commentOnPullRequest(repo, number, body);
    }

    try {
      const [owner, name] = repo.split("/");
      const { data: comment } = await this.octokit.issues.createComment({
        owner,
        repo: name,
        issue_number: number,
        body,
      });

      return {
        id: comment.id,
        url: comment.html_url,
        simulated: false,
      };
    } catch (err) {
      console.warn(`[LiveGitHubProvider] Error commenting on ${repo}#${number}, falling back to simulation:`, err);
      return this.mockFallback.commentOnPullRequest(repo, number, body);
    }
  }

  public async addLabelAndComment(
    repo: string,
    number: number,
    label: string,
    comment: string
  ): Promise<{ simulated?: boolean }> {
    if (!config.LIVE_WRITES || repo.startsWith("acme/")) {
      return this.mockFallback.addLabelAndComment(repo, number, label, comment);
    }

    try {
      const [owner, name] = repo.split("/");
      await this.octokit.issues.addLabels({
        owner,
        repo: name,
        issue_number: number,
        labels: [label],
      });

      await this.octokit.issues.createComment({
        owner,
        repo: name,
        issue_number: number,
        body: comment,
      });

      return { simulated: false };
    } catch (err) {
      console.warn(`[LiveGitHubProvider] Error snoozing ${repo}#${number}, falling back to simulation:`, err);
      return this.mockFallback.addLabelAndComment(repo, number, label, comment);
    }
  }
}

export function createGitHubProvider(forceMock: boolean = false): { provider: GitHubProvider; degraded?: string } {
  if (forceMock) {
    return {
      provider: new MockProvider(config.GITHUB_USER),
      degraded: "Demo board (Acme Payments fixtures)",
    };
  }
  if (config.DATA_MODE === "live") {
    if (!config.GITHUB_TOKEN) {
      console.warn("⚠️ DATA_MODE=live requested, but GITHUB_TOKEN is empty. Gracefully degrading to MockProvider.");
      return {
        provider: new MockProvider(config.GITHUB_USER),
        degraded: "GITHUB_TOKEN missing; serving offline fixtures",
      };
    }
    return {
      provider: new LiveGitHubProvider(config.GITHUB_TOKEN, config.GITHUB_USER),
    };
  }
  return {
    provider: new MockProvider(config.GITHUB_USER),
  };
}

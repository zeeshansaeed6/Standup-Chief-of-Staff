import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface SnoozeRecord {
  key: string; // `${repo}#${issueNumber}`
  repo: string;
  issueNumber: number;
  until: string; // ISO string
  createdAt: string;
}

export interface NudgeRecord {
  confirmationId?: string;
  repo: string;
  number: number;
  reviewer: string;
  tone: string;
  draftMessage: string;
  timestamp: string;
  simulated: boolean;
  confirmed: boolean;
}

export interface PendingConfirmation {
  id: string;
  action: "nudge_reviewer" | "snooze_issue";
  target: string;
  payload: Record<string, unknown>;
  draftMessage: string;
  createdAt: number;
  expiresAt: number;
}

interface StateData {
  snoozes: Record<string, SnoozeRecord>;
  nudges: NudgeRecord[];
}

export class LocalStateStore {
  private filePath: string;
  private state: StateData = { snoozes: {}, nudges: [] };
  private pendingConfirmations: Map<string, PendingConfirmation> = new Map();
  private CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(customPath?: string) {
    this.filePath =
      customPath ||
      path.resolve(process.cwd(), ".state", "standup-state.json");
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          this.state = {
            snoozes: parsed.snoozes || {},
            nudges: parsed.nudges || [],
          };
        }
      }
    } catch (err) {
      console.warn("⚠️ Could not load local state from disk, using in-memory:", err);
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.warn("⚠️ Could not persist local state to disk, kept in-memory:", err);
    }
  }

  // --- Confirmations ---
  public createConfirmation(
    action: "nudge_reviewer" | "snooze_issue",
    target: string,
    payload: Record<string, unknown>,
    draftMessage: string
  ): PendingConfirmation {
    this.cleanExpiredConfirmations();
    const id = `conf_${crypto.randomBytes(6).toString("hex")}`;
    const now = Date.now();
    const record: PendingConfirmation = {
      id,
      action,
      target,
      payload,
      draftMessage,
      createdAt: now,
      expiresAt: now + this.CONFIRMATION_TTL_MS,
    };
    this.pendingConfirmations.set(id, record);
    return record;
  }

  public getConfirmation(id: string): PendingConfirmation | undefined {
    this.cleanExpiredConfirmations();
    return this.pendingConfirmations.get(id);
  }

  public consumeConfirmation(id: string): PendingConfirmation | undefined {
    this.cleanExpiredConfirmations();
    const conf = this.pendingConfirmations.get(id);
    if (conf) {
      this.pendingConfirmations.delete(id);
    }
    return conf;
  }

  private cleanExpiredConfirmations(): void {
    const now = Date.now();
    for (const [id, conf] of this.pendingConfirmations.entries()) {
      if (conf.expiresAt < now) {
        this.pendingConfirmations.delete(id);
      }
    }
  }

  // --- Snoozes ---
  public snoozeIssue(repo: string, issueNumber: number, untilIso: string): void {
    const key = `${repo}#${issueNumber}`.toLowerCase();
    this.state.snoozes[key] = {
      key,
      repo,
      issueNumber,
      until: untilIso,
      createdAt: new Date().toISOString(),
    };
    this.persist();
  }

  public isIssueSnoozed(repo: string, issueNumber: number): boolean {
    const key = `${repo}#${issueNumber}`.toLowerCase();
    const record = this.state.snoozes[key];
    if (!record) return false;

    const untilDate = new Date(record.until).getTime();
    if (isNaN(untilDate)) return false;

    if (Date.now() < untilDate) {
      return true;
    } else {
      // Expired snooze
      delete this.state.snoozes[key];
      this.persist();
      return false;
    }
  }

  public getSnoozes(): SnoozeRecord[] {
    return Object.values(this.state.snoozes);
  }

  // --- Nudges ---
  public recordNudge(nudge: NudgeRecord): void {
    this.state.nudges.push(nudge);
    this.persist();
  }

  public getNudges(): NudgeRecord[] {
    return [...this.state.nudges];
  }

  public clear(): void {
    this.state = { snoozes: {}, nudges: [] };
    this.pendingConfirmations.clear();
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch {}
  }
}

export const localState = new LocalStateStore();

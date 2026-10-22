# 90-Second Demo Script: Standup Chief of Staff

This demo demonstrates the developer experience asking Alexa+ for their daily standup blockers and taking immediate voice action. Everything runs 100% offline in mock mode with zero credentials.

---

## Pre-Flight Check (10 Seconds)
1. In terminal:
   ```bash
   npm run demo
   ```
2. Open browser at `http://localhost:5173`.
3. Notice:
   - Green **MCP Online** pill.
   - **Data: mock** and **AI: Bedrock Mock** badges in the header.
   - Central glowing **VoiceOrb** ready for push-to-talk.

---

## Step 1: Daily Standup Briefing (20 Seconds)
- **Developer Action**: Click the quick chip **"What's blocking me?"** (or hold Spacebar / click VoiceOrb and speak: *"Alexa, what's blocking me today?"*).
- **Alexa+ Spoken Audio**:
  > *"Good morning! You have 5 key items today. First, pull request 128, Refactor auth token refresh, needs attention because stale review waiting on Priya Sharma for 28 hours. Also, pull request 104 has failing CI test suite. Would you like me to nudge Priya on pull request 128?"*
- **Visual Display**:
  - The **BriefingCard** appears displaying the spoken quote and 5 ranked blockers with priority scores (PR 104, Issue 42, PR 128, etc.).
  - PR 128 shows reasons: `Stale review waiting on Priya Sharma for 28h`, `High priority blocker`.
  - EventLog logs `tools/call get_blockers` with duration in ms.

---

## Step 2: PR Deep-Dive Summary (20 Seconds)
- **Developer Action**: Speak or click chip: *"Summarize PR 128"*.
- **Alexa+ Spoken Audio**:
  > *"Pull request 128, Refactor auth token refresh, touches 3 files with plus 278 and minus 92 lines. Risk level is medium. Awaiting review from priya-sharma. Recommended next step: Send a friendly reminder to priya-sharma."*
- **Visual Display**:
  - The **PrSummaryCard** renders:
    - Risk rating: **Medium Risk**
    - Architectural overview of auth token rotation
    - Blocking factor: *Awaiting review from priya-sharma*
    - File statistics: `+278 / -92` across `tokenManager.ts`, `refreshTokenService.ts`, and `jwtValidator.ts`.

---

## Step 3: Two-Phase Confirmation Reviewer Nudge (20 Seconds)
- **Developer Action**: Speak or click chip: *"Nudge Priya on that review"*.
- **Alexa+ Spoken Audio**:
  > *"I'll nudge Priya on pull request 128 with this message: 'Hi @Priya Sharma, when you have a moment, could you please take a look at PR #128? Appreciate your feedback!'. Should I send it?"*
- **Visual Display**:
  - The **Action Confirmation Modal** pops up with:
    - Target: `@Priya on acme/payments-platform#128`
    - Draft comment preview
    - Visual prompt: *Say "Yes, send it" or "Cancel"*
- **Developer Action**: Speak *"Yes, send it"* (or click the **Confirm & Send** button).
- **Alexa+ Spoken Audio**:
  > *"I've simulated the nudge to Priya on pull request 128. In live mode, this would post a comment."*
- **Visual Display**:
  - Modal closes, success message logged, EventLog records confirmed phase-2 call.

---

## Step 4: Snoozing an Issue (15 Seconds)
- **Developer Action**: Speak or click chip: *"Snooze issue 42 until Friday"*.
- **Alexa+ Spoken Audio**:
  > *"I'll snooze issue 42 until Friday, October 23. It will be excluded from your daily briefings until then. Should I confirm this?"*
- **Developer Action**: Speak *"Confirm"* or click **Confirm & Send**.
- **Alexa+ Spoken Audio**:
  > *"Issue 42 is now snoozed until Friday. It won't appear in your daily briefing until then."*
- **Visual Display**:
  - The blockers board instantly refreshes: **Issue #42 has vanished from the ranked blockers board**, demonstrating active state persistence and snooze filtering!

---

## Step 5: Verification & Protocol Audit (10 Seconds)
- **Developer Action**: Expand the **Real-time MCP Protocol Inspector** panel at the bottom right.
- **Judge Review Points**:
  - Real JSON-RPC messages over Streamable HTTP (`tools/list`, `get_blockers`, `summarize_pr`, `nudge_reviewer`, `snooze_issue`).
  - Duration benchmarks (1-4ms in mock mode).
  - Click **Copy Log** to view or export the full JSON audit trail.
  - Show header badges confirming offline safety: `Data: mock`, `AI: Bedrock Mock`.

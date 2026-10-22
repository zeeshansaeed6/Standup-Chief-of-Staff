# 🏆 Hackathon Submission Kit & Video Guide

This guide contains everything you need to submit **Standup Chief of Staff** to the **Build, Ship, Shape: Amazon Developer Hackathon** (Devpost / Amazon Developer Portal).

---

## 📸 1. Project Media to Upload

You have 3 high-resolution images in your repository ready to upload into the **Project Media / Gallery / Cover** section:

| Asset Name | File Location | Recommended Use |
| :--- | :--- | :--- |
| **Hero Project Banner** | [`docs/assets/hero-banner.png`](docs/assets/hero-banner.png) | **Cover Photo / Thumbnail**: Features the glowing Alexa+ holographic orb, MCP and Amazon Bedrock integration nodes. |
| **Interactive Console UI** | [`docs/assets/dashboard-ui.png`](docs/assets/dashboard-ui.png) | **Screenshot 1**: Demonstrates VoiceOrb soundwaves, Daily Standup ranked cards, and real-time MCP Inspector. |
| **Two-Phase Voice Confirmation** | [`docs/assets/confirmation-modal.png`](docs/assets/confirmation-modal.png) | **Screenshot 2**: Shows voice safety dialog with AI-drafted comment preview and push-to-talk indicator. |

---

## 🎥 2. 2-Minute Demo Video Guide

Most hackathons request a **2 to 3 minute video** demonstrating your project (uploaded to YouTube, Vimeo, or Loom).

### How to Record:
- **Windows Built-in Recorder**: Press **`Win + Alt + R`** (Xbox Game Bar) to start/stop recording your screen and microphone.
- **Or Free Loom / OBS**: Record your browser tab at [http://localhost:5173](http://localhost:5173).

---

### ⏱️ Minute-by-Minute Video Script (Total: ~2 Minutes)

#### 0:00 – 0:25: The Problem & The Solution
- **On Screen**: Start on the [README.md](README.md) showing the project banner and title, or facecam/browser.
- **You Say**:
  > *"Hi everyone, this is Standup Chief of Staff — an Alexa+ experience built with the Model Context Protocol (MCP) and Amazon Bedrock for the Amazon Developer Hackathon.*  
  > *Every morning, software engineers spend 30 to 45 minutes sifting through GitHub notifications, failing CI pipelines, and Slack threads just to answer one question: 'What is actually blocking me today?'*  
  > *Standup Chief of Staff turns Alexa+ into an intelligent developer chief of staff. Let me show you how it works."*

#### 0:25 – 0:50: Step 1 — The Daily Standup Spoken Briefing
- **On Screen**: Switch to browser at `http://localhost:5173`. Click the quick chip **"What's blocking me?"** (or hold Spacebar and speak).
- **Audio Plays from App**: Alexa+ speaks the 30-second briefing.
- **You Say**:
  > *"With a single voice command, Alexa+ calls our MCP server over Streamable HTTP. It evaluates all assigned pull requests and issues against a deterministic priority scoring engine, re-ranks them using Amazon Bedrock Nova Lite, and delivers a concise 30-second audio briefing."*
- **Point out on Screen**: The ranked blocker cards (failing CI on PR 104, stale review on PR 128, P0 issue 42).

#### 0:50 – 1:15: Step 2 — Deep-Dive PR Inspection
- **On Screen**: Click **"Summarize PR 128"**.
- **Audio Plays from App**: Alexa+ summarizes the file diffs and risk level.
- **You Say**:
  > *"When we ask about a specific pull request like PR 128, Bedrock inspects the code changes, commit checks, and comments, categorizing the merge risk and giving an actionable recommendation."*

#### 1:15 – 1:45: Step 3 & 4 — Voice Actions & Two-Phase Confirmation
- **On Screen**: Click **"Nudge Priya on 128"**.
- **You Say**:
  > *"Now we take action by voice. High-impact operations use our Two-Phase Confirmation Protocol. Alexa+ drafts a polite, context-aware comment and asks for confirmation before posting anything."*
- **On Screen**: Click **"Confirm & Send"** (or say *"Yes, send it"*).
- **On Screen**: Click **"Snooze issue 42 until Friday"** -> Click **Confirm**.
- **You Say**:
  > *"Next, we snooze issue 42 until Friday. Notice how issue 42 immediately disappears from the standup board — state is persisted and dynamically filtered from subsequent briefings."*

#### 1:45 – 2:05: Step 5 — Architecture & Real MCP Traffic
- **On Screen**: Scroll down and expand the **Real-time MCP Protocol Inspector** panel. Click **Copy Log**.
- **You Say**:
  > *"Under the hood, this isn't hardcoded mock text. This is a real Model Context Protocol client communicating with a real TypeScript MCP Server over Streamable HTTP. Judges can see the live JSON-RPC traffic, tool discovery, and sub-millisecond execution times in real time.*  
  > *The system supports both 100% offline mock execution and live GitHub and Amazon Bedrock integrations with zero-crash graceful fallbacks."*

#### 2:05 – 2:15: Closing
- **You Say**:
  > *"Standup Chief of Staff brings the power of agentic AI and MCP to developer morning routines. Thank you!"*

---

## 📝 3. Submission Form Copy-Paste Content

### Project Title
```
Standup Chief of Staff (Alexa+ MCP Experience)
```

### Elevator Pitch / Tagline (1-line)
```
A voice-first Developer Chief of Staff for Alexa+ powered by MCP & Amazon Bedrock that delivers 30-second standup briefings and takes instant action on GitHub blockers.
```

### Inspiration
```
Engineers waste up to 45 minutes every morning context-switching between GitHub tabs, CI/CD dashboards, and Slack threads just to figure out what needs attention before daily standup. We wanted to see what happens when you combine the ambient, voice-first power of Alexa+ with the Model Context Protocol (MCP) and Amazon Bedrock to create an autonomous executive assistant for developers.
```

### What It Does
```
Standup Chief of Staff is an MCP-based developer assistant:
1. Daily Standup Briefing: Developers ask Alexa+ "What's blocking me today?" and hear a natural 30-second audio summary of their top blockers (failing CI, stale PR reviews, merge conflicts, overdue issues).
2. PR Risk Summarization: Deep-dives into pull request file additions/deletions, CI test check rollups, and review comments, producing a merge risk rating (low/medium/high) and suggested next steps.
3. Two-Phase Voice Confirmation: Developers can act by voice ("Nudge Priya on PR 128", "Snooze issue 42 until Friday"). The server generates safe preview tokens with 5-minute TTL to prevent unintended writes.
4. Intelligent Priority Scoring: Evaluates active work against a deterministic 0-100 priority algorithm before re-ranking with Amazon Bedrock.
5. Dual Modes: Runs 100% offline in zero-credential mock mode for instant demos, with seamless live integration for GitHub (REST + GraphQL) and Amazon Bedrock (Nova Lite via Converse API).
```

### How We Built It
```
- Monorepo: npm workspaces with strict TypeScript ESM across shared types, server, and web console.
- MCP Server: Built using @modelcontextprotocol/sdk with stateless Streamable HTTP transport on Express.
- AI Reasoning: Amazon Bedrock Converse API using Amazon Nova Lite (us.amazon.nova-lite-v1:0 / eu.amazon.nova-lite-v1:0) with automated JSON schema validation and retry repair prompts.
- GitHub Integration: Octokit REST and GraphQL to query commit status check rollups, review requests, and PR mergeability.
- Voice Simulator UI: React 18, Vite, and Tailwind CSS featuring an animated push-to-talk VoiceOrb, Web Speech recognition/synthesis, and a live MCP Protocol Inspector.
- Testing: Comprehensive test suite with 33 Vitest tests and an automated end-to-end smoke test script.
```

### Challenges We Ran Into
```
1. Ensuring stateless reliability over Streamable HTTP: Handled per-request transport lifecycles with @modelcontextprotocol/sdk in stateless mode.
2. Two-Phase voice confirmation in an LLM agent: Designed an expiring token architecture (5-minute TTL) so voice assistants preview drafted actions before committing writes.
3. Resilience and graceful degradation: Built an automatic fallback system so missing credentials or API rate limits never crash the service, automatically dropping to deterministic templates with visible UI indicators.
```

### What We Learned
```
The Model Context Protocol (MCP) is the ideal abstraction layer for voice assistants like Alexa+. Rather than building rigid, hard-coded intent slots, exposing capabilities as standardized MCP tools allows Alexa+ to autonomously discover, parameterize, and invoke engineering actions dynamically.
```

### What's Next
```
- Physical Alexa+ device integration via Amazon Developer Console account linking.
- Calendar & Chat Integrations: Syncing snoozed issues with AWS Wickr, Slack, and Google Calendar.
- Autonomous CI triage: Having Alexa+ summarize failing stack traces and automatically propose branch fixes.
```

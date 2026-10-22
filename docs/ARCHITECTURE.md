# System Architecture: Standup Chief of Staff

Standup Chief of Staff is a voice-first Developer Chief of Staff built on the **Model Context Protocol (MCP)** over Streamable HTTP. It allows developers to converse naturally with Alexa+ to hear a 30-second spoken briefing of their daily blockers (failing CI, stale PR reviews, merge conflicts, overdue issues) and take instantaneous voice action ("nudge Priya on that review", "snooze issue 42 until Friday").

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer ["Client Layer (Simulator / Alexa+)"]
        UI["Alexa+ Web Console (React 18 + Tailwind)"]
        VOICE["Speech Recognition & Synthesis (Web Speech API)"]
        ORB["VoiceOrb (Visual State Ring & Audio Waveforms)"]
        ROUTER["Voice Intent Router (src/lib/intents.ts)"]
        MCP_CLI["@modelcontextprotocol/sdk Browser Client"]
    end

    subgraph Transport Layer ["Transport Layer"]
        HTTP["Streamable HTTP Transport (POST/GET /mcp)"]
    end

    subgraph MCP Server ["MCP Server (@standup/server)"]
        EXPRESS["Express Server (Port 8787)"]
        MCP_SRV["McpServer Instance (Stateless)"]
        
        subgraph Tools ["Registered MCP Tools"]
            T1["get_blockers"]
            T2["summarize_pr"]
            T3["nudge_reviewer (2-Phase Confirmation)"]
            T4["snooze_issue (2-Phase Confirmation)"]
        end

        subgraph Engine ["Intelligence & State"]
            SCORING["Deterministic Priority Engine (0-100 Score)"]
            DATE_PARSER["Natural Language Date Parser"]
            STORE["LocalStateStore (.state/standup-state.json)"]
        end

        subgraph Integrations ["External Service Providers"]
            GH_CLIENT["GitHub Provider Abstraction"]
            LIVE_GH["Octokit REST + GraphQL"]
            MOCK_GH["Offline Fixtures (teamData.ts)"]
            
            BEDROCK_CLIENT["Amazon Bedrock Client (Converse API)"]
            NOVA["Amazon Nova Lite (us.amazon.nova-lite-v1:0)"]
            FALLBACK_AI["Deterministic Conversational Fallback"]
        end
    end

    VOICE --> ORB
    ORB --> ROUTER
    ROUTER --> MCP_CLI
    MCP_CLI -->|JSON-RPC over Streamable HTTP| HTTP
    HTTP --> EXPRESS
    EXPRESS --> MCP_SRV
    
    MCP_SRV --> T1
    MCP_SRV --> T2
    MCP_SRV --> T3
    MCP_SRV --> T4

    T1 --> SCORING
    T1 --> GH_CLIENT
    T1 --> BEDROCK_CLIENT
    
    T2 --> GH_CLIENT
    T2 --> BEDROCK_CLIENT
    
    T3 --> STORE
    T3 --> GH_CLIENT
    T3 --> BEDROCK_CLIENT
    
    T4 --> STORE
    T4 --> DATE_PARSER
    T4 --> GH_CLIENT

    GH_CLIENT -->|Live Mode + PAT| LIVE_GH
    GH_CLIENT -->|Mock Mode / Graceful Degradation| MOCK_GH

    BEDROCK_CLIENT -->|Live Mode + AWS Credentials| NOVA
    BEDROCK_CLIENT -->|Mock Mode / Graceful Degradation| FALLBACK_AI
```

---

## 2. End-to-End Data Flow

### Flow A: Daily Standup Spoken Briefing (`get_blockers`)
1. **Utterance**: Developer speaks *"Alexa, what's blocking me today?"*
2. **Intent Parsing**: `intents.ts` extracts intent `get_blockers` with arguments `{ limit: 5 }`.
3. **MCP Call**: The MCP Client initiates a `tools/call` request over Streamable HTTP to `/mcp`.
4. **Data Aggregation**: `GitHubProvider` gathers assigned pull requests, review requests, and open issues across configured repositories (`acme/payments-platform`, `acme/web-dashboard`).
5. **Deterministic Priority Scoring**:
   - Failing CI build: **+30 points**
   - Stale review requested from developer (> 24h): **+25 points** (scaled up to +35 by age)
   - Changes requested on developer's PR: **+25 points**
   - P0/Blocker issue: **+25 points**
   - Developer's PR approved but unmerged: **+10 points**
   - Merge conflicts: **+15 points**
   - Assigned and overdue: **+15 points**
   - Team blocked waiting on developer: **+20 points**
   - Snoozed items: **filtered out** until expiry.
6. **Bedrock AI Processing**:
   - **Task A (Ranking)**: Bedrock re-evaluates top candidates and produces strict JSON `{ ranked, oneLineSummary }`.
   - **Task B (Conversational Briefing)**: Bedrock generates a natural 20-30 second spoken briefing (under 90 words, no markdown or URLs, conversational audio phrasing).
7. **Dual-Content Response**:
   - The MCP tool returns both structured JSON and a spoken string.
   - Alexa+ synthesizes the spoken briefing and renders ranked priority cards in the web console.

---

### Flow B: Two-Phase Confirmation (`nudge_reviewer` & `snooze_issue`)
To guarantee safety and transparency, all write actions enforce a two-phase confirmation lifecycle:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as Alexa+ Simulator
    participant MCP as MCP Server
    participant State as LocalStateStore
    participant Ext as GitHub / Bedrock

    Dev->>UI: "Nudge Priya on pull request 128"
    UI->>MCP: tools/call nudge_reviewer { confirm: false, reviewer: "Priya" }
    MCP->>Ext: Draft polite reminder comment
    MCP->>State: createConfirmation("nudge_reviewer", preview) -> conf_id (5-min TTL)
    MCP-->>UI: { status: "needs_confirmation", confirmationId: "conf_id", preview, spoken }
    UI->>Dev: Speaks: "I'll nudge Priya on PR 128 with this message... Should I send it?"
    UI->>UI: Displays Action Confirmation Modal
    
    Dev->>UI: "Yes, send it" (or clicks Confirm)
    UI->>MCP: tools/call nudge_reviewer { confirm: true, confirmationId: "conf_id" }
    MCP->>State: consumeConfirmation("conf_id")
    alt Live Mode & LIVE_WRITES=true
        MCP->>Ext: Octokit postComment to PR 128
    else Mock Mode or LIVE_WRITES=false
        MCP->>State: Record simulated comment in local state
    end
    MCP-->>UI: { status: "sent", simulated: true, spoken: "I've sent the nudge..." }
    UI->>Dev: Speaks success confirmation
```

---

## 3. Resilience & Graceful Degradation
- **Zero-Crash Architecture**: Missing credentials or network failures never throw unhandled 500s.
- If `DATA_MODE=live` is configured without `GITHUB_TOKEN`, the server automatically degrades to offline mock fixtures and surfaces a `degraded` flag in health and tool results.
- If `BEDROCK_MODE=live` is configured without AWS credentials or hits rate limits, it automatically falls back to deterministic conversational templates and surfaces a visible amber badge in the UI.

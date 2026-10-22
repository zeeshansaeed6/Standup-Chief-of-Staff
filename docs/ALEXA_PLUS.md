# Integrating Standup Chief of Staff with Alexa+

This document outlines how the **Standup Chief of Staff** Model Context Protocol (MCP) server can be connected to the Alexa+ ecosystem, based on standard MCP specifications and current Alexa+ architectural paradigms.

> [!NOTE]
> Specific developer console workflows, manifest schemas, and certification requirements for the emerging Alexa+ MCP integration must be confirmed against current Amazon Developer documentation as Amazon rolls out public tooling for MCP-based capabilities.

---

## 1. Overview of the Alexa+ MCP Model

Traditional Alexa skills relied on custom interaction models (Intents, Slots, and Dialog Directives) requiring developer-defined utterance grammars.

In the **Alexa+** architecture:
- Alexa+ functions as an **autonomous LLM-powered orchestrator**.
- Instead of rigid utterance mapping, Alexa+ queries standard MCP servers via `tools/list` to discover registered capabilities, descriptions, and JSON Schema input contracts.
- When an end-user speaks ("Alexa, what's blocking me today?"), Alexa+ performs tool selection dynamically, calls tools via JSON-RPC over Streamable HTTP (or WebSockets), and synthesizes tool responses into conversational speech.

---

## 2. Server Deployment Requirements

To serve Alexa+ devices in production:

1. **Public HTTPS Endpoint**:
   - The MCP server must be deployed to an internet-accessible HTTPS endpoint with a valid TLS certificate (e.g. AWS App Runner, ECS Fargate behind an Application Load Balancer, or AWS Lambda with Web Adapter).
   - Base URL pattern: `https://<your-domain>/mcp`
2. **Streamable HTTP Transport**:
   - Must support standard HTTP POST and GET streaming (Server-Sent Events) according to the Model Context Protocol specification.
   - Stateless operation (new transport per request without sticky server affinity) enables seamless horizontal scaling across AWS availability zones.
3. **Authentication**:
   - Amazon Developer console OAuth 2.0 / Account Linking or Bearer Token headers (`Authorization: Bearer <token>`) passed through the MCP headers. *(To confirm against current Amazon Developer docs)*.

---

## 3. Registering the MCP Server with Alexa+

### Step A: Amazon Developer Console Setup
*(To confirm exact UI steps against current Amazon Developer Console docs)*
1. Log in to the [Amazon Developer Console](https://developer.amazon.com/alexa).
2. Create a new skill / experience selecting the **Alexa+ Track: MCP Provider** option.
3. Enter the MCP Server Configuration:
   - **Server Endpoint URL**: `https://<your-service-domain>/mcp`
   - **Transport Type**: `Streamable HTTP`
   - **Protocol Version**: `2024-11-05` (or current MCP standard)
4. Configure Account Linking (for GitHub):
   - Client ID & Client Secret for GitHub OAuth application.
   - Scopes: `repo`, `read:user`.

### Step B: Automatic Tool Ingestion
When Alexa+ registers the server, it issues a standard `tools/list` request. Our server returns:
- `get_blockers`: Ingested as a daily standup briefing capability.
- `summarize_pr`: Ingested for deep-dive PR inspection.
- `nudge_reviewer`: Ingested for reviewer follow-ups (flagged for two-phase confirmation).
- `snooze_issue`: Ingested for calendar/issue deferrals.

Because every tool exposes:
1. An LLM-optimized description
2. A strict Zod input schema
3. Spoken-audio formatted text outputs (under 60 words, no markdown, no raw URLs)

Alexa+ can render both the audio response through Echo devices and visual cards on Echo Show or Fire TV screens.

---

## 4. Two-Phase Confirmation on Voice Devices

Alexa+ enforces explicit confirmation for write operations (nudging colleagues or mutating issue state).

1. When `nudge_reviewer` or `snooze_issue` is invoked without `confirm: true`, the tool returns:
   ```json
   {
     "status": "needs_confirmation",
     "confirmationId": "conf_...",
     "preview": { "action": "nudge_reviewer", "target": "...", "draftMessage": "..." },
     "spoken": "I'll nudge Priya on pull request 128 with this message... Should I send it?"
   }
   ```
2. Alexa+ speaks the prompt and enters a listening window.
3. Upon hearing the user's voice confirmation ("Yes, send it"), Alexa+ calls the tool with:
   ```json
   {
     "confirm": true,
     "confirmationId": "conf_..."
   }
   ```
4. The server validates the token against the 5-minute TTL cache and executes the write.

---

## 5. Local Simulation for Testing & Hackathon Evaluation

Because public Alexa+ device sandboxes may have limited availability, this repository includes a complete **Alexa+ Simulator** (`apps/web`):
- Uses the official `@modelcontextprotocol/sdk` browser client.
- Interacts with `@standup/server` over Streamable HTTP identical to how Alexa+ communicates.
- Implements Web Speech synthesis and recognition, animated push-to-talk VoiceOrb, quick chips, and live protocol inspector.

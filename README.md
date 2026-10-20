# AI Debate Arena

An immersive, multi-provider AI debate platform built with **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS**. Watch autonomous AI models debate complex topics with structured rounds, multi-format styles, independent judging, and smooth message-by-message playback.

---

## Features

- **Multi-Provider Support**: Integrate with OpenAI, Google Gemini, Anthropic Claude, and custom OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, etc.).
- **Flexible Debate Formats**:
  - **Standard**: Direct debate with arguments and rebuttals.
  - **Steelman**: Fairly summarizing the strongest opposing argument before rebutting.
  - **Devil's Advocate**: Actively challenging assumptions and testing opposing positions.
- **Independent Judge & Scoring Rubric**: Autonomous evaluation across 5 weighted criteria (Evidence Quality, Logical Reasoning, Rebuttal Effectiveness, Responsiveness, Clarity & Relevance).
- **Interactive Playback Engine**: Real-time message streaming simulation with play/pause, step forward, jump to end, speed controls (0.5x - 2.0x), progress bar, and copyable transcripts.
- **Secure Architecture**: API keys are handled securely via session in-memory state or server-side environment variables with SSRF protection and rate limiting.
- **Comprehensive Settings**: Complete UI for provider configuration, role assignments (Shared Model vs. Multi-Model), temperature, token limits, and custom instructions.

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- API key(s) for OpenAI, Gemini, Anthropic, or a local OpenAI-compatible endpoint.

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (optional for server-managed keys):
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Guide

1. **Configure Providers**: Go to **Settings** (`/settings`), enable your preferred AI providers (OpenAI, Gemini, Anthropic, or Custom), enter your API keys (stored securely in memory), and assign models to roles (PRO, CON, JUDGE) or use Shared Model mode.
2. **Start a Debate**: Go to **New Debate** (`/`), enter a topic or select an example, choose a debate format (Standard, Steelman, Devil's Advocate), set the number of rounds, and click **Start Debate**.
3. **Watch & Control**: Experience the sequential debate playback in the **Debate Room**, control playback speed, pause/resume, and view the independent Judge's Verdict upon completion.

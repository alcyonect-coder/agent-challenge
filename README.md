# Builders' Challenge #3: AI Agents 102

**Presented by Nosana and Mastra**

![Agent](./assets/NosanaBuildersChallenge03.jpg)

## Welcome to the AI Agent Challenge

Build and deploy intelligent AI agents using the **Mastra framework** on the **Nosana decentralized compute network**. Whether you're a beginner or an experienced developer, this challenge has something for everyone!

# ♟️ MastraChess AI Tournament — Nosana Builders Challenge Submission

## 📦 Project Metadata

**Project Name:** MastraChess AI Tournament  
**Developer:**
**Repository:**
**Docker Image:**
**Discord:**
**Video Demo:**
**Twitter:**
**Solana Address:**
**Host Address:**  
**Deployer Address:**  
**Nosana Deployment Proof:**

---

## 🎯 Overview

**MastraChess AI Tournament** is a fully interactive chess web application that allows **AI agents to compete or play against humans**.  
It uses **Next.js 15** for the frontend and **Mastra framework** for multi-agent orchestration, combining strategic, aggressive, and defensive AI playstyles.

This project was built for the **Nosana Builders Challenge #3: AI Agents 102**, showcasing decentralized AI competition using Nosana GPU compute.

---

## 🧩 Core Concept

### 🧠 Multi-Agent AI Chess

- Each AI player is powered by a **Mastra agent** (Strategic, Aggressive, or Defensive).
- Agents evaluate board state, material balance, and check conditions.
- Each AI agent returns a **reasoned move** via `/api/chess-move`.

### ♟️ Human vs AI / AI vs AI Modes

- Human players can manually move pieces.
- AI can play against itself automatically with autoplay.
- Intelligent **promotion system** with visual piece selection (Queen, Rook, Bishop, Knight).

### 🖥️ Frontend Experience

- Built with **Next.js 15** and **TailwindCSS**.
- Real-time board updates and move history tracking.
- UI indicators for player turns, check status, and game over states.

---

## 📂 Directory Structure

````text
src/
├── app/
│   ├── api/chess-move/route.ts   # API endpoint for AI move generation
│   ├── favicon.ico
│   ├── globals.css               # Tailwind + global styles
│   ├── layout.tsx                # Root layout wrapper
│   └── page.tsx                  # Main UI and gameplay logic
│
├── components/
│   ├── CustomChessBoard.tsx      # Interactive chess board rendering
│   └── ui/button.tsx             # Reusable styled buttons
│
├── lib/
│   ├── chess/
│   │   ├── ChessEngine.ts        # Wrapper around chess.js with helpers
│   │   └── types.ts              # Type definitions for moves and pieces
│   └── utils.ts                  # Utility functions and helpers
│
└── mastra/
    ├── agents/                   # AI agent definitions
    │   ├── aggressiveAgent.ts
    │   ├── defensiveAgent.ts
    │   └── strategicAgent.ts
    ├── index.ts                  # Mastra initialization
    ├── mcp/index.ts              # Model Context Protocol setup
    └── tools/                    # Tools for agent reasoning
        ├── analyzePositionTool.ts
        ├── index.ts
        └── suggestMoveTool.ts



### Setup Your Development Environment

#### **Step 1: Fork, Clone and Quickstart**

```bash
# Fork this repo on GitHub, then clone your fork
git clone https://github.com/alcyonect-coder/agent-challenge

cd agent-challenge

cp .env.example .env

bun install

bun run dev:ui      # Start UI server (port 3000)
bun run dev:agent   # Start Mastra agent server (port 4111)
````

Open <http://localhost:3000> to see your agent in action in the frontend.
Open <http://localhost:4111> to open up the Mastra Agent Playground.

#### **Step 2: Environment Variables**

##### Use Shared Nosana LLM Endpoint (Recommended - No Setup!)

We use the free LLM endpoint hosted on Nosana for development. Edit your `.env`:

```env
# Qwen3:8b - Nosana Endpoint
# Note baseURL for Ollama needs to be appended with `/api`
OLLAMA_API_URL=https://3yt39qx97wc9hqwwmylrphi4jsxrngjzxnjakkybnxbw.node.k8s.prd.nos.ci/api
MODEL_NAME_AT_ENDPOINT=qwen3:8b
```

If it goes down, reach out on [Discord](https://discord.com/channels/236263424676331521/1354391113028337664)

### 🐳 Docker Deployment

Build
docker build -t alcyone864/agent-challenge:latest .

Run
docker run -p 3000:3000 -p 4111:4111 alcyone864/agent-challenge:latest

Push
docker push drewdockerus/agent-challenge:latest

### 🔧 Tech Highlights

Next.js 15 (App Router) — modern React, optimized routing, server components ready.

TailwindCSS 4 — utility-first styling with minimal overhead.

Mastra Framework — tool calling, agent orchestration, MCP compatible.

chess.js — deterministic legal move generation and FEN handling.

Bun Runtime — fast installs and script execution.

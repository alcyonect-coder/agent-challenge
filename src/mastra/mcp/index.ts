// src/mastra/mcp/index.ts
import { MCPServer } from "@mastra/mcp";

import { chessTools } from "../tools";
import { aggressiveAgent } from "../agents/aggressiveAgent";
import { defensiveAgent } from "../agents/defensiveAgent";
import { strategicAgent } from "../agents/strategicAgent";

export const server = new MCPServer({
  name: "Chess AI Tournament Server",
  version: "1.0.0",
  tools: chessTools,
  agents: {
    strategicAgent, // becomes tool "ask_strategicAgent"
    aggressiveAgent, // becomes tool "ask_aggressiveAgent"
    defensiveAgent, // becomes tool "ask_defensiveAgent"
  },
});

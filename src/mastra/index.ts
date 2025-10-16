// src/mastra/index.ts
import { ConsoleLogger, LogLevel } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";

import { aggressiveAgent } from "./agents/aggressiveAgent";
import { defensiveAgent } from "./agents/defensiveAgent";
import { strategicAgent } from "./agents/strategicAgent";
import { server } from "./mcp";

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

export const mastra = new Mastra({
  agents: {
    strategicAgent,
    aggressiveAgent,
    defensiveAgent,
  },
  mcpServers: {
    server,
  },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new ConsoleLogger({
    level: LOG_LEVEL,
  }),
});

export * from "./agents/defensiveAgent";
export * from "./tools";

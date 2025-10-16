// src/mastra/index.ts

import { analyzePositionTool } from "./analyzePositionTool";
import { suggestMoveTool } from "./suggestMoveTool";

export const chessTools = {
  analyzePosition: analyzePositionTool,
  suggestMove: suggestMoveTool,
};

import { createTool } from "@mastra/core";
import { z } from "zod";

export const suggestMoveTool = createTool({
  id: "suggest-move",
  description:
    "Suggests best chess move based on position analysis and agent personality",
  inputSchema: z.object({
    legalMoves: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        san: z.string(),
        captured: z.string().optional(),
        promotion: z.string().optional(),
      })
    ),
    positionAnalysis: z.object({
      evaluation: z.number(),
      positionType: z.string(),
      keyFactors: z.array(z.string()),
      threats: z.array(z.string()),
      opportunities: z.array(z.string()),
    }),
    personality: z.enum(["aggressive", "defensive", "strategic"]),
  }),
  outputSchema: z.object({
    bestMove: z.object({
      from: z.string(),
      to: z.string(),
      san: z.string(),
    }),
    reasoning: z.string(),
    alternativeMoves: z.array(
      z.object({
        move: z.string(),
        reason: z.string(),
      })
    ),
    confidence: z.number().min(0).max(10),
  }),
  execute: async ({ context }) => {
    const { legalMoves, positionAnalysis, personality } = context;

    if (legalMoves.length === 0) {
      throw new Error("No legal moves available");
    }

    // Score each move based on personality
    const scoredMoves = legalMoves.map((move) => {
      let score = 50; // Base score
      let reasoning = "";

      // Capture moves
      if (move.captured) {
        if (personality === "aggressive") {
          score += 30;
          reasoning += "Aggressive capture. ";
        } else {
          score += 15;
          reasoning += "Material gain. ";
        }
      }

      // Check moves (likely checking moves have '+' in san)
      if (move.san.includes("+")) {
        if (personality === "aggressive") {
          score += 25;
          reasoning += "Checking the king! ";
        } else {
          score += 10;
          reasoning += "Applying pressure. ";
        }
      }

      // Promotion moves
      if (move.promotion) {
        score += 40;
        reasoning += "Pawn promotion! ";
      }

      // Position-based adjustments
      if (
        positionAnalysis.positionType === "losing" &&
        personality === "aggressive"
      ) {
        if (move.captured) score += 20; // Desperate tactics
        reasoning += "Desperate counterplay needed. ";
      }

      if (
        positionAnalysis.positionType === "winning" &&
        personality === "defensive"
      ) {
        if (!move.captured) score += 15; // Safe moves when winning
        reasoning += "Consolidating advantage. ";
      }

      // Center control (e4, d4, e5, d5)
      if (["e4", "d4", "e5", "d5"].includes(move.to)) {
        score += 10;
        reasoning += "Controlling center. ";
      }

      return { move, score, reasoning };
    });

    // Sort by score and pick best
    scoredMoves.sort((a, b) => b.score - a.score);
    const best = scoredMoves[0];
    const alternatives = scoredMoves.slice(1, 4).map((m) => ({
      move: m.move.san,
      reason: m.reasoning,
    }));

    const reasoning = `${best.reasoning} Position: ${positionAnalysis.positionType}. ${
      personality === "aggressive"
        ? "Seeking active play and initiative."
        : personality === "defensive"
          ? "Prioritizing safety and solid structure."
          : "Balancing attack and defense strategically."
    }`;

    return {
      bestMove: {
        from: best.move.from,
        to: best.move.to,
        san: best.move.san,
      },
      reasoning,
      alternativeMoves: alternatives,
      confidence: Math.min(10, Math.round(best.score / 10)),
    };
  },
});

import { createTool } from "@mastra/core";
import { z } from "zod";

export const analyzePositionTool = createTool({
  id: "analyze-position",
  description:
    "Analyzes current chess position and provides strategic insights",
  inputSchema: z.object({
    fen: z.string(),
    legalMoves: z.array(z.string()),
    materialBalance: z.number(),
    isCheck: z.boolean(),
    capturedPieces: z.object({
      white: z.array(z.string()),
      black: z.array(z.string()),
    }),
  }),
  outputSchema: z.object({
    evaluation: z.number(),
    positionType: z.enum([
      "winning",
      "advantage",
      "equal",
      "disadvantage",
      "losing",
    ]),
    keyFactors: z.array(z.string()),
    threats: z.array(z.string()),
    opportunities: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { fen, legalMoves, materialBalance, isCheck, capturedPieces } =
      context;

    const keyFactors: string[] = [];
    const threats: string[] = [];
    const opportunities: string[] = [];

    // ---- FEN-derived signals ----
    // FEN: "<placement> <active> <castling> <ep> <halfmove> <fullmove>"
    const [, active, castling, ep, halfmoveStr] = fen.split(" ");
    const halfmove = Number(halfmoveStr || "0");

    // Side to move
    keyFactors.push(active === "w" ? "White to move" : "Black to move");

    // Castling rights
    if (castling && castling !== "-") {
      if (/[KQ]/.test(castling)) opportunities.push("White can castle");
      if (/[kq]/.test(castling)) opportunities.push("Black can castle");
    } else {
      keyFactors.push("No castling rights remaining");
    }

    // En passant availability
    if (ep && ep !== "-") opportunities.push(`En passant target on ${ep}`);

    // 50-move rule proximity
    if (halfmove >= 80) keyFactors.push("Approaching 50-move rule (draw risk)");
    else if (halfmove >= 40)
      keyFactors.push("Half-move clock rising (be mindful of progress)");

    // Game phase heuristic from piece placement
    const placement = fen.split(" ")[0];
    let majorsMinors = 0;
    for (const ch of placement) {
      if (/[QRBNqrbn]/.test(ch)) majorsMinors++;
    }
    if (!/[Qq]/.test(placement) && majorsMinors <= 8) {
      keyFactors.push("Endgame features (few majors/minors, no queens)");
    }

    // ---- Existing heuristics ----
    if (materialBalance > 3) {
      keyFactors.push("Significant material advantage");
      opportunities.push("Convert material into winning endgame");
    } else if (materialBalance < -3) {
      keyFactors.push("Material deficit – need counterplay");
      threats.push("Risk of losing due to material disadvantage");
    }

    if (isCheck) {
      threats.push("King under immediate attack");
      keyFactors.push("Must respond to check");
    }

    if (legalMoves.length < 10) threats.push("Limited piece mobility");
    else if (legalMoves.length > 30)
      opportunities.push("Excellent piece activity");

    const totalCaptured =
      capturedPieces.white.length + capturedPieces.black.length;
    if (totalCaptured > 6)
      keyFactors.push("Complex tactical position with many captures");

    let positionType:
      | "winning"
      | "advantage"
      | "equal"
      | "disadvantage"
      | "losing";
    if (materialBalance >= 5) positionType = "winning";
    else if (materialBalance >= 2) positionType = "advantage";
    else if (materialBalance <= -5) positionType = "losing";
    else if (materialBalance <= -2) positionType = "disadvantage";
    else positionType = "equal";

    return {
      evaluation: materialBalance,
      positionType,
      keyFactors,
      threats,
      opportunities,
    };
  },
});

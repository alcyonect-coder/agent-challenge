// src/app/api/chess-move/route.ts
import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/** ---- Schemas & Types ---- */
const LegalMoveSchema = z.object({
  from: z.string(),
  to: z.string(),
  san: z.string(),
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});

const BodySchema = z.object({
  agentType: z.enum(["strategic", "aggressive", "defensive"]),
  fen: z.string(),
  legalMovesVerbose: z.array(LegalMoveSchema),
  materialBalance: z.number(),
  isCheck: z.boolean(),
});

type LegalMove = z.infer<typeof LegalMoveSchema>;

type Option = {
  i: number;
  san: string;
  uci: string;
};

const AiReplySchema = z.object({
  index: z.number().int(),
  reasoning: z.string().min(1).max(160),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());

    const { agentType, fen, legalMovesVerbose, materialBalance, isCheck } =
      body;
    // pick agent
    const agentName =
      agentType === "strategic"
        ? "strategicAgent"
        : agentType === "aggressive"
          ? "aggressiveAgent"
          : "defensiveAgent";
    const agent = mastra.getAgent(agentName);

    // Compact options with indices + UCI (typed; no any)
    const options: Option[] = legalMovesVerbose.map(
      (m: LegalMove, i: number): Option => ({
        i,
        san: m.san,
        uci: `${m.from}${m.to}${m.promotion ?? ""}`,
      })
    );

    const prompt = `You are a ${agentType} chess agent. Choose ONE legal move.

      FEN: ${fen}
      Eval: ${materialBalance > 0 ? `+${materialBalance}` : materialBalance}
      Check: ${isCheck ? "YES" : "NO"}

      Options (index, SAN, UCI):
      ${options.map((o: Option) => `${o.i}. ${o.san}  [${o.uci}]`).join("\n")}

      Rules:
      - Output exactly one compact JSON line (no prose):
      {"index": <number from the list above>, "reasoning": "<one short sentence>"}  
      - "index" must be one of the numbers shown.
      - Do not invent SAN/coordinates. Do not include anything else.`;

    const response = await agent.generateVNext(prompt);

    const raw = response.text || "";

    // tolerate accidental code fences and extract JSON
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in model response");

    const ai = AiReplySchema.parse(JSON.parse(jsonMatch[0]));
    const { index, reasoning } = ai;

    if (index < 0 || index >= legalMovesVerbose.length) {
      throw new Error(`Index out of range: ${index}`);
    }

    // Return index (primary) and uci (nice to have)
    const chosen = legalMovesVerbose[index];
    const uci = `${chosen.from}${chosen.to}${chosen.promotion ?? ""}`;

    return NextResponse.json({
      success: true,
      index,
      uci,
      reasoning,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI route error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

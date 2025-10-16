// src/components/CustomChessBoard.tsx
"use client";

import { ChessEngine } from "@/lib/chess/ChessEngine";
import type { Square } from "chess.js";
import { Brain, Crown, Shield, Swords, User } from "lucide-react";
import { useMemo } from "react";

type Agent = "strategic" | "aggressive" | "defensive" | "human";

interface Props {
  engine: ChessEngine;
  onMove: (from: Square, to: Square) => boolean;
  currentAgent: Agent;
  isThinking: boolean;
  /** hard cap for very large screens, default 640 */
  maxSize?: number;
  flashTurn?: boolean;
}

/** --- helpers (unchanged) --- */
function fenToBoard(fen: string) {
  const placement = fen.split(" ")[0];
  const rows = placement.split("/");
  const board: Array<Array<{ type: string; color: "w" | "b" } | null>> = [];
  const pieceMap: Record<string, string> = {
    p: "p",
    r: "r",
    n: "n",
    b: "b",
    q: "q",
    k: "k",
  };
  for (const row of rows) {
    const out: Array<{ type: string; color: "w" | "b" } | null> = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
      else
        out.push({
          type: pieceMap[ch.toLowerCase()],
          color: ch === ch.toLowerCase() ? "b" : "w",
        });
    }
    board.push(out);
  }
  return board;
}
function rcToSquare(r: number, c: number): Square {
  const file = String.fromCharCode("a".charCodeAt(0) + c);
  const rank = 8 - r;
  return `${file}${rank}` as Square;
}

const PIECE_SVG = (type: string, color: "w" | "b") =>
  `/pieces/cburnett/${color}${type.toUpperCase()}.svg`;

function AgentBadge({ agent }: { agent: Agent }) {
  const icon =
    agent === "human" ? (
      <User className="w-5 h-5" />
    ) : agent === "strategic" ? (
      <Brain className="w-5 h-5" />
    ) : agent === "aggressive" ? (
      <Swords className="w-5 h-5" />
    ) : (
      <Shield className="w-5 h-5" />
    );
  const color =
    agent === "human"
      ? "text-purple-600"
      : agent === "strategic"
        ? "text-blue-600"
        : agent === "aggressive"
          ? "text-red-600"
          : "text-green-600";
  const label = agent === "human" ? "Human" : `${agent} Agent`;
  return (
    <div className={`${color} flex items-center gap-2`}>
      {icon}
      <span className="font-bold text-lg capitalize">{label}</span>
    </div>
  );
}

export default function CustomChessBoard({
  engine,
  onMove,
  currentAgent,
  isThinking,
  maxSize = 640,
  flashTurn = false,
}: Props) {
  const fen = engine.getFen();
  const board = useMemo(() => fenToBoard(fen), [fen]);
  const turn = engine.getCurrentTurn();

  const canDrag = (piece: { type: string; color: "w" | "b" } | null) => {
    if (!piece) return false;
    if (isThinking || currentAgent !== "human") return false;
    const side = piece.color === "w" ? "white" : "black";
    return side === turn;
  };
  const handleDragStart =
    (from: Square) => (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("text/plain", from);
      e.dataTransfer.effectAllowed = "move";
    };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (to: Square) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/plain") as Square;
    if (from) onMove(from, to);
  };
  const isDark = (r: number, c: number) => (r + c) % 2 === 1;

  return (
    <div className="relative w-full">
      <div className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center gap-3">
          <AgentBadge agent={currentAgent} />
          {isThinking && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
        <div
          className={`text-sm px-2 py-1 rounded transition
       ${flashTurn ? "bg-red-100 ring-2 ring-red-400 animate-pulse" : "text-gray-600"}`}
        >
          Turn: {turn === "white" ? "White" : "Black"}
        </div>
      </div>

      {/* Board: sized by boardSize so it never overflows its column */}
      <div className="relative mx-auto w-full" style={{ maxWidth: maxSize }}>
        <div
          className="
      aspect-square
      rounded-lg overflow-hidden shadow-2xl border-4 border-gray-300
      select-none grid grid-cols-8 grid-rows-8
    "
        >
          {board.map((rank, r) =>
            rank.map((sq, c) => {
              const square = rcToSquare(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(square)}
                  style={{
                    backgroundColor: isDark(r, c) ? "#B58863" : "#F0D9B5",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(16px, 7vw, 64px)",
                    cursor: sq && canDrag(sq) ? "grab" : "default",
                  }}
                >
                  {c === 0 && (
                    <span
                      style={{
                        position: "absolute",
                        left: 4,
                        top: 4,
                        fontSize: 10,
                        color: isDark(r, c) ? "white" : "black",
                        opacity: 0.6,
                      }}
                    >
                      {8 - r}
                    </span>
                  )}
                  {r === 7 && (
                    <span
                      style={{
                        position: "absolute",
                        right: 4,
                        bottom: 4,
                        fontSize: 10,
                        color: isDark(r, c) ? "white" : "black",
                        opacity: 0.6,
                      }}
                    >
                      {String.fromCharCode("a".charCodeAt(0) + c)}
                    </span>
                  )}
                  {sq && (
                    <div
                      draggable={canDrag(sq)}
                      onDragStart={handleDragStart(square)}
                      style={{
                        // this wrapper is the drag target
                        width: "85%",
                        height: "85%",
                        userSelect: "none",
                        cursor: canDrag(sq) ? "grab" : "default",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={PIECE_SVG(sq.type, sq.color)}
                        alt={`${sq.color === "w" ? "White" : "Black"} ${sq.type}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          // it's ok if the IMAGE has pointer events off,
                          // because the WRAPPER is the draggable target
                          pointerEvents: "none",
                          filter: isDark(r, c)
                            ? "drop-shadow(0 1px 0 rgba(0,0,0,.35))"
                            : "none",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Overlays (kept inside the board container, so they won't cover the right column) */}
        {engine.isCheck() && !engine.isGameOver() && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-xl">
              CHECK!
            </div>
          </div>
        )}
        {engine.isGameOver() && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
            <div className="bg-white p-8 rounded-lg shadow-2xl text-center">
              <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-3xl font-bold mb-2">Game Over</h2>
              {engine.isCheckmate() && (
                <p className="text-xl text-gray-700">
                  {engine.getCurrentTurn() === "white" ? "Black" : "White"} wins
                  by checkmate!
                </p>
              )}
              {engine.isStalemate() && (
                <p className="text-xl text-gray-700">Draw by stalemate</p>
              )}
              {engine.isDraw() && !engine.isStalemate() && (
                <p className="text-xl text-gray-700">Draw</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

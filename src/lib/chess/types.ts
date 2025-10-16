// src/lib/chess/types.ts
import { Square, Move } from "chess.js";

export interface ChessGameState {
  fen: string;
  moveHistory: string[];
  currentTurn: "white" | "black";
  isGameOver: boolean;
  winner: "white" | "black" | "draw" | null;
  lastMove: Move | null;
  evaluation: number; // Positive = white advantage, negative = black
  capturedPieces: {
    white: string[];
    black: string[];
  };
}

export interface AgentMove {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
  reasoning: string;
  evaluation: number;
  alternativeMoves?: Array<{
    move: string;
    evaluation: number;
    reason: string;
  }>;
  thinkingTime: number;
}

export interface ChessAgent {
  id: string;
  name: string;
  color: "white" | "black";
  personality: "aggressive" | "defensive" | "strategic";
  rating: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
}

export interface MoveAnnotation {
  move: string;
  quality:
    | "brilliant"
    | "great"
    | "good"
    | "inaccuracy"
    | "mistake"
    | "blunder";
  symbol: string; // !!, !, !?, ?!, ?, ??
  explanation: string;
}

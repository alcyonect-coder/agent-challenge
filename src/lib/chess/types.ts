// src/lib/chess/types.ts
import { Move } from "chess.js";

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

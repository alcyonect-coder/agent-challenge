// src/lib/chess/ChessEngine.ts
import { Chess, Move, Square } from "chess.js";
import { ChessGameState } from "./types";

export class ChessEngine {
  private game: Chess;
  private moveHistory: string[];

  constructor(fen?: string) {
    this.game = new Chess(fen);
    this.moveHistory = [];
  }

  makeMove(
    from: Square,
    to: Square,
    promotion?: "q" | "r" | "b" | "n"
  ): Move | null {
    // pre-validate against legal moves to avoid exceptions
    const legal = this.game
      .moves({ square: from, verbose: true })
      .some(
        (m) =>
          m.from === from &&
          m.to === to &&
          (promotion ? m.promotion === promotion : true)
      );
    if (!legal) return null;

    const move = this.game.move({ from, to, promotion });
    if (move) this.moveHistory.push(this.game.fen());
    return move;
  }

  makeMoveSAN(san: string): Move | null {
    // fast path: refuse obvious junk without logging
    if (!san || typeof san !== "string") return null;

    try {
      const move = this.game.move(san);
      if (move) this.moveHistory.push(this.game.fen());
      return move;
    } catch {
      return null;
    }
  }

  undoMove(): void {
    this.game.undo();
    this.moveHistory.pop();
  }

  getLegalMoves(square?: Square): Move[] {
    return this.game.moves({ square, verbose: true });
  }

  getAllLegalMoves(): Move[] {
    return this.game.moves({ verbose: true });
  }

  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  isCheckmate(): boolean {
    return this.game.isCheckmate();
  }

  isStalemate(): boolean {
    return this.game.isStalemate();
  }

  isDraw(): boolean {
    return this.game.isDraw();
  }

  isCheck(): boolean {
    return this.game.isCheck();
  }

  getCurrentTurn(): "white" | "black" {
    return this.game.turn() === "w" ? "white" : "black";
  }

  getFen(): string {
    return this.game.fen();
  }

  getPgn(): string {
    return this.game.pgn();
  }

  getGameState(): ChessGameState {
    let winner: "white" | "black" | "draw" | null = null;

    if (this.isGameOver()) {
      if (this.isCheckmate()) {
        winner = this.getCurrentTurn() === "white" ? "black" : "white";
      } else if (this.isDraw() || this.isStalemate()) {
        winner = "draw";
      }
    }

    return {
      fen: this.getFen(),
      moveHistory: [...this.moveHistory],
      currentTurn: this.getCurrentTurn(),
      isGameOver: this.isGameOver(),
      winner,
      lastMove: this.game.history({ verbose: true }).slice(-1)[0] || null,
      evaluation: this.evaluatePosition(),
      capturedPieces: this.getCapturedPieces(),
    };
  }

  // Simple position evaluation (material count)
  evaluatePosition(): number {
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    const board = this.game.board();
    let evaluation = 0;

    board.forEach((row) => {
      row.forEach((square) => {
        if (square) {
          const value = pieceValues[square.type];
          evaluation += square.color === "w" ? value : -value;
        }
      });
    });

    return evaluation;
  }

  getCapturedPieces(): { white: string[]; black: string[] } {
    const initial = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
      k: 1,
    };

    const current: Record<string, { w: number; b: number }> = {
      p: { w: 0, b: 0 },
      n: { w: 0, b: 0 },
      b: { w: 0, b: 0 },
      r: { w: 0, b: 0 },
      q: { w: 0, b: 0 },
      k: { w: 0, b: 0 },
    };

    const board = this.game.board();
    board.forEach((row) => {
      row.forEach((square) => {
        if (square) {
          current[square.type][square.color]++;
        }
      });
    });

    const captured = { white: [] as string[], black: [] as string[] };

    Object.keys(initial).forEach((piece) => {
      if (piece === "k") return; // Kings can't be captured

      const whiteLost =
        initial[piece as keyof typeof initial] - current[piece].w;
      const blackLost =
        initial[piece as keyof typeof initial] - current[piece].b;

      for (let i = 0; i < blackLost; i++) {
        captured.white.push(piece.toUpperCase());
      }
      for (let i = 0; i < whiteLost; i++) {
        captured.black.push(piece);
      }
    });

    return captured;
  }

  reset(): void {
    this.game.reset();
    this.moveHistory = [];
  }

  loadFen(fen: string): boolean {
    try {
      this.game.load(fen);
      this.moveHistory = [fen];
      return true;
    } catch {
      return false;
    }
  }
}

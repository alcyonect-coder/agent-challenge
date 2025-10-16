// src/app/page.tsx - NO COPILOTKIT VERSION
"use client";

import CustomChessBoard from "@/components/CustomChessBoard";
import { ChessEngine } from "@/lib/chess/ChessEngine";
import { Square } from "chess.js";
import { Brain, Play, RotateCcw, Shield, Swords, User } from "lucide-react";
import { useEffect, useState } from "react";

type AgentType = "strategic" | "aggressive" | "defensive" | "human";
type MoveEntry = {
  move: string;
  reasoning: string;
  side: "white" | "black";
};
type Promotion = "q" | "r" | "b" | "n";
type LegalMove = {
  from: Square;
  to: Square;
  san: string;
  promotion?: Promotion;
};

type AIMoveResponse = {
  success: boolean;
  index?: number;
  uci?: string;
  san?: string;
  reasoning?: string;
  error?: string;
};

export default function Home() {
  const [engine, setEngine] = useState<ChessEngine>(() => new ChessEngine());
  const [gameKey, setGameKey] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [whiteAgent, setWhiteAgent] = useState<AgentType>("human");
  const [blackAgent, setBlackAgent] = useState<AgentType>("strategic");
  const [flashTurn, setFlashTurn] = useState(false);

  const [moveHistory, setMoveHistory] = useState<Array<MoveEntry>>([]);

  const [autoPlay, setAutoPlay] = useState(false);
  const [mode, setMode] = useState<"human-vs-ai" | "ai-vs-ai">("human-vs-ai");
  // Quand un pion atteint la 8e (ou 1re) rangée, on stocke le coup en attente
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    side: "white" | "black";
  } | null>(null);

  const flashTurnOnce = () => {
    setFlashTurn(true);
    setTimeout(() => setFlashTurn(false), 250);
  };

  const startPromotion = (
    from: Square,
    to: Square,
    side: "white" | "black"
  ) => {
    setPendingPromotion({ from, to, side });
  };

  const confirmPromotion = (p: Promotion) => {
    if (!pendingPromotion) return;
    const { from, to, side } = pendingPromotion;

    // applique la promotion via le moteur
    const applied = engine.makeMove(from, to, p);
    if (!applied) {
      flashTurnOnce();
      setPendingPromotion(null);
      return;
    }

    setEngine(new ChessEngine(engine.getFen()));
    const label = applied.san ?? `${from}${to}${p}`;
    setMoveHistory((prev) => [
      ...prev,
      { move: label, reasoning: "👤 Human promotion", side },
    ]);
    setPendingPromotion(null);

    // enchaîner l'IA si on est en human-vs-ai
    if (mode === "human-vs-ai") setTimeout(() => void makeAIMove(), 500);
  };

  const cancelPromotion = () => setPendingPromotion(null);

  const handleMove = (from: Square, to: Square): boolean => {
    const moverSide: "white" | "black" = engine.getCurrentTurn();
    // 1) détecter si (from, to) est un coup de promotion possible
    //    on cherche dans les coups légaux un coup EXACT avec promotion définie
    const legalNow = engine.getAllLegalMoves() as LegalMove[];
    const promoCandidate = legalNow.find(
      (m) => m.from === from && m.to === to && m.promotion
    );
    if (promoCandidate) {
      // ouvrir l’overlay de choix
      startPromotion(from, to, moverSide);
      return false; // on n’applique pas encore le coup
    }

    // 2) sinon coup normal (inchangé)
    const move = engine.makeMove(from, to);
    if (!move) {
      flashTurnOnce();
      return false;
    }
    setEngine(new ChessEngine(engine.getFen()));
    setMoveHistory((prev) => [
      ...prev,
      { move: move.san, reasoning: "👤 Human move", side: moverSide },
    ]);
    if (mode === "human-vs-ai") setTimeout(() => void makeAIMove(), 500);
    return true;
  };

  const makeAIMove = async (attempt = 1) => {
    if (engine.isGameOver() || isThinking) return;

    const turn = engine.getCurrentTurn();
    const agentType: AgentType = turn === "white" ? whiteAgent : blackAgent;
    if (agentType === "human") return;

    setIsThinking(true);
    const fenAtStart = engine.getFen();

    try {
      // src/app/page.tsx (inside makeAIMove)
      const res = await fetch("/api/chess-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType,
          fen: fenAtStart,
          legalMovesVerbose: engine.getAllLegalMoves(), // <— verbose
          materialBalance: engine.evaluatePosition(),
          isCheck: engine.isCheck(),
        }),
      });
      const data: AIMoveResponse = await res.json();
      if (!data.success) throw new Error(data.error);

      // ignore if position has changed while we were waiting
      if (engine.getFen() !== fenAtStart) return;

      // Prefer index/uci from server (AI chose), then apply locally
      if (typeof data.index === "number") {
        const legalNow: LegalMove[] = engine.getAllLegalMoves() as LegalMove[];
        const choice = legalNow[data.index];
        if (!choice) throw new Error(`Index out of range: ${data.index}`);

        // Apply by coordinates to avoid SAN pitfalls
        const applied = engine.makeMove(
          choice.from,
          choice.to,
          choice.promotion
        );
        if (!applied)
          throw new Error(`Illegal move at apply time (idx=${data.index})`);

        setEngine(new ChessEngine(engine.getFen()));
        setMoveHistory((prev) => [
          ...prev,
          {
            move: choice.san,
            reasoning: `🤖 ${agentType.toUpperCase()}: ${data.reasoning}`,
            side: turn,
          },
        ]);
      } else if (data.uci) {
        // fallback if you return uci
        const legalNow: LegalMove[] = engine.getAllLegalMoves() as LegalMove[];
        const choice = legalNow.find(
          (m) => m.from + m.to + (m.promotion ?? "") === data.uci
        );

        if (!choice) throw new Error(`UCI not legal: ${data.uci}`);
        const applied = engine.makeMove(
          choice.from,
          choice.to,
          choice.promotion
        );
        if (!applied) throw new Error(`Illegal UCI at apply time: ${data.uci}`);

        setEngine(new ChessEngine(engine.getFen()));
        setMoveHistory((prev) => [
          ...prev,
          {
            move: choice.san,
            reasoning: `🤖 ${agentType.toUpperCase()}: ${data.reasoning}`,
            side: turn,
          },
        ]);
      } else {
        // --- SAN fallback ---
        if (!data.san) {
          throw new Error("AI did not return SAN move");
        }
        const san = data.san as string;

        const applied = engine.makeMoveSAN(san); // data.san est sûr ici
        if (!applied) throw new Error(`Illegal SAN from AI: ${san}`);

        setEngine(new ChessEngine(engine.getFen()));
        setMoveHistory((prev) => [
          ...prev,
          {
            move: san, // string garanti
            reasoning: `🤖 ${agentType.toUpperCase()}: ${data.reasoning ?? "no reasoning"}`,
            side: turn,
          },
        ]);
      }
    } catch (e: unknown) {
      console.error("AI move failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      flashTurnOnce();
      setMoveHistory((prev) => [
        ...prev,
        {
          move: "—",
          reasoning: `⚠️ AI error (${msg}). Retrying...`,
          side: turn,
        },
      ]);
      if (attempt < 3) {
        setTimeout(() => void makeAIMove(attempt + 1), attempt * 800);
        return;
      }
    } finally {
      setIsThinking(false);
    }
  };
  useEffect(() => {
    if (autoPlay && !engine.isGameOver() && !isThinking) {
      const timer = setTimeout(() => makeAIMove(), 2000);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, engine, isThinking]);

  const handleRestart = () => {
    setEngine(new ChessEngine());
    setGameKey((prev) => prev + 1);
    setMoveHistory([]);
    setAutoPlay(false);
  };

  const handleModeChange = (newMode: "human-vs-ai" | "ai-vs-ai") => {
    setMode(newMode);
    if (newMode === "human-vs-ai") {
      setWhiteAgent("human");
      // keep the current blackAgent (user can choose)
    } else {
      setWhiteAgent("strategic");
      setBlackAgent("aggressive");
    }
    handleRestart();
  };

  const currentAgent =
    engine.getCurrentTurn() === "white" ? whiteAgent : blackAgent;
  const isHumanTurn = currentAgent === "human";

  const sideRowClass = (side: "white" | "black") =>
    side === "white"
      ? "border-sky-400 bg-sky-50 text-sky-900"
      : "border-violet-400 bg-violet-50 text-violet-900";

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            ♟️ Chess AI Tournament
          </h1>
          <p className="text-lg text-gray-600">
            Mastra AI Agents Playing Strategic Chess
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Nosana Builders Challenge: Agents 102
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => handleModeChange("human-vs-ai")}
            disabled={autoPlay || isThinking}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 ${
              mode === "human-vs-ai"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <User className="w-5 h-5" />
            Human vs AI
          </button>
          <button
            onClick={() => handleModeChange("ai-vs-ai")}
            disabled={autoPlay || isThinking}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 ${
              mode === "ai-vs-ai"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Brain className="w-5 h-5" />
            AI vs AI
          </button>
        </div>

        {isHumanTurn && mode === "human-vs-ai" && !engine.isGameOver() && (
          <div className="text-center mb-4 p-4 bg-yellow-100 rounded-lg animate-pulse">
            <p className="text-sm font-semibold text-yellow-800">
              🎮 Your turn! Drag a piece to move
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Agent Selection */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">⬜ White Player</h2>
              <div className="space-y-2">
                {mode === "human-vs-ai" && (
                  <div className="w-full p-3 rounded-lg flex items-center gap-3 bg-purple-600 text-white">
                    <User className="w-5 h-5" />
                    <span className="font-medium">Human (You)</span>
                  </div>
                )}
                {mode === "ai-vs-ai" && (
                  <>
                    {(["strategic", "aggressive", "defensive"] as const).map(
                      (type) => (
                        <button
                          key={type}
                          onClick={() => setWhiteAgent(type)}
                          disabled={autoPlay || isThinking}
                          className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all disabled:opacity-50 ${
                            whiteAgent === type
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          {type === "strategic" && (
                            <Brain className="w-5 h-5" />
                          )}
                          {type === "aggressive" && (
                            <Swords className="w-5 h-5" />
                          )}
                          {type === "defensive" && (
                            <Shield className="w-5 h-5" />
                          )}
                          <span className="capitalize font-medium">{type}</span>
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">⬛ Black Player</h2>
              <div className="space-y-2">
                {(["strategic", "aggressive", "defensive"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setBlackAgent(type)}
                      disabled={autoPlay || isThinking}
                      className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all disabled:opacity-50 ${
                        blackAgent === type
                          ? "bg-gray-800 text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {type === "strategic" && <Brain className="w-5 h-5" />}
                      {type === "aggressive" && <Swords className="w-5 h-5" />}
                      {type === "defensive" && <Shield className="w-5 h-5" />}
                      <span className="capitalize font-medium">{type}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">🎮 Controls</h2>
              <div className="space-y-2">
                {mode === "ai-vs-ai" && (
                  <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    disabled={engine.isGameOver()}
                    className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 font-bold disabled:opacity-50 ${
                      autoPlay
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    <Play className="w-5 h-5" />
                    {autoPlay ? "Pause Auto-Play" : "Start Auto-Play"}
                  </button>
                )}

                {!isHumanTurn && !autoPlay && (
                  <button
                    onClick={() => void makeAIMove()}
                    disabled={isThinking || engine.isGameOver()}
                    className="w-full p-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isThinking ? "🤔 AI Thinking..." : "🎯 Make AI Move"}
                  </button>
                )}

                <button
                  onClick={handleRestart}
                  className="w-full p-3 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  New Game
                </button>
              </div>
            </div>
          </div>

          {/* Center - Chess Board */}
          <div>
            <CustomChessBoard
              key={gameKey}
              engine={engine}
              onMove={handleMove}
              currentAgent={currentAgent}
              isThinking={isThinking}
              flashTurn={flashTurn}
            />
          </div>

          {/* Right Panel - Game Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">📊 Game Status</h2>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Mode:</strong>{" "}
                  {mode === "human-vs-ai" ? "👤 Human vs AI" : "🤖 AI vs AI"}
                </p>
                <p>
                  <strong>Turn:</strong>{" "}
                  {engine.getCurrentTurn() === "white"
                    ? "⬜ White"
                    : "⬛ Black"}
                </p>
                <p>
                  <strong>Material:</strong>{" "}
                  {engine.evaluatePosition() > 0
                    ? `⬜ +${engine.evaluatePosition()}`
                    : engine.evaluatePosition() < 0
                      ? `⬛ ${engine.evaluatePosition()}`
                      : "⚖️ Equal"}
                </p>
                <p>
                  <strong>Moves:</strong> {moveHistory.length}
                </p>
                {engine.isCheck() && !engine.isGameOver() && (
                  <p className="text-red-600 font-bold animate-pulse">
                    ⚠️ CHECK!
                  </p>
                )}
                {engine.isGameOver() && (
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-green-800 font-bold">🏁 GAME OVER</p>
                    {engine.isCheckmate() && (
                      <p className="text-sm mt-1">
                        {engine.getCurrentTurn() === "white"
                          ? "⬛ Black"
                          : "⬜ White"}{" "}
                        wins by checkmate!
                      </p>
                    )}
                    {engine.isStalemate() && (
                      <p className="text-sm mt-1">Draw by stalemate</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">📜 Move History</h2>
              <div className="space-y-3">
                {moveHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No moves yet.
                    <br />
                    {mode === "human-vs-ai"
                      ? "Make your first move!"
                      : "Start the game!"}
                  </p>
                ) : (
                  moveHistory
                    .slice()
                    .reverse()
                    .map((entry, idx) => (
                      <div
                        key={idx}
                        className={`border-l-4 pl-3 py-2 rounded-sm ${sideRowClass(
                          entry.side
                        )}`}
                      >
                        <div className="font-bold text-sm">
                          {" "}
                          {entry.side === "white" ? "⬜" : "⬛"} {entry.move}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {entry.reasoning}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        {pendingPromotion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-80">
              <h3 className="text-lg font-semibold mb-4">Choose promotion</h3>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => confirmPromotion("q")}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold"
                  title="Queen"
                >
                  ♕
                </button>
                <button
                  onClick={() => confirmPromotion("r")}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold"
                  title="Rook"
                >
                  ♖
                </button>
                <button
                  onClick={() => confirmPromotion("b")}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold"
                  title="Bishop"
                >
                  ♗
                </button>
                <button
                  onClick={() => confirmPromotion("n")}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold"
                  title="Knight"
                >
                  ♘
                </button>
              </div>

              <button
                onClick={cancelPromotion}
                className="mt-5 w-full px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Mastra AI Framework & Nosana Decentralized Compute</p>
          <p className="mt-1">Model: Qwen3:8b via Ollama</p>
        </div>
      </div>
    </main>
  );
}

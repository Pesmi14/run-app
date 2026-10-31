
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";

type GameStatus = "ready" | "running" | "over";

type ScoreEntry = {
  name: string;
  score: number;
  date: string;
};

type Obstacle = {
  x: number;
  width: number;
  height: number;
};

type Game = {
  lift: number;
  velocity: number;
  score: number;
  speed: number;
  spawnTimer: number;
  obstacles: Obstacle[];
};

const WIDTH = 640;
const HEIGHT = 190;
const GROUND = 150;
const STORAGE_KEY = "sprintuy-run-leaderboard";

function newGame(): Game {
  return {
    lift: 0,
    velocity: 0,
    score: 0,
    speed: 5,
    spawnTimer: 85,
    obstacles: [],
  };
}

function drawRunner(ctx: CanvasRenderingContext2D, lift: number) {
  const x = 70;
  const y = GROUND - lift;

  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = "#2563eb";
  ctx.fillStyle = "#2563eb";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Hlava
  ctx.beginPath();
  ctx.arc(0, -33, 6, 0, Math.PI * 2);
  ctx.fill();

  // Tělo
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(-3, -12);
  ctx.stroke();

  // Ruce
  ctx.beginPath();
  ctx.moveTo(-1, -23);
  ctx.lineTo(10, -19);
  ctx.lineTo(15, -26);
  ctx.moveTo(-1, -22);
  ctx.lineTo(-12, -17);
  ctx.stroke();

  // Nohy
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.lineTo(8, -7);
  ctx.lineTo(14, 0);
  ctx.moveTo(-3, -12);
  ctx.lineTo(-13, -6);
  ctx.lineTo(-17, 0);
  ctx.stroke();

  ctx.restore();
}

function drawGame(
  ctx: CanvasRenderingContext2D,
  game: Game,
  status: GameStatus
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Dekorace pozadí
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;

  for (let i = 0; i < 4; i++) {
    const x = i * 175 + 60;

    ctx.beginPath();
    ctx.moveTo(x, 45 + (i % 2) * 22);
    ctx.lineTo(x + 24, 45 + (i % 2) * 22);
    ctx.stroke();
  }

  // Zem
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND + 2);
  ctx.lineTo(WIDTH, GROUND + 2);
  ctx.stroke();

  // Čárky na zemi
  const offset = (game.score * 1.8) % 50;

  ctx.strokeStyle = "#d1d5db";

  for (let x = -50; x < WIDTH + 50; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x - offset, GROUND + 15);
    ctx.lineTo(x + 20 - offset, GROUND + 15);
    ctx.stroke();
  }

  // Překážky
  for (const obstacle of game.obstacles) {
    const y = GROUND - obstacle.height;

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.roundRect(
      obstacle.x,
      y,
      obstacle.width,
      obstacle.height,
      4
    );
    ctx.fill();

    // Světlý proužek
    ctx.fillStyle = "#ffedd5";
    ctx.fillRect(
      obstacle.x + 4,
      y + 8,
      Math.max(2, obstacle.width - 8),
      4
    );
  }

  drawRunner(ctx, game.lift);

  // Skóre
  ctx.textAlign = "right";
  ctx.fillStyle = "#374151";
  ctx.font = "bold 13px monospace";
  ctx.fillText(
    "SCORE " + Math.floor(game.score).toString().padStart(5, "0"),
    WIDTH - 20,
    25
  );

  if (status === "ready") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b";
    ctx.font = "13px sans-serif";
    ctx.fillText(
      "PRESS SPACE OR TAP TO START",
      WIDTH / 2,
      89
    );
  }

  if (status === "over") {
    ctx.fillStyle = "rgba(250,250,250,0.75)";
    ctx.fillRect(180, 42, 280, 76);

    ctx.textAlign = "center";
    ctx.fillStyle = "#111827";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("GAME OVER", WIDTH / 2, 75);

    ctx.fillStyle = "#64748b";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      "Tap or press Space to retry",
      WIDTH / 2,
      98
    );
  }
}

export default function SprintuyRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>(newGame());
  const statusRef = useRef<GameStatus>("ready");

  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);

  const changeStatus = useCallback((next: GameStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // Načtení lokálních rekordů
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter(
              (entry): entry is ScoreEntry =>
                entry !== null &&
                typeof entry === "object" &&
                typeof entry.name === "string" &&
                typeof entry.score === "number" &&
                Number.isFinite(entry.score) &&
                typeof entry.date === "string"
            )
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          setLeaderboard(valid);
        }
      }
    } catch {
      setLeaderboard([]);
    }
  }, []);

  const jump = useCallback(() => {
    const currentStatus = statusRef.current;

    if (currentStatus !== "running") {
      gameRef.current = newGame();

      // První skok zároveň spustí hru
      gameRef.current.velocity = 11.5;

      setScore(0);
      setSaved(false);
      changeStatus("running");
      return;
    }

    const game = gameRef.current;

    // Skok pouze při dopadu
    if (game.lift <= 0.5) {
      game.velocity = 11.5;
    }
  }, [changeStatus]);

  // Klávesnice
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" && event.code !== "ArrowUp") {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "BUTTON" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();

      if (!event.repeat) {
        jump();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump]);

  // Herní smyčka
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    let frameId = 0;
    let previousTime = 0;
    let lastScoreUpdate = 0;

    function frame(time: number) {
      if (!ctx) return;

      const game = gameRef.current;

      const dt = previousTime
        ? Math.min((time - previousTime) / 16.667, 2)
        : 1;

      previousTime = time;

      if (statusRef.current === "running") {
        // Gravitace a skákání
        game.lift += game.velocity * dt;
        game.velocity -= 0.58 * dt;

        if (game.lift < 0) {
          game.lift = 0;
          game.velocity = 0;
        }

        game.score += 0.19 * dt;
        game.speed = Math.min(11, 5 + game.score / 140);

        // Generování překážek
        game.spawnTimer -= dt;

        if (game.spawnTimer <= 0) {
          const height = 24 + Math.random() * 14;

          game.obstacles.push({
            x: WIDTH + 20,
            width: 17 + Math.random() * 10,
            height,
          });

          game.spawnTimer =
            72 + Math.random() * 45 - Math.min(game.speed * 2, 15);
        }

        for (const obstacle of game.obstacles) {
          obstacle.x -= game.speed * dt;
        }

        game.obstacles = game.obstacles.filter(
          (obstacle) => obstacle.x + obstacle.width > -10
        );

        // Kolize běžce s překážkou
        const runnerLeft = 58;
        const runnerRight = 82;
        const runnerTop = GROUND - game.lift - 38;
        const runnerBottom = GROUND - game.lift;

        for (const obstacle of game.obstacles) {
          const obstacleTop = GROUND - obstacle.height;

          const collision =
            runnerRight > obstacle.x + 3 &&
            runnerLeft < obstacle.x + obstacle.width - 3 &&
            runnerBottom > obstacleTop + 4 &&
            runnerTop < GROUND;

          if (collision) {
            setScore(Math.floor(game.score));
            changeStatus("over");
            break;
          }
        }

        // Aktualizace zobrazeného skóre
        if (time - lastScoreUpdate > 120) {
          setScore(Math.floor(game.score));
          lastScoreUpdate = time;
        }
      }

      drawGame(ctx, game, statusRef.current);

      if (statusRef.current === "running") {
        frameId = requestAnimationFrame(frame);
      }
    }

    if (status === "running") {
      frameId = requestAnimationFrame(frame);
    } else {
      drawGame(ctx, gameRef.current, status);
    }

    return () => cancelAnimationFrame(frameId);
  }, [status, changeStatus]);

  function saveScore() {
    const cleanName = name.trim().slice(0, 16);

    if (!cleanName || saved || score <= 0) return;

    const entry: ScoreEntry = {
      name: cleanName,
      score,
      date: new Date().toISOString(),
    };

    const updated = [...leaderboard, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    setLeaderboard(updated);
    setSaved(true);
  }

  return (
    <section className="sprintuy-game">
      <div className="game-heading">
        <div>
          <span className="game-eyebrow">TAKE A BREAK</span>
          <h2>
            SPRINTUY <span>RUN.</span>
          </h2>
          <p>Jump. Survive. Beat your record.</p>
        </div>

        <div className="game-live-score">
          <small>SCORE</small>
          <strong>{score.toString().padStart(5, "0")}</strong>
        </div>
      </div>

      <div className="game-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          onPointerDown={(event) => {
            event.preventDefault();
            jump();
          }}
          aria-label="Sprintuy Run jumping game"
        />
      </div>

      <div className="game-controls">
        <span>SPACE / ↑ / TAP TO JUMP</span>

        <button type="button" onClick={jump}>
          <RotateCcw size={14} />
          {status === "ready"
            ? "Play"
            : status === "over"
              ? "Retry"
              : "Jump"}
        </button>
      </div>

      {status === "over" && !saved && score > 0 && (
        <form
          className="game-save"
          onSubmit={(event) => {
            event.preventDefault();
            saveScore();
          }}
        >
          <div>
            <strong>Nice run!</strong>
            <p>Save your score to the leaderboard.</p>
          </div>

          <div className="game-save-inputs">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your nickname"
              maxLength={16}
              required
            />

            <button type="submit">Save score</button>
          </div>
        </form>
      )}

      {status === "over" && saved && (
        <p className="game-saved-message">
          ✓ Score saved to your local leaderboard!
        </p>
      )}

      <div className="game-leaderboard">
        <div className="leaderboard-title">
          <div>
            <Trophy size={17} />
            <h3>Leaderboard</h3>
          </div>
          <span>TOP 5</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            No records yet. Be the first to set one.
          </div>
        ) : (
          <div className="leaderboard-rows">
            {leaderboard.map((entry, index) => (
              <div
                className="leaderboard-row"
                key={`${entry.date}-${index}`}
              >
                <span className="leaderboard-position">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="leaderboard-name">
                  {entry.name}
                </span>

                <strong>{entry.score} pts</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="leaderboard-disclaimer">
        Local records only · Global leaderboard coming soon
      </p>
    </section>
  );
}

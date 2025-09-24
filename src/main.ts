import { Game, CANVAS_SIZE } from "./game";
import { renderGame } from "./ui";

const canvasElement = document.getElementById("gameCanvas");
if (!(canvasElement instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element #gameCanvas not found");
}
const canvas = canvasElement;
const context = canvas.getContext("2d");
if (!context) {
  throw new Error("2D rendering context not available");
}
const ctx = context;

ctx.imageSmoothingEnabled = true;

const game = new Game();
const FIXED_STEP = 1 / 120;
const MAX_DELTA = 0.1; // prevent spiral of death from long frames
let accumulator = 0;
let lastTime = performance.now();

function updateLoop(time: number): void {
  const deltaSeconds = Math.min((time - lastTime) / 1000, MAX_DELTA);
  lastTime = time;
  accumulator += deltaSeconds;

  while (accumulator >= FIXED_STEP) {
    game.update(FIXED_STEP);
    accumulator -= FIXED_STEP;
  }

  renderGame(ctx, game.getRenderState());
  requestAnimationFrame(updateLoop);
}

function resizeCanvas(): void {
  const header = document.querySelector(".top-bar") as HTMLElement | null;
  const headerHeight = header?.offsetHeight ?? 0;
  const availableHeight = Math.max(200, window.innerHeight - headerHeight);
  const availableWidth = Math.max(200, window.innerWidth);
  const scale = Math.min(1, availableWidth / CANVAS_SIZE, availableHeight / CANVAS_SIZE);
  const cssSize = CANVAS_SIZE * scale;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") {
    game.reset();
  }
});

requestAnimationFrame(updateLoop);

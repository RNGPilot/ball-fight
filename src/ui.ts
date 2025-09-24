import { ARENA_PADDING, ARENA_SIZE, CANVAS_SIZE, getWeaponHeadPosition } from "./game";
import { FighterInstance, GameRenderState } from "./types";

const BOTTOM_PANEL_HEIGHT = 120;
const ARENA_BACKGROUND = "#111827";
const ARENA_BORDER = "#000000";
const PANEL_BACKGROUND = "rgba(15, 23, 42, 0.9)";
const PANEL_TEXT = "#e2e8f0";
const HP_FONT = "bold 22px 'Orbitron', 'Segoe UI', sans-serif";
const LABEL_FONT = "600 20px 'Orbitron', 'Segoe UI', sans-serif";
const PANEL_FONT = "500 16px 'Segoe UI', sans-serif";
const WINNER_FONT = "700 42px 'Orbitron', 'Segoe UI', sans-serif";

export function renderGame(ctx: CanvasRenderingContext2D, state: GameRenderState): void {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawBackground(ctx);
  drawArena(ctx);
  drawTopLabels(ctx, state);

  for (const fighter of state.fighters) {
    drawShield(ctx, fighter);
  }

  for (const fighter of state.fighters) {
    drawBurnAura(ctx, fighter);
    drawFighterBody(ctx, fighter);
    drawArm(ctx, fighter);
    drawHP(ctx, fighter);
  }

  drawBottomPanel(ctx, state.fighters);

  if (state.isFinished && state.winnerName) {
    drawWinnerText(ctx, state.winnerName);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.restore();
}

function drawArena(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = ARENA_BACKGROUND;
  ctx.fillRect(ARENA_PADDING, ARENA_PADDING, ARENA_SIZE, ARENA_SIZE);
  ctx.lineWidth = 8;
  ctx.strokeStyle = ARENA_BORDER;
  ctx.strokeRect(ARENA_PADDING, ARENA_PADDING, ARENA_SIZE, ARENA_SIZE);
  ctx.restore();
}

function drawTopLabels(ctx: CanvasRenderingContext2D, state: GameRenderState): void {
  const label = `${state.fighters[0].stats.name} VS ${state.fighters[1].stats.name}`;
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.font = LABEL_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, CANVAS_SIZE / 2, ARENA_PADDING - 16);
  ctx.restore();
}

function drawFighterBody(ctx: CanvasRenderingContext2D, fighter: FighterInstance): void {
  const { position } = fighter.state;
  const { radius, colors } = fighter.stats;
  ctx.save();
  ctx.fillStyle = colors.body;
  ctx.strokeStyle = colors.ring;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawArm(ctx: CanvasRenderingContext2D, fighter: FighterInstance): void {
  const { position } = fighter.state;
  const { arm, colors } = fighter.stats;
  const weaponHead = getWeaponHeadPosition(fighter);
  ctx.save();
  ctx.strokeStyle = "rgba(226, 232, 240, 0.6)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(position.x, position.y);
  ctx.lineTo(weaponHead.x, weaponHead.y);
  ctx.stroke();

  ctx.fillStyle = "rgba(248, 113, 113, 0.8)";
  ctx.beginPath();
  ctx.arc(weaponHead.x, weaponHead.y, arm.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors.ring;
  ctx.stroke();
  ctx.restore();
}

function drawHP(ctx: CanvasRenderingContext2D, fighter: FighterInstance): void {
  const { position, hp } = fighter.state;
  const { colors } = fighter.stats;
  ctx.save();
  ctx.font = HP_FONT;
  ctx.fillStyle = colors.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 6;
  ctx.fillText(Math.round(hp).toString(), position.x, position.y);
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, fighter: FighterInstance): void {
  const { shieldPct, radius } = fighter.stats;
  if (shieldPct <= 0) {
    return;
  }
  const { position } = fighter.state;
  ctx.save();
  ctx.strokeStyle = "rgba(96, 165, 250, 0.35)";
  ctx.lineWidth = 10;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBurnAura(ctx: CanvasRenderingContext2D, fighter: FighterInstance): void {
  if (!fighter.state.burn) {
    return;
  }
  const { position } = fighter.state;
  const { radius } = fighter.stats;
  const time = performance.now() / 120;
  const alpha = 0.35 + 0.25 * Math.sin(time + fighter.id);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 95, 31, ${alpha.toFixed(2)})`;
  ctx.lineWidth = 14;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "rgba(255, 99, 71, 0.8)";
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBottomPanel(ctx: CanvasRenderingContext2D, fighters: FighterInstance[]): void {
  const panelTop = CANVAS_SIZE - BOTTOM_PANEL_HEIGHT;
  ctx.save();
  ctx.fillStyle = PANEL_BACKGROUND;
  ctx.fillRect(0, panelTop, CANVAS_SIZE, BOTTOM_PANEL_HEIGHT);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, panelTop);
  ctx.lineTo(CANVAS_SIZE, panelTop);
  ctx.stroke();

  ctx.font = PANEL_FONT;
  ctx.fillStyle = PANEL_TEXT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const padding = 24;
  const lineHeight = 22;
  fighters.forEach((fighter, index) => {
    const lineY = panelTop + padding + index * (lineHeight * 2);
    ctx.fillStyle = PANEL_TEXT;
    ctx.font = "600 18px 'Segoe UI', sans-serif";
    ctx.fillText(fighter.stats.name, padding, lineY);
    ctx.font = PANEL_FONT;
    const info = buildStatLine(fighter);
    ctx.fillText(info, padding, lineY + lineHeight);
  });

  ctx.font = "500 14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Press R to restart", padding, panelTop + BOTTOM_PANEL_HEIGHT - 24);
  ctx.restore();
}

function buildStatLine(fighter: FighterInstance): string {
  const { stats } = fighter;
  const shieldPct = Math.round(stats.shieldPct * 100);
  const burn = stats.burnPerTick > 0 ? `${stats.burnPerTick}` : "0";
  return `DMG: ${stats.baseDamage} | Hellfire: ${stats.hellfireDamage} | Burn DMG: ${burn}/tick | Demon DMG: ${stats.demonDamage} | Shield: ${shieldPct}% | Speed: ${stats.speedMultiplier.toFixed(2)} | Dmg: ${stats.damageMultiplier.toFixed(2)}`;
}

function drawWinnerText(ctx: CanvasRenderingContext2D, winnerName: string): void {
  ctx.save();
  ctx.font = WINNER_FONT;
  ctx.fillStyle = "#fbbf24";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(251, 191, 36, 0.5)";
  ctx.shadowBlur = 24;
  ctx.fillText(`${winnerName} Wins!`, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  ctx.restore();
}

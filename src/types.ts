export interface Vector2 {
  x: number;
  y: number;
}

export interface ArmStats {
  length: number;
  radius: number;
  angularSpeed: number; // radians per second
}

export interface FighterColors {
  body: string;
  ring: string;
  text: string;
}

export interface FighterStats {
  name: string;
  maxHP: number;
  baseDamage: number;
  hellfireDamage: number;
  burnPerTick: number;
  burnTickMs: number;
  burnDurationMs: number;
  demonDamage: number;
  shieldPct: number;
  speedMultiplier: number;
  damageMultiplier: number;
  radius: number;
  arm: ArmStats;
  colors: FighterColors;
}

export interface BurnState {
  remainingMs: number;
  tickTimer: number;
  baseTickDamage: number;
  sourceId: number;
  tickInterval: number;
}

export interface FighterState {
  position: Vector2;
  velocity: Vector2;
  armAngle: number;
  hp: number;
  burn?: BurnState;
  weaponCollidingWith: Set<number>;
  bodyCollidingWith: Set<number>;
}

export interface FighterInstance {
  id: number;
  stats: FighterStats;
  state: FighterState;
}

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DamageContext {
  attacker: FighterInstance;
  defender: FighterInstance;
  amount: number;
  source: "weapon" | "burn" | "demon";
}

export interface GameRenderState {
  fighters: FighterInstance[];
  arena: ArenaBounds;
  isFinished: boolean;
  winnerName?: string;
}

import {
  ArenaBounds,
  BurnState,
  FighterInstance,
  FighterState,
  FighterStats,
  GameRenderState,
  Vector2
} from "./types";

export const CANVAS_SIZE = 900;
export const ARENA_SIZE = 760;
export const ARENA_PADDING = (CANVAS_SIZE - ARENA_SIZE) / 2;

export const DEVIL: FighterStats = {
  name: "Devil",
  maxHP: 500,
  baseDamage: 5,
  hellfireDamage: 10,
  burnPerTick: 2,
  burnTickMs: 400,
  burnDurationMs: 3000,
  demonDamage: 1,
  shieldPct: 0.3,
  speedMultiplier: 1.0,
  damageMultiplier: 1.0,
  radius: 36,
  arm: { length: 60, radius: 10, angularSpeed: 2.4 },
  colors: { body: "#4c0b0b", ring: "#2b0000", text: "#00ff00" }
};

export const UNARMED: FighterStats = {
  name: "Unarmed",
  maxHP: 250,
  baseDamage: 4,
  hellfireDamage: 0,
  burnPerTick: 0,
  burnTickMs: 0,
  burnDurationMs: 0,
  demonDamage: 0,
  shieldPct: 0,
  speedMultiplier: 1.0,
  damageMultiplier: 1.0,
  radius: 28,
  arm: { length: 45, radius: 8, angularSpeed: 2.0 },
  colors: { body: "#9aa0a6", ring: "#6b7280", text: "#00ff00" }
};

const TWO_PI = Math.PI * 2;
const BASE_SPEED = 140;

const MASS_SCALE = 0.5; // used to derive pseudo-mass from radius for impulse calculations
const KNOCKBACK_STRENGTH = 0.6;

function createArena(): ArenaBounds {
  return {
    minX: ARENA_PADDING,
    maxX: CANVAS_SIZE - ARENA_PADDING,
    minY: ARENA_PADDING,
    maxY: CANVAS_SIZE - ARENA_PADDING
  };
}

function cloneVector(v: Vector2): Vector2 {
  return { x: v.x, y: v.y };
}

function subtract(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function multiply(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

function length(v: Vector2): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Vector2): Vector2 {
  const len = length(v);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

function deriveMass(radius: number): number {
  return Math.max(1, radius * radius * MASS_SCALE);
}

function randomAngle(rng: () => number, towards: number): number {
  const spread = Math.PI / 2; // 90 degree cone
  return towards + (rng() - 0.5) * spread;
}

function makeVelocity(stats: FighterStats, rng: () => number, facing: number): Vector2 {
  const angle = randomAngle(rng, facing);
  const speed = BASE_SPEED * stats.speedMultiplier;
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  };
}

function createFighter(id: number, stats: FighterStats, position: Vector2, rng: () => number): FighterInstance {
  const velocity = makeVelocity(stats, rng, id === 0 ? 0 : Math.PI);
  const state: FighterState = {
    position: cloneVector(position),
    velocity,
    armAngle: rng() * TWO_PI,
    hp: stats.maxHP,
    weaponCollidingWith: new Set<number>(),
    bodyCollidingWith: new Set<number>()
  };
  return { id, stats, state };
}

export function getWeaponHeadPosition(fighter: FighterInstance): Vector2 {
  const { state, stats } = fighter;
  const dx = Math.cos(state.armAngle) * stats.arm.length;
  const dy = Math.sin(state.armAngle) * stats.arm.length;
  return {
    x: state.position.x + dx,
    y: state.position.y + dy
  };
}

export class Game {
  private arena: ArenaBounds;
  private fighters: FighterInstance[];
  private rng: () => number;
  private finished = false;
  private winnerName?: string;

  constructor(rng?: () => number) {
    this.rng = rng ?? Math.random;
    this.arena = createArena();
    this.fighters = [];
    this.reset();
  }

  reset(): void {
    const center = CANVAS_SIZE / 2;
    const horizontalOffset = ARENA_SIZE / 4;
    this.arena = createArena();
    this.finished = false;
    this.winnerName = undefined;

    this.fighters = [
      createFighter(0, DEVIL, { x: center - horizontalOffset, y: center }, this.rng),
      createFighter(1, UNARMED, { x: center + horizontalOffset, y: center }, this.rng)
    ];
  }

  update(dtSeconds: number): void {
    if (this.finished) {
      return;
    }

    const dtMs = dtSeconds * 1000;

    for (const fighter of this.fighters) {
      this.integrateMotion(fighter, dtSeconds);
      this.wrapArmAngle(fighter, dtSeconds);
      this.resolveWallCollisions(fighter);
    }

    this.resolveFighterCollisions();
    this.resolveWeaponHits();

    for (const fighter of this.fighters) {
      this.tickBurn(fighter, dtMs);
    }

    this.checkForWinner();
  }

  getRenderState(): GameRenderState {
    return {
      fighters: this.fighters,
      arena: this.arena,
      isFinished: this.finished,
      winnerName: this.winnerName
    };
  }

  private integrateMotion(fighter: FighterInstance, dt: number): void {
    const { state } = fighter;
    state.position.x += state.velocity.x * dt;
    state.position.y += state.velocity.y * dt;
    const dampingFactor = Math.max(0, 1 - 0.1 * dt);
    state.velocity.x *= dampingFactor;
    state.velocity.y *= dampingFactor;
  }

  private wrapArmAngle(fighter: FighterInstance, dt: number): void {
    const { state, stats } = fighter;
    state.armAngle += stats.arm.angularSpeed * dt;
    state.armAngle = (state.armAngle + TWO_PI) % TWO_PI;
  }

  private resolveWallCollisions(fighter: FighterInstance): void {
    const { state, stats } = fighter;
    const minX = this.arena.minX + stats.radius;
    const maxX = this.arena.maxX - stats.radius;
    const minY = this.arena.minY + stats.radius;
    const maxY = this.arena.maxY - stats.radius;

    if (state.position.x < minX) {
      state.position.x = minX;
      state.velocity.x = Math.abs(state.velocity.x);
    } else if (state.position.x > maxX) {
      state.position.x = maxX;
      state.velocity.x = -Math.abs(state.velocity.x);
    }

    if (state.position.y < minY) {
      state.position.y = minY;
      state.velocity.y = Math.abs(state.velocity.y);
    } else if (state.position.y > maxY) {
      state.position.y = maxY;
      state.velocity.y = -Math.abs(state.velocity.y);
    }
  }

  private resolveFighterCollisions(): void {
    const [a, b] = this.fighters;
    const diff = subtract(a.state.position, b.state.position);
    const distance = length(diff);
    const minDistance = a.stats.radius + b.stats.radius;

    if (distance === 0) {
      diff.x = 1;
      diff.y = 0;
    }

    if (distance < minDistance) {
      const normal = normalize(diff);
      const penetration = minDistance - distance;
      const correction = multiply(normal, penetration / 2);
      a.state.position.x += correction.x;
      a.state.position.y += correction.y;
      b.state.position.x -= correction.x;
      b.state.position.y -= correction.y;

      const relativeVelocity = subtract(a.state.velocity, b.state.velocity);
      const velAlongNormal = dot(relativeVelocity, normal);

      if (velAlongNormal < 0) {
        const restitution = 1; // perfectly elastic
        const massA = deriveMass(a.stats.radius);
        const massB = deriveMass(b.stats.radius);
        const impulseScalar = (-(1 + restitution) * velAlongNormal) / (1 / massA + 1 / massB);
        const impulse = multiply(normal, impulseScalar);
        a.state.velocity = add(a.state.velocity, multiply(impulse, 1 / massA));
        b.state.velocity = subtract(b.state.velocity, multiply(impulse, 1 / massB));
      }

      if (!a.state.bodyCollidingWith.has(b.id)) {
        this.handleBodyGraze(a, b);
      }
      a.state.bodyCollidingWith.add(b.id);
      b.state.bodyCollidingWith.add(a.id);
    } else {
      a.state.bodyCollidingWith.delete(b.id);
      b.state.bodyCollidingWith.delete(a.id);
    }
  }

  private resolveWeaponHits(): void {
    const [a, b] = this.fighters;
    this.processWeaponHit(a, b);
    this.processWeaponHit(b, a);
  }

  private processWeaponHit(attacker: FighterInstance, defender: FighterInstance): void {
    const weaponPos = getWeaponHeadPosition(attacker);
    const toDefender = subtract(weaponPos, defender.state.position);
    const distanceSq = dot(toDefender, toDefender);
    const reach = attacker.stats.arm.radius + defender.stats.radius;

    if (distanceSq <= reach * reach) {
      if (!attacker.state.weaponCollidingWith.has(defender.id)) {
        this.handleWeaponImpact(attacker, defender, weaponPos);
      }
      attacker.state.weaponCollidingWith.add(defender.id);
    } else {
      attacker.state.weaponCollidingWith.delete(defender.id);
    }
  }

  private handleWeaponImpact(attacker: FighterInstance, defender: FighterInstance, weaponPos: Vector2): void {
    const basePacket = (attacker.stats.baseDamage + attacker.stats.hellfireDamage) * attacker.stats.damageMultiplier;
    this.applyDamage(attacker, defender, basePacket, "weapon");
    this.applyBurn(attacker, defender);
    this.applyKnockback(attacker, defender);
  }

  private handleBodyGraze(a: FighterInstance, b: FighterInstance): void {
    const damageA = a.stats.demonDamage * a.stats.damageMultiplier;
    const damageB = b.stats.demonDamage * b.stats.damageMultiplier;
    if (damageA > 0) {
      this.applyDamage(a, b, damageA, "demon");
    }
    if (damageB > 0) {
      this.applyDamage(b, a, damageB, "demon");
    }
  }

  private applyDamage(attacker: FighterInstance, defender: FighterInstance, amount: number, source: "weapon" | "burn" | "demon"): void {
    if (amount <= 0 || defender.state.hp <= 0) {
      return;
    }
    const mitigated = amount * (1 - defender.stats.shieldPct);
    if (mitigated <= 0) {
      return;
    }
    defender.state.hp = Math.max(0, defender.state.hp - mitigated);
  }

  private applyBurn(attacker: FighterInstance, defender: FighterInstance): void {
    const { burnPerTick, burnDurationMs, burnTickMs, damageMultiplier } = attacker.stats;
    if (burnPerTick <= 0 || burnDurationMs <= 0 || burnTickMs <= 0) {
      return;
    }
    const burn: BurnState = {
      remainingMs: burnDurationMs,
      tickTimer: burnTickMs,
      baseTickDamage: burnPerTick * damageMultiplier,
      sourceId: attacker.id,
      tickInterval: burnTickMs
    };
    defender.state.burn = burn;
  }

  private tickBurn(target: FighterInstance, dtMs: number): void {
    const burn = target.state.burn;
    if (!burn) {
      return;
    }
    burn.remainingMs -= dtMs;
    burn.tickTimer -= dtMs;

    const source = this.fighters.find((f) => f.id === burn.sourceId) ?? target;

    while (burn.remainingMs > 0 && burn.tickTimer <= 0) {
      this.applyDamage(source, target, burn.baseTickDamage, "burn");
      burn.tickTimer += burn.tickInterval;
    }

    if (burn.remainingMs <= 0) {
      target.state.burn = undefined;
    }
  }

  private applyKnockback(attacker: FighterInstance, defender: FighterInstance): void {
    const tangent = this.getWeaponTangent(attacker);
    const armTipSpeed = Math.abs(attacker.stats.arm.angularSpeed) * attacker.stats.arm.length;
    const armVelocity = multiply(tangent, armTipSpeed);
    const relative = subtract(add(attacker.state.velocity, armVelocity), defender.state.velocity);
    const relAlongTangent = dot(relative, tangent);
    const impulseMagnitude = relAlongTangent * KNOCKBACK_STRENGTH;
    if (impulseMagnitude === 0) {
      return;
    }
    const massAttacker = deriveMass(attacker.stats.radius);
    const massDefender = deriveMass(defender.stats.radius);
    const impulse = multiply(tangent, impulseMagnitude);
    defender.state.velocity = add(defender.state.velocity, multiply(impulse, 1 / massDefender));
    attacker.state.velocity = subtract(attacker.state.velocity, multiply(impulse, 1 / massAttacker));
  }

  private getWeaponTangent(fighter: FighterInstance): Vector2 {
    const { state, stats } = fighter;
    const tangent = {
      x: -Math.sin(state.armAngle),
      y: Math.cos(state.armAngle)
    };
    if (stats.arm.angularSpeed < 0) {
      tangent.x *= -1;
      tangent.y *= -1;
    }
    return normalize(tangent);
  }

  private checkForWinner(): void {
    const alive = this.fighters.filter((f) => f.state.hp > 0);
    if (alive.length === 2) {
      return;
    }

    this.finished = true;
    if (alive.length === 1) {
      this.winnerName = alive[0].stats.name;
    } else {
      this.winnerName = "Draw";
    }
  }
}

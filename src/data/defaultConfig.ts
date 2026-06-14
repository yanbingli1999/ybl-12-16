import type { GameConfig } from '../types';

export const defaultConfig: GameConfig = {
  overheatThreshold: 10,
  shieldAbsorptionRate: 0.7,
  critMultiplier: 2.0,
  critBonusRate: 0.25,
  repairCooldown: 2,
  energyCostPerPoint: 1,
  scanEvasionReduction: 0.1,
  engineEvasionBonus: 0.05,
  maxRerolls: 2,
  diceCount: 5,
  enemyDamageVariance: 0.2,
  partArmorDamageReduction: 0.3,
  weaponArrayAttackReduction: 0.4,
  thrusterEvasionReduction: 0.6,
  shieldGeneratorShieldPenalty: 0.5,
  repairCoreHealReduction: 0.5,
  commandBridgeDisruptChance: 0.6,
  exposedPartDamageBonus: 0.3,
  weakPointCritBonus: 0.3,
};

import type { 
  Ship, Enemy, Die, CabinType, DamageResult, BattleLogEntry,
  GameConfig, AllocationResult, EnemyIntent, EnemyPart
} from '../types';

export interface PartDamageResult {
  partId: string;
  damage: number;
  wasDestroyed: boolean;
  armorAbsorbed: number;
  exposedBonus: boolean;
  weakPointBonus: boolean;
}

export function calculateDamage(
  baseDamage: number,
  attackerCritRate: number,
  defenderEvasion: number,
  defenderDefense: number,
  config: GameConfig,
  guaranteedCrit: boolean = false
): DamageResult {
  if (Math.random() < defenderEvasion) {
    return {
      damage: 0,
      shieldAbsorbed: 0,
      isCrit: false,
      isMiss: true,
    };
  }

  let damage = baseDamage;
  let isCrit = guaranteedCrit || Math.random() < attackerCritRate;

  if (isCrit) {
    damage *= config.critMultiplier;
  }

  damage *= (1 - defenderDefense);
  damage = Math.max(1, Math.floor(damage));

  return {
    damage,
    shieldAbsorbed: 0,
    isCrit,
    isMiss: false,
  };
}

export function applyShieldAbsorption(
  damageResult: DamageResult,
  currentShield: number,
  config: GameConfig
): { damage: number; shieldAbsorbed: number; remainingShield: number } {
  if (damageResult.isMiss || damageResult.damage <= 0) {
    return {
      damage: 0,
      shieldAbsorbed: 0,
      remainingShield: currentShield,
    };
  }

  const absorptionAmount = Math.min(
    damageResult.damage * config.shieldAbsorptionRate,
    currentShield
  );
  const remainingDamage = damageResult.damage - absorptionAmount;
  const remainingShield = currentShield - absorptionAmount;

  return {
    damage: Math.max(0, Math.floor(remainingDamage)),
    shieldAbsorbed: Math.floor(absorptionAmount),
    remainingShield: Math.max(0, remainingShield),
  };
}

export function calculatePartDamage(
  baseDamage: number,
  part: EnemyPart,
  config: GameConfig,
  isCrit: boolean
): PartDamageResult {
  let damage = baseDamage;
  let exposedBonus = false;
  let weakPointBonus = false;

  if (part.isExposed) {
    exposedBonus = true;
    damage *= (1 + config.exposedPartDamageBonus);
  }

  if (part.isWeakPoint && isCrit) {
    weakPointBonus = true;
    damage *= (1 + config.weakPointCritBonus);
  }

  const armorAbsorbed = Math.floor(damage * part.armor);
  damage = Math.max(1, damage - armorAbsorbed);
  damage = Math.floor(damage);

  const wasDestroyed = damage >= part.hp;

  return {
    partId: part.id,
    damage,
    wasDestroyed,
    armorAbsorbed,
    exposedBonus,
    weakPointBonus,
  };
}

export function applyPartEffects(enemy: Enemy, config: GameConfig): Enemy {
  let updatedEnemy = { ...enemy };
  let attackMultiplier = 1;
  let evasionMultiplier = 1;
  let isIntentDisrupted = false;
  let shieldPenalty = 0;
  let healPenalty = 0;

  for (const part of enemy.parts) {
    if (part.destroyed) {
      switch (part.type) {
        case 'weapon_array':
          attackMultiplier *= (1 - config.weaponArrayAttackReduction);
          break;
        case 'thruster':
          evasionMultiplier *= (1 - config.thrusterEvasionReduction);
          break;
        case 'shield_generator':
          shieldPenalty += config.shieldGeneratorShieldPenalty;
          break;
        case 'repair_core':
          healPenalty += config.repairCoreHealReduction;
          break;
        case 'command_bridge':
          if (Math.random() < config.commandBridgeDisruptChance) {
            isIntentDisrupted = true;
          }
          break;
      }
    }
  }

  updatedEnemy.attack = Math.max(1, Math.floor(updatedEnemy.baseAttack * attackMultiplier));
  updatedEnemy.evasion = Math.max(0, updatedEnemy.baseEvasion * evasionMultiplier);
  updatedEnemy.isIntentDisrupted = isIntentDisrupted;

  (updatedEnemy as any).shieldPenalty = shieldPenalty;
  (updatedEnemy as any).healPenalty = healPenalty;

  return updatedEnemy;
}

export function calculateCabinEffect(
  cabinType: CabinType,
  totalPoints: number,
  ship: Ship,
  enemy: Enemy,
  config: GameConfig
): { 
  effect: string; 
  value: number; 
  type: 'damage' | 'heal' | 'shield' | 'effect';
  isOverheated: boolean;
} {
  const cabin = ship.cabins.find(c => c.type === cabinType);
  if (!cabin || cabin.damaged) {
    return { effect: '舱室已损坏，无法工作', value: 0, type: 'effect', isOverheated: false };
  }

  const isOverheated = totalPoints > config.overheatThreshold;
  const effectivePoints = isOverheated ? 0 : totalPoints;
  const levelMultiplier = 1 + (cabin.level - 1) * 0.2;

  let result: { effect: string; value: number; type: 'damage' | 'heal' | 'shield' | 'effect' };

  switch (cabinType) {
    case 'weapon': {
      const baseDamage = ship.attack + effectivePoints * 3;
      const damage = Math.floor(baseDamage * levelMultiplier);
      result = {
        effect: isOverheated ? '武器舱过热！无法开火' : `武器系统造成 ${damage} 点伤害`,
        value: damage,
        type: 'damage',
      };
      break;
    }
    case 'shield': {
      const shieldGain = Math.floor(effectivePoints * 3 * levelMultiplier);
      result = {
        effect: isOverheated ? '护盾舱过热！无法充能' : `护盾充能 +${shieldGain}`,
        value: shieldGain,
        type: 'shield',
      };
      break;
    }
    case 'repair': {
      const healAmount = Math.floor(effectivePoints * 2 * levelMultiplier);
      result = {
        effect: isOverheated ? '维修舱过热！无法工作' : `船体修复 +${healAmount} HP`,
        value: healAmount,
        type: 'heal',
      };
      break;
    }
    case 'engine': {
      const evasionBonus = effectivePoints * config.engineEvasionBonus * levelMultiplier;
      result = {
        effect: isOverheated ? '引擎舱过热！无法机动' : `引擎推进，闪避率 +${(evasionBonus * 100).toFixed(0)}%`,
        value: evasionBonus,
        type: 'effect',
      };
      break;
    }
    case 'scanner': {
      const evasionReduction = effectivePoints * config.scanEvasionReduction * levelMultiplier;
      const scanBonus = effectivePoints >= 5;
      const effectText = isOverheated 
        ? '扫描舱过热！无法扫描' 
        : scanBonus 
          ? `深度扫描！标记所有薄弱部位，敌方闪避 -${(evasionReduction * 100).toFixed(0)}%`
          : `扫描完成，敌方闪避 -${(evasionReduction * 100).toFixed(0)}%`;
      result = {
        effect: effectText,
        value: evasionReduction,
        type: 'effect',
      };
      break;
    }
    default:
      result = { effect: '未知舱位', value: 0, type: 'effect' };
  }

  return { ...result, isOverheated };
}

export function checkOverheat(
  dice: Die[],
  cabinType: CabinType,
  config: GameConfig
): boolean {
  const totalPoints = dice
    .filter(d => d.assignedTo === cabinType)
    .reduce((sum, d) => sum + d.value, 0);
  return totalPoints > config.overheatThreshold;
}

export function getAllocations(dice: Die[]): AllocationResult[] {
  const cabinTypes: CabinType[] = ['engine', 'shield', 'weapon', 'repair', 'scanner'];
  
  return cabinTypes.map(type => {
    const assignedDice = dice.filter(d => d.assignedTo === type);
    const totalPoints = assignedDice.reduce((sum, d) => sum + d.value, 0);
    
    return {
      cabinType: type,
      totalPoints,
      diceIds: assignedDice.map(d => d.id),
      isOverheated: false,
    };
  }).filter(a => a.totalPoints > 0);
}

export function executeEnemyIntent(
  enemy: Enemy,
  player: Ship,
  config: GameConfig
): { 
  damageResult: DamageResult; 
  shieldResult: { damage: number; shieldAbsorbed: number; remainingShield: number };
  logs: BattleLogEntry[];
  newPlayerHp: number;
  newPlayerShield: number;
  effect?: string;
  healAmount?: number;
  shieldAmount?: number;
} {
  const logs: BattleLogEntry[] = [];
  const intent = enemy.intent;
  
  let baseDamage = 0;
  let guaranteedCrit = false;
  let specialEffect: string | undefined;
  let healAmount: number | undefined;
  let shieldAmount: number | undefined;

  const healPenalty = (enemy as any).healPenalty || 0;
  const shieldPenalty = (enemy as any).shieldPenalty || 0;

  switch (intent.type) {
    case 'attack':
      baseDamage = intent.value;
      logs.push(createLog('enemy', 'damage', `${enemy.name} 发动攻击！`, intent.value, 1));
      break;
    case 'charge':
      baseDamage = intent.value;
      logs.push(createLog('enemy', 'damage', `${enemy.name} 释放蓄力攻击！`, intent.value, 1));
      break;
    case 'defend':
      logs.push(createLog('enemy', 'effect', `${enemy.name} 进入防御姿态，护甲提升`, undefined, 1));
      break;
    case 'special': {
      const expectedAbilityName = intent.description.replace('准备释放 ', '');
      const specialAbility = enemy.abilities.find(
        a => a.name === expectedAbilityName && a.currentCooldown === 0
      );
      if (specialAbility) {
        baseDamage = specialAbility.damage || 0;
        guaranteedCrit = specialAbility.effect === 'crit_guaranteed';
        specialEffect = specialAbility.effect;
        logs.push(createLog('enemy', 'effect', `${enemy.name} 释放 ${specialAbility.name}！`, specialAbility.damage, 1));
      } else {
        logs.push(createLog('enemy', 'effect', `${enemy.name} 蓄力失败：${expectedAbilityName} 冷却中`, undefined, 1));
      }
      break;
    }
    case 'repair':
      const baseHeal = intent.value;
      healAmount = Math.floor(baseHeal * (1 - healPenalty));
      logs.push(createLog('enemy', 'heal', `${enemy.name} 进行维修，恢复 ${healAmount} HP`, healAmount, 1));
      break;
  }

  const damageResult = calculateDamage(
    baseDamage,
    0.1,
    player.evasion,
    player.defense,
    config,
    guaranteedCrit
  );

  if (damageResult.isMiss) {
    logs.push(createLog('player', 'miss', '成功闪避！', undefined, 1));
  }

  const shieldResult = applyShieldAbsorption(damageResult, player.shield, config);
  
  if (shieldResult.shieldAbsorbed > 0) {
    logs.push(createLog('player', 'shield', `护盾吸收了 ${shieldResult.shieldAbsorbed} 点伤害`, shieldResult.shieldAbsorbed, 1));
  }

  if (damageResult.isCrit && !damageResult.isMiss) {
    logs.push(createLog('enemy', 'crit', '暴击！', damageResult.damage, 1));
  }

  const newPlayerHp = Math.max(0, player.hp - shieldResult.damage);
  let newPlayerShield = shieldResult.remainingShield;

  if (shieldResult.damage > 0) {
    logs.push(createLog('player', 'damage', `受到 ${shieldResult.damage} 点伤害`, shieldResult.damage, 1));
  }

  if (specialEffect === 'heal_shield') {
    const baseShieldAmount = Math.floor(enemy.maxShield * 0.3);
    shieldAmount = Math.floor(baseShieldAmount * (1 - shieldPenalty));
  }

  return {
    damageResult,
    shieldResult,
    logs,
    newPlayerHp,
    newPlayerShield,
    effect: specialEffect,
    healAmount,
    shieldAmount,
  };
}

export function executePlayerActions(
  dice: Die[],
  player: Ship,
  enemy: Enemy,
  config: GameConfig,
  targetPartId: string | null = null
): {
  logs: BattleLogEntry[];
  newPlayer: Ship;
  newEnemy: Enemy;
  totalDamageDealt: number;
  totalHealDone: number;
  totalShieldGained: number;
  damagedCabins: CabinType[];
  energyUsed: number;
  damagedParts: PartDamageResult[];
  scannedParts: boolean;
} {
  const logs: BattleLogEntry[] = [];
  let newPlayer = { ...player };
  let newEnemy = { ...enemy };
  let totalDamageDealt = 0;
  let totalHealDone = 0;
  let totalShieldGained = 0;
  const damagedCabins: CabinType[] = [];
  const damagedParts: PartDamageResult[] = [];
  let playerEvasionBonus = 0;
  let enemyEvasionReduction = 0;
  let scannedParts = false;

  const totalDicePoints = dice.reduce((sum, d) => sum + d.value, 0);
  const energyCost = Math.floor(totalDicePoints * config.energyCostPerPoint);
  const actualEnergyCost = Math.min(newPlayer.energy, energyCost);
  newPlayer.energy = Math.max(0, newPlayer.energy - actualEnergyCost);

  if (actualEnergyCost > 0) {
    logs.push(createLog('player', 'effect', `消耗 ${actualEnergyCost} 能量`, actualEnergyCost, 1));
  }

  const energyShortage = energyCost > player.energy;
  const efficiencyPenalty = energyShortage ? 0.5 : 1;

  const allocations = getAllocations(dice);

  for (const allocation of allocations) {
    const cabin = player.cabins.find(c => c.type === allocation.cabinType);
    if (!cabin) continue;

    if (cabin.damaged) {
      logs.push(createLog('system', 'effect', `${cabin.name} 已损坏，无法工作`, undefined, 1));
      continue;
    }

    const isOverheated = allocation.totalPoints > config.overheatThreshold;
    if (isOverheated) {
      damagedCabins.push(allocation.cabinType);
      logs.push(createLog('system', 'effect', `${cabin.name} 过热损坏！需要 ${config.repairCooldown} 回合冷却`, undefined, 1));
    }

    const effect = calculateCabinEffect(
      allocation.cabinType,
      allocation.totalPoints * efficiencyPenalty,
      newPlayer,
      newEnemy,
      config
    );

    logs.push(createLog('player', effect.type, effect.effect, effect.value, 1));

    switch (allocation.cabinType) {
      case 'weapon': {
        if (!isOverheated) {
          const weaponDice = dice.filter(d => d.assignedTo === 'weapon');
          const sixCount = weaponDice.filter(d => d.value === 6).length;
          const bonusCritRate = sixCount * config.critBonusRate;
          const guaranteedCrit = sixCount >= 2;
          const totalCritRate = Math.min(0.9, player.critRate + bonusCritRate);

          const isCrit = guaranteedCrit || Math.random() < totalCritRate;
          let adjustedDamage = effect.value;
          if (isCrit) {
            adjustedDamage *= config.critMultiplier;
            adjustedDamage = Math.floor(adjustedDamage);
          }

          adjustedDamage *= (1 - Math.max(0, newEnemy.evasion - enemyEvasionReduction));
          adjustedDamage *= (1 - newEnemy.defense);
          adjustedDamage = Math.max(1, Math.floor(adjustedDamage));

          if (targetPartId && newEnemy.parts.length > 0) {
            const targetPart = newEnemy.parts.find(p => p.id === targetPartId && !p.destroyed);
            if (targetPart) {
              const partDamageResult = calculatePartDamage(
                adjustedDamage,
                targetPart,
                config,
                isCrit
              );

              const newPartHp = Math.max(0, targetPart.hp - partDamageResult.damage);
              const partDestroyed = newPartHp <= 0;

              newEnemy.parts = newEnemy.parts.map(p => 
                p.id === targetPart.id 
                  ? { ...p, hp: newPartHp, destroyed: partDestroyed }
                  : p
              );

              damagedParts.push({ ...partDamageResult, wasDestroyed: partDestroyed });

              logs.push(createLog('enemy', 'damage', 
                `攻击 ${targetPart.name}，造成 ${partDamageResult.damage} 点伤害${partDamageResult.armorAbsorbed > 0 ? `（护甲吸收${partDamageResult.armorAbsorbed}）` : ''}`,
                partDamageResult.damage, 1
              ));

              if (partDamageResult.exposedBonus) {
                logs.push(createLog('system', 'effect', `暴露部位伤害加成！`, undefined, 1));
              }
              if (partDamageResult.weakPointBonus) {
                logs.push(createLog('system', 'effect', `薄弱部位暴击额外伤害！`, undefined, 1));
              }
              if (partDestroyed) {
                logs.push(createLog('system', 'effect', `${targetPart.name} 已被摧毁！${targetPart.effectDescription}`, undefined, 1));
              }

              const overflowDamage = Math.max(0, partDamageResult.damage - targetPart.hp);
              const hullDamage = Math.floor(adjustedDamage * 0.5) + overflowDamage;

              if (newEnemy.shield > 0) {
                const shieldAbsorption = Math.min(
                  hullDamage * config.shieldAbsorptionRate,
                  newEnemy.shield
                );
                newEnemy.shield = Math.max(0, newEnemy.shield - shieldAbsorption);
                const hullFinal = Math.max(0, hullDamage - shieldAbsorption);
                newEnemy.hp = Math.max(0, newEnemy.hp - hullFinal);
                totalDamageDealt += hullFinal;
                if (shieldAbsorption > 0) {
                  logs.push(createLog('enemy', 'shield', `敌方护盾吸收 ${Math.floor(shieldAbsorption)} 伤害`, Math.floor(shieldAbsorption), 1));
                }
                if (hullFinal > 0) {
                  logs.push(createLog('enemy', 'damage', `船体连带伤害 ${hullFinal} 点`, hullFinal, 1));
                }
              } else {
                newEnemy.hp = Math.max(0, newEnemy.hp - hullDamage);
                totalDamageDealt += hullDamage;
                if (hullDamage > 0) {
                  logs.push(createLog('enemy', 'damage', `船体连带伤害 ${hullDamage} 点`, hullDamage, 1));
                }
              }
            } else {
              const damageResult = calculateDamage(
                effect.value,
                totalCritRate,
                Math.max(0, newEnemy.evasion - enemyEvasionReduction),
                newEnemy.defense,
                config,
                guaranteedCrit
              );

              if (damageResult.isMiss) {
                logs.push(createLog('enemy', 'miss', '敌方闪避了攻击！', undefined, 1));
              } else {
                const shieldAbsorption = applyShieldAbsorption(damageResult, newEnemy.shield, config);
                
                if (shieldAbsorption.shieldAbsorbed > 0) {
                  logs.push(createLog('enemy', 'shield', `敌方护盾吸收 ${shieldAbsorption.shieldAbsorbed} 伤害`, shieldAbsorption.shieldAbsorbed, 1));
                }
                
                if (damageResult.isCrit) {
                  logs.push(createLog('player', 'crit', '暴击！', damageResult.damage, 1));
                }

                newEnemy.shield = shieldAbsorption.remainingShield;
                newEnemy.hp = Math.max(0, newEnemy.hp - shieldAbsorption.damage);
                totalDamageDealt += shieldAbsorption.damage;
                
                if (shieldAbsorption.damage > 0) {
                  logs.push(createLog('enemy', 'damage', `敌方受到 ${shieldAbsorption.damage} 点伤害`, shieldAbsorption.damage, 1));
                }
              }
            }
          } else {
            const damageResult = calculateDamage(
              effect.value,
              totalCritRate,
              Math.max(0, newEnemy.evasion - enemyEvasionReduction),
              newEnemy.defense,
              config,
              guaranteedCrit
            );

            if (damageResult.isMiss) {
              logs.push(createLog('enemy', 'miss', '敌方闪避了攻击！', undefined, 1));
            } else {
              const shieldAbsorption = applyShieldAbsorption(damageResult, newEnemy.shield, config);
              
              if (shieldAbsorption.shieldAbsorbed > 0) {
                logs.push(createLog('enemy', 'shield', `敌方护盾吸收 ${shieldAbsorption.shieldAbsorbed} 伤害`, shieldAbsorption.shieldAbsorbed, 1));
              }
              
              if (damageResult.isCrit) {
                logs.push(createLog('player', 'crit', '暴击！', damageResult.damage, 1));
              }

              newEnemy.shield = shieldAbsorption.remainingShield;
              newEnemy.hp = Math.max(0, newEnemy.hp - shieldAbsorption.damage);
              totalDamageDealt += shieldAbsorption.damage;
              
              if (shieldAbsorption.damage > 0) {
                logs.push(createLog('enemy', 'damage', `敌方受到 ${shieldAbsorption.damage} 点伤害`, shieldAbsorption.damage, 1));
              }
            }
          }
        }
        break;
      }
      case 'shield': {
        if (!isOverheated) {
          const shieldGain = Math.min(effect.value, newPlayer.maxShield - newPlayer.shield);
          newPlayer.shield = Math.min(newPlayer.maxShield, newPlayer.shield + effect.value);
          totalShieldGained += shieldGain;
        }
        break;
      }
      case 'repair': {
        if (!isOverheated) {
          const healAmount = Math.min(effect.value, newPlayer.maxHp - newPlayer.hp);
          newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + effect.value);
          totalHealDone += healAmount;
          
          newPlayer.cabins = newPlayer.cabins.map(c => {
            if (c.damaged && c.cooldown > 0) {
              return { ...c, cooldown: c.cooldown - 1, damaged: c.cooldown - 1 > 0 };
            }
            return c;
          });
        }
        break;
      }
      case 'engine': {
        if (!isOverheated) {
          playerEvasionBonus += effect.value;
        }
        break;
      }
      case 'scanner': {
        if (!isOverheated) {
          enemyEvasionReduction += effect.value;
          if (allocation.totalPoints >= 5) {
            scannedParts = true;
            newEnemy.parts = newEnemy.parts.map(part => ({
              ...part,
              isScanned: true,
            }));
            logs.push(createLog('system', 'effect', '扫描舱深度扫描完成！已标记所有敌舰部位信息', undefined, 1));
          } else if (newEnemy.parts.length > 0) {
            const unscannedParts = newEnemy.parts.filter(p => !p.isScanned);
            if (unscannedParts.length > 0) {
              const scannedPart = unscannedParts[Math.floor(Math.random() * unscannedParts.length)];
              newEnemy.parts = newEnemy.parts.map(p => 
                p.id === scannedPart.id ? { ...p, isScanned: true } : p
              );
              logs.push(createLog('system', 'effect', `扫描到 ${scannedPart.name} 的详细信息`, undefined, 1));
            }
          }
        }
        break;
      }
    }
  }

  newPlayer.evasion = Math.min(0.8, player.evasion + playerEvasionBonus);
  newEnemy.evasion = Math.max(0, enemy.evasion - enemyEvasionReduction);

  newPlayer.cabins = newPlayer.cabins.map(c => {
    if (damagedCabins.includes(c.type)) {
      return { ...c, damaged: true, cooldown: config.repairCooldown };
    }
    if (c.cooldown > 0 && c.damaged) {
      const newCooldown = c.cooldown - 1;
      return { ...c, cooldown: newCooldown, damaged: newCooldown > 0 };
    }
    return c;
  });

  newEnemy.abilities = newEnemy.abilities.map(a => ({
    ...a,
    currentCooldown: Math.max(0, a.currentCooldown - 1),
  }));

  newEnemy = applyPartEffects(newEnemy, config);

  return {
    logs,
    newPlayer,
    newEnemy,
    totalDamageDealt,
    totalHealDone,
    totalShieldGained,
    damagedCabins,
    energyUsed: actualEnergyCost,
    damagedParts,
    scannedParts,
  };
}

function createLog(
  source: 'player' | 'enemy' | 'system',
  type: BattleLogEntry['type'],
  message: string,
  value?: number,
  turn: number = 1
): BattleLogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    turn,
    type,
    source,
    message,
    value,
    timestamp: Date.now(),
  };
}

export function checkBattleEnd(player: Ship, enemy: Enemy): 'ongoing' | 'victory' | 'defeat' {
  if (player.hp <= 0) return 'defeat';
  if (enemy.hp <= 0) return 'victory';
  return 'ongoing';
}

export function calculateReward(result: 'victory' | 'defeat' | 'fled', turns: number, difficulty: number, partsDestroyed: number = 0): number {
  if (result === 'defeat') return 0;
  if (result === 'fled') return 0;
  
  const baseReward = 10 * difficulty;
  const turnBonus = Math.max(0, 10 - turns) * difficulty;
  const partBonus = partsDestroyed * 5 * difficulty;
  return baseReward + turnBonus + partBonus;
}

export function getIntentIcon(intent: EnemyIntent): string {
  return intent.icon;
}

export function getIntentColor(intent: EnemyIntent): string {
  switch (intent.type) {
    case 'attack': return 'text-neon-red';
    case 'defend': return 'text-neon-blue';
    case 'charge': return 'text-neon-yellow';
    case 'special': return 'text-neon-purple';
    case 'repair': return 'text-neon-green';
    default: return 'text-gray-400';
  }
}

export function getPartIcon(partType: string): string {
  const icons: Record<string, string> = {
    weapon_array: '⚔️',
    shield_generator: '🛡️',
    thruster: '🚀',
    repair_core: '🔧',
    command_bridge: '🎯',
  };
  return icons[partType] || '❓';
}

export function getPartName(partType: string): string {
  const names: Record<string, string> = {
    weapon_array: '武器阵列',
    shield_generator: '护盾发生器',
    thruster: '推进器',
    repair_core: '维修核心',
    command_bridge: '指挥桥',
  };
  return names[partType] || '未知部位';
}

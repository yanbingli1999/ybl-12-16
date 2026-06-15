import React from 'react';
import { Lock, Eye, Shield, AlertTriangle, Check, Crosshair, HelpCircle } from 'lucide-react';
import type { EnemyPart } from '../../types';

interface EnemyPartsProps {
  parts: EnemyPart[];
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  disabled?: boolean;
}

export const EnemyParts: React.FC<EnemyPartsProps> = ({ 
  parts, 
  selectedPartId, 
  onSelectPart,
  disabled = false 
}) => {
  if (parts.length === 0) {
    return null;
  }

  const getPartHpColor = (part: EnemyPart) => {
    const percent = (part.hp / part.maxHp) * 100;
    if (percent > 60) return 'bg-neon-green';
    if (percent > 30) return 'bg-neon-yellow';
    return 'bg-neon-red';
  };

  const isPartSelectable = (part: EnemyPart): boolean => {
    if (disabled || part.destroyed) return false;
    if (part.isExposed || part.isScanned) return true;
    return false;
  };

  const getPartBorderClass = (part: EnemyPart) => {
    const selectable = isPartSelectable(part);
    
    if (part.destroyed) return 'border-gray-600 bg-gray-800/50 opacity-60';
    if (selectedPartId === part.id) return 'border-neon-yellow bg-neon-yellow/10 ring-2 ring-neon-yellow/50';
    if (!part.isScanned && !part.isExposed) return 'border-space-600 bg-space-800/50';
    if (part.isScanned && part.isWeakPoint) return 'border-neon-purple/60 bg-neon-purple/5';
    if (part.isExposed && part.isScanned) return 'border-neon-orange/60 bg-neon-orange/5';
    if (part.isExposed) return 'border-neon-orange/40 bg-neon-orange/5';
    return selectable 
      ? 'border-space-500 hover:border-space-400 bg-space-800/30'
      : 'border-space-600 bg-space-800/20';
  };

  const handlePartClick = (part: EnemyPart) => {
    if (!isPartSelectable(part)) return;
    if (selectedPartId === part.id) {
      onSelectPart(null);
    } else {
      onSelectPart(part.id);
    }
  };

  const getPartDisplayName = (part: EnemyPart): string => {
    if (part.isScanned || part.isExposed) return part.name;
    return '未知部位';
  };

  const getPartDisplayIcon = (part: EnemyPart): string => {
    if (part.isScanned || part.isExposed) return part.icon;
    return '❓';
  };

  return (
    <div className="glass-panel neon-border-red p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-display text-neon-red">
          <Crosshair className="w-4 h-4 inline mr-1" />
          敌舰部位
        </h4>
        {selectedPartId && (
          <button
            onClick={() => onSelectPart(null)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            disabled={disabled}
          >
            取消选择
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {parts.map(part => {
          const hpPercent = (part.hp / part.maxHp) * 100;
          const canTarget = isPartSelectable(part);
          const isHidden = !part.isScanned && !part.isExposed;

          return (
            <div
              key={part.id}
              onClick={() => handlePartClick(part)}
              className={`
                relative p-3 rounded-lg border-2 transition-all duration-200
                ${canTarget ? 'cursor-pointer' : 'cursor-not-allowed'}
                ${getPartBorderClass(part)}
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{getPartDisplayIcon(part)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`font-display font-bold text-sm ${part.destroyed ? 'text-gray-500 line-through' : isHidden ? 'text-gray-500' : 'text-white'}`}>
                      {getPartDisplayName(part)}
                    </span>
                    {part.destroyed && (
                      <Check className="w-3 h-3 text-gray-500" />
                    )}
                    {isHidden && (
                      <HelpCircle className="w-3 h-3 text-gray-600" />
                    )}
                    {!isHidden && part.isScanned && part.isWeakPoint && !part.destroyed && (
                      <span className="flex items-center text-xs text-neon-purple" title="薄弱部位 - 暴击额外伤害">
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                    {!isHidden && part.isExposed && !part.destroyed && (
                      <span className="flex items-center text-xs text-neon-orange" title="暴露部位 - 伤害加成">
                        <Eye className="w-3 h-3" />
                      </span>
                    )}
                    {!part.isScanned && !part.isExposed && !part.destroyed && (
                      <span className="flex items-center text-xs text-gray-600" title="需要扫描">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  {part.isScanned && !part.destroyed && (
                    <p className="text-xs text-gray-500 truncate">{part.description}</p>
                  )}
                  {isHidden && !part.destroyed && (
                    <p className="text-xs text-gray-600">扫描后查看详情</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {part.isScanned ? `护甲 ${(part.armor * 100).toFixed(0)}%` : part.isExposed ? '低护甲' : '未知'}
                  </span>
                  <span className={`font-display ${part.destroyed ? 'text-gray-500' : isHidden ? 'text-gray-600' : 'text-white'}`}>
                    {part.destroyed ? '已摧毁' : isHidden ? '?/? HP' : `${part.hp}/${part.maxHp}`}
                  </span>
                </div>
                <div className="stat-bar">
                  <div
                    className={`stat-bar-fill ${part.destroyed ? 'bg-gray-600' : isHidden ? 'bg-gray-700' : getPartHpColor(part)}`}
                    style={{ width: `${part.destroyed ? 100 : isHidden ? 100 : hpPercent}%` }}
                  />
                </div>
              </div>

              {part.destroyed && part.effectDescription && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-neon-green/80">
                    ✓ {part.effectDescription}
                  </p>
                </div>
              )}

              {!part.destroyed && part.isScanned && part.effectDescription && (
                <div className="mt-2 pt-2 border-t border-space-600">
                  <p className="text-xs text-gray-500 italic">
                    破坏后：{part.effectDescription}
                  </p>
                </div>
              )}

              {selectedPartId === part.id && !part.destroyed && (
                <div className="absolute -top-2 -right-2 bg-neon-yellow text-space-900 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  目标
                </div>
              )}

              {!canTarget && !part.destroyed && !isHidden && (
                <div className="absolute inset-0 bg-space-900/30 rounded-lg pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-space-600">
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-neon-orange" />
            <span>暴露 +伤害</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-neon-purple" />
            <span>薄弱 +暴击</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-gray-500" />
            <span>需扫描锁定</span>
          </div>
        </div>
      </div>
    </div>
  );
};

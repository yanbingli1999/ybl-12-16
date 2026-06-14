import React from 'react';
import { Lock, Eye, Shield, AlertTriangle, Check, Crosshair } from 'lucide-react';
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

  const getPartBorderClass = (part: EnemyPart) => {
    if (part.destroyed) return 'border-gray-600 bg-gray-800/50 opacity-60';
    if (selectedPartId === part.id) return 'border-neon-yellow bg-neon-yellow/10 ring-2 ring-neon-yellow/50';
    if (part.isScanned && part.isWeakPoint) return 'border-neon-purple/60 bg-neon-purple/5';
    if (part.isExposed) return 'border-neon-orange/60';
    return 'border-space-600 hover:border-space-500';
  };

  const handlePartClick = (part: EnemyPart) => {
    if (disabled || part.destroyed) return;
    if (selectedPartId === part.id) {
      onSelectPart(null);
    } else {
      onSelectPart(part.id);
    }
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
          const canTarget = !disabled && !part.destroyed;

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
                <span className="text-xl">{part.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`font-display font-bold text-sm ${part.destroyed ? 'text-gray-500 line-through' : 'text-white'}`}>
                      {part.name}
                    </span>
                    {part.destroyed && (
                      <Check className="w-3 h-3 text-gray-500" />
                    )}
                    {part.isScanned && part.isWeakPoint && !part.destroyed && (
                      <span className="flex items-center text-xs text-neon-purple" title="薄弱部位">
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                    {part.isExposed && !part.destroyed && (
                      <span className="flex items-center text-xs text-neon-orange" title="暴露部位">
                        <Eye className="w-3 h-3" />
                      </span>
                    )}
                    {!part.isScanned && !part.destroyed && (
                      <span className="flex items-center text-xs text-gray-500" title="需要扫描">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  {part.isScanned && (
                    <p className="text-xs text-gray-500 truncate">{part.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {part.isScanned ? `护甲 ${(part.armor * 100).toFixed(0)}%` : '未知'}
                  </span>
                  <span className={`font-display ${part.destroyed ? 'text-gray-500' : 'text-white'}`}>
                    {part.destroyed ? '已摧毁' : `${part.hp}/${part.maxHp}`}
                  </span>
                </div>
                <div className="stat-bar">
                  <div
                    className={`stat-bar-fill ${part.destroyed ? 'bg-gray-600' : getPartHpColor(part)}`}
                    style={{ width: `${part.destroyed ? 100 : hpPercent}%` }}
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
                <div className="mt-2 pt-2 border-t border-gray-700">
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
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-space-600">
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-neon-orange" />
            <span>暴露部位 +伤害</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-neon-purple" />
            <span>薄弱部位 +暴击</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-gray-500" />
            <span>需扫描</span>
          </div>
        </div>
      </div>
    </div>
  );
};

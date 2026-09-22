import React from 'react';
import { ShoulderExercise, OperatedSide, ShoulderUserConfig } from '../types';
import { Dumbbell, RotateCcw, Target, ShieldAlert, CheckSquare, Square } from 'lucide-react';

interface ShoulderControlBarProps {
  shoulderExercise: ShoulderExercise;
  setShoulderExercise: (exercise: ShoulderExercise) => void;
  operatedSide: OperatedSide;
  setOperatedSide: (side: OperatedSide) => void;
  shoulderConfig: ShoulderUserConfig;
  setShoulderConfig: React.Dispatch<React.SetStateAction<ShoulderUserConfig>>;
  onResetSessionMaxROM: () => void;
}

export const ShoulderControlBar: React.FC<ShoulderControlBarProps> = ({
  shoulderExercise,
  setShoulderExercise,
  operatedSide,
  setOperatedSide,
  shoulderConfig,
  setShoulderConfig,
  onResetSessionMaxROM,
}) => {
  const handleTargetChange = (val: string) => {
    const num = parseInt(val, 10);
    setShoulderConfig((prev) => ({
      ...prev,
      targetROM: isNaN(num) || num <= 0 ? null : Math.min(180, num),
    }));
  };

  const handleMaxAllowedChange = (val: string) => {
    const num = parseInt(val, 10);
    setShoulderConfig((prev) => ({
      ...prev,
      maximumAllowedROM: isNaN(num) || num <= 0 ? null : Math.min(180, num),
    }));
  };

  return (
    <div className="bg-white border border-[#DEDECF] rounded-[24px] p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Row: Exercise Selector & Operated Side & Reset */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Exercise Selection (Requirement 12) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A70]">
            어깨 운동 동작 선택 (Exercise)
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShoulderExercise('abduction')}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                shoulderExercise === 'abduction'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#F5F5F0] text-[#5A5A40] hover:bg-[#E8E8DF]'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>외전 (Abduction: 옆으로 들기)</span>
            </button>

            <button
              onClick={() => setShoulderExercise('flexion')}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                shoulderExercise === 'flexion'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#F5F5F0] text-[#5A5A40] hover:bg-[#E8E8DF]'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>굴곡 (Flexion: 앞으로 들기)</span>
            </button>
          </div>
        </div>

        {/* Operated Side Selector (Requirement 13) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A70]">
            수술측 / 집중 관찰측 (Operated Side)
          </label>
          <div className="flex items-center space-x-2">
            {(['none', 'left', 'right'] as OperatedSide[]).map((side) => (
              <button
                key={side}
                onClick={() => setOperatedSide(side)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  operatedSide === side
                    ? 'bg-[#FF6321] text-white shadow-xs'
                    : 'bg-[#F5F5F0] text-[#5A5A40] hover:bg-[#E8E8DF]'
                }`}
              >
                {side === 'none' ? '미지정 (None)' : side === 'left' ? '왼쪽 (Left)' : '오른쪽 (Right)'}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Session Max ROM Button (Requirement 16) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A70]">
            측정 초기화
          </label>
          <button
            onClick={onResetSessionMaxROM}
            className="px-3.5 py-2 rounded-2xl bg-[#F5F5F0] hover:bg-[#E8E8DF] border border-[#DEDECF] text-[#5A5A40] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>최대 ROM 리셋 (Reset Max)</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: User-Defined Target ROM & Maximum Allowed ROM & Rep Counter Toggle (Requirements 14, 21) */}
      <div className="pt-3 border-t border-[#F0F0E8] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Target ROM input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#5A5A40] flex items-center space-x-1">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>의료진 지정 목표 ROM (Target)</span>
            </span>
            <span className="text-[10px] text-[#8A8A70]">
              {shoulderConfig.targetROM !== null ? `${shoulderConfig.targetROM}°` : '미설정'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="10"
              max="180"
              step="5"
              placeholder="예: 90"
              value={shoulderConfig.targetROM ?? ''}
              onChange={(e) => handleTargetChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#FDFDFB] border border-[#DEDECF] rounded-xl text-xs text-[#2D2D24] focus:outline-none focus:border-[#FF6321]"
            />
            <span className="text-[#8A8A70]">도(°)</span>
          </div>
        </div>

        {/* Maximum Allowed ROM input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#5A5A40] flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-[#FF6321]" />
              <span>최대 허용 제한각 (Max Allowed)</span>
            </span>
            <span className="text-[10px] text-[#8A8A70]">
              {shoulderConfig.maximumAllowedROM !== null ? `${shoulderConfig.maximumAllowedROM}°` : '미설정'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="10"
              max="180"
              step="5"
              placeholder="예: 100"
              value={shoulderConfig.maximumAllowedROM ?? ''}
              onChange={(e) => handleMaxAllowedChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#FDFDFB] border border-[#DEDECF] rounded-xl text-xs text-[#2D2D24] focus:outline-none focus:border-[#D9381E]"
            />
            <span className="text-[#8A8A70]">도(°)</span>
          </div>
        </div>

        {/* Enable Rep Counter Toggle (Requirement 21) */}
        <div className="flex items-center justify-between sm:justify-end space-x-3 pt-4 sm:pt-0">
          <button
            onClick={() =>
              setShoulderConfig((prev) => ({
                ...prev,
                enableRepCounter: !prev.enableRepCounter,
              }))
            }
            className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
              shoulderConfig.enableRepCounter
                ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                : 'bg-[#F5F5F0] text-[#5A5A40] border-[#DEDECF] hover:bg-[#E8E8DF]'
            }`}
          >
            {shoulderConfig.enableRepCounter ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-[#8A8A70]" />
            )}
            <span>반복 운동 카운트 (Rep Counter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

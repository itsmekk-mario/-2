import React from 'react';
import { JointAngles, GaitPhase } from '../types';
import { Activity, AlertTriangle, ShieldCheck, Footprints, Info } from 'lucide-react';

interface GaitAnalyzerProps {
  angles: JointAngles | null;
  gaitPhase: GaitPhase;
  stiffKneeCount: number;
  totalGaitCycles: number;
  avgSwingFlexionLeft: number;
  avgSwingFlexionRight: number;
}

export const GaitAnalyzer: React.FC<GaitAnalyzerProps> = ({
  angles,
  gaitPhase,
  stiffKneeCount,
  totalGaitCycles,
  avgSwingFlexionLeft,
  avgSwingFlexionRight,
}) => {
  const currentLeftFlexion = angles ? angles.leftKneeFlexion : 0;
  const currentRightFlexion = angles ? angles.rightKneeFlexion : 0;

  // Stiff knee ratio
  const stiffRatio = totalGaitCycles > 0 ? (stiffKneeCount / totalGaitCycles) * 100 : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-950 text-blue-400 border border-blue-800/80 rounded-xl">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">보행 주기 및 뻣뻣한 무릎(Stiff Knee) 분석</h3>
            <p className="text-xs text-slate-400">정상 보행 유각기(Swing Phase) 무릎 굴곡 62° 검증</p>
          </div>
        </div>

        {/* Gait Phase Pill */}
        <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">
            {gaitPhase === 'INITIAL_CONTACT'
              ? '초기 접지 (Initial Contact)'
              : gaitPhase === 'STANCE_PHASE'
              ? '입각기 (Stance Phase)'
              : gaitPhase === 'SWING_PHASE'
              ? '유각기 (Swing Phase)'
              : '보행 감지 중'}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Stiff Knee Alert Count */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className={`text-2xl sm:text-3xl font-black font-mono ${stiffKneeCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stiffKneeCount}회
          </span>
          <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1 mt-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>뻣뻣한 무릎 보행 감지</span>
          </span>
        </div>

        {/* Average Swing Flexion Left */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            {avgSwingFlexionLeft > 0 ? `${avgSwingFlexionLeft.toFixed(1)}°` : `${currentLeftFlexion.toFixed(1)}°`}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1">
            좌측 유각기 평균 굴곡 (목표 62°)
          </span>
        </div>

        {/* Average Swing Flexion Right */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {avgSwingFlexionRight > 0 ? `${avgSwingFlexionRight.toFixed(1)}°` : `${currentRightFlexion.toFixed(1)}°`}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1">
            우측 유각기 평균 굴곡 (목표 62°)
          </span>
        </div>
      </div>

      {/* Clinical Explanation Notice */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>뻣뻣한 무릎 보행(Stiff Knee Gait) 임상 메커니즘</span>
        </div>
        <p className="pl-5 text-[11px] leading-relaxed">
          유각기(Swing Phase) 동안 다리가 전방으로 나아갈 때 무릎 굴곡 각도가 45° 미만으로 제한되는 현상입니다. 슬괵근 경직, 하퇴삼두근 약화, 뇌성마비, 또는 슬관절 수술 후 연골연화증 위험 요인이 되므로 가동범위 회복 운동이 권장됩니다.
        </p>
      </div>
    </div>
  );
};

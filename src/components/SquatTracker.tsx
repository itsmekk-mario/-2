import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { JointAngles, SquatPhase } from '../types';
import { Dumbbell, Award, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface SquatTrackerProps {
  angles: JointAngles | null;
  squatPhase: SquatPhase;
  repCount: number;
  goodFormReps: number;
  shallowReps: number;
  asymmetricReps: number;
}

export const SquatTracker: React.FC<SquatTrackerProps> = ({
  angles,
  squatPhase,
  repCount,
  goodFormReps,
  shallowReps,
  asymmetricReps,
}) => {
  const avgFlexion = angles ? (angles.leftKneeFlexion + angles.rightKneeFlexion) / 2 : 0;
  const asymmetry = angles ? angles.asymmetry : 0;

  // Celebrate every 5 completed reps with confetti
  useEffect(() => {
    if (repCount > 0 && repCount % 5 === 0) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [repCount]);

  // Form guidance helper
  const getFormGuidance = () => {
    if (squatPhase === 'STANDING') {
      return { message: '준비: 두 발을 어깨 너비로 벌리고 곧게 서세요.', color: 'text-slate-300' };
    }
    if (squatPhase === 'DESCENDING') {
      if (avgFlexion < 60) {
        return { message: '하강 중: 무릎을 굽히며 천천히 앉아주세요 (목표 90°~120°).', color: 'text-cyan-300' };
      }
      return { message: '좋은 깊이입니다! 조금 더 내려가세요.', color: 'text-emerald-300' };
    }
    if (squatPhase === 'SQUATTING') {
      if (asymmetry > 10) {
        return { message: '⚠️ 무릎 좌우 불균형! 한쪽 다리에 쏠리지 않게 주의하세요.', color: 'text-amber-300' };
      }
      return { message: '🎯 목표 굴곡 각도 달성! 이제 천천히 일어서세요.', color: 'text-emerald-400 font-bold' };
    }
    return { message: '상승 중: 엉덩이에 힘을 주고 완전 신전까지 일어서세요.', color: 'text-cyan-300' };
  };

  const guidance = getFormGuidance();

  return (
    <div className="bg-white border border-[#DEDECF] rounded-[28px] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F0E8] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-[#F5F5F0] text-[#5A5A40] border border-[#DEDECF] rounded-2xl">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D2D24]">스쿼트 / 앉았다 일어서기 분석</h3>
            <p className="text-xs text-[#8A8A70]">0° 신전 ~ 120° 굴곡 목표 가동범위 추적</p>
          </div>
        </div>

        {/* Phase Pill */}
        <div className="flex items-center space-x-1.5 bg-[#F5F5F0] px-3.5 py-1.5 rounded-full border border-[#DEDECF]">
          <span className="w-2 h-2 rounded-full bg-[#FF6321] animate-ping" />
          <span className="text-xs font-semibold text-[#5A5A40] uppercase tracking-wide">
            {squatPhase === 'STANDING'
              ? '서있는 자세'
              : squatPhase === 'DESCENDING'
              ? '하강 중'
              : squatPhase === 'SQUATTING'
              ? '스쿼트 달성'
              : '상승 중'}
          </span>
        </div>
      </div>

      {/* Main Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Reps */}
        <div className="bg-[#5A5A40] p-3.5 rounded-2xl text-white flex flex-col items-center justify-center text-center shadow-md">
          <span className="text-3xl font-serif font-black">{repCount}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">
            총 완료 횟수 (Reps)
          </span>
        </div>

        {/* Good Form Reps */}
        <div className="bg-[#FDFDFB] p-3.5 rounded-2xl border border-[#F0F0E8] flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-serif font-black text-[#5A5A40]">{goodFormReps}</span>
          <span className="text-[10px] text-[#5A5A40] font-medium flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>정상 자세 달성</span>
          </span>
        </div>

        {/* Shallow Reps */}
        <div className="bg-[#FDFDFB] p-3.5 rounded-2xl border border-[#F0F0E8] flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-serif font-black text-[#FF6321]">{shallowReps}</span>
          <span className="text-[10px] text-[#FF6321] font-medium">
            깊이 부족 (&lt; 90°)
          </span>
        </div>

        {/* Asymmetric Reps */}
        <div className="bg-[#FDFDFB] p-3.5 rounded-2xl border border-[#F0F0E8] flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-serif font-black text-[#FF6321]">{asymmetricReps}</span>
          <span className="text-[10px] text-[#FF6321] font-medium">
            비대칭 스쿼트 (&gt; 10°)
          </span>
        </div>
      </div>

      {/* Real-time Guidance Banner */}
      <div className="bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#DEDECF] flex items-center space-x-3">
        <Flame className="w-5 h-5 text-[#FF6321] shrink-0" />
        <div className="text-xs font-medium text-[#2D2D24]">
          <span>{guidance.message}</span>
        </div>
      </div>
    </div>
  );
};

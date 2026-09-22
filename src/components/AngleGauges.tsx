import React from 'react';
import { JointAngles, AnalysisMode } from '../types';
import { Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface AngleGaugesProps {
  angles: JointAngles | null;
  analysisMode: AnalysisMode;
}

export const AngleGauges: React.FC<AngleGaugesProps> = ({ angles, analysisMode }) => {
  const leftAngle = angles ? angles.leftKneeFlexion : 0;
  const rightAngle = angles ? angles.rightKneeFlexion : 0;
  const asymmetry = angles ? angles.asymmetry : 0;

  const renderGaugeArc = (angle: number, label: string, strokeColor: string, textColor: string) => {
    const maxAngle = 150;
    const clampedAngle = Math.min(maxAngle, Math.max(0, angle));
    const percentage = clampedAngle / maxAngle;

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - (percentage * 180) / 360);

    return (
      <div className="bg-[#FDFDFB] p-3.5 rounded-2xl border border-[#F0F0E8] flex flex-col items-center justify-center space-y-1.5 relative">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor}`}>
          {label}
        </span>

        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#E8E8DF"
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * 0.5}
              strokeLinecap="round"
            />
            {/* Value fill */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={strokeColor}
              strokeWidth="7"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-150"
            />
          </svg>

          {/* Value Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
            <span className="text-xl font-serif font-black text-[#2D2D24]">
              {angle.toFixed(1)}°
            </span>
            <span className="text-[9px] text-[#8A8A70] uppercase">Flexion</span>
          </div>
        </div>

        {/* ROM Target Hint */}
        <div className="text-[10px] text-[#8A8A70] text-center">
          {angle <= 20 ? '신전 (0°~20°)' : angle >= 60 ? '충분한 굴곡 (60°+)' : '중간 굴곡 (20°~60°)'}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#DEDECF] rounded-[28px] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#F0F0E8] pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#F5F5F0] text-[#5A5A40]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D2D24]">좌우 무릎 ROM 정밀 게이지</h3>
            <p className="text-[11px] text-[#8A8A70]">0°(완전 폄) ~ 150°(최대 굴곡)</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            asymmetry <= 10
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          좌우 차: {asymmetry.toFixed(1)}°
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {renderGaugeArc(leftAngle, '좌측 무릎 (Left)', '#FF6321', 'text-[#FF6321]')}
        {renderGaugeArc(rightAngle, '우측 무릎 (Right)', '#3E5C38', 'text-[#3E5C38]')}
      </div>

      <div className="p-3 rounded-2xl bg-[#F5F5F0] border border-[#E8E8DF] flex items-center justify-between text-xs text-[#5A5A40]">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#3E5C38]" />
          <span>관절 가동 범위 (ROM) 대칭성 지표</span>
        </div>
        <span className="font-semibold">{asymmetry <= 10 ? '대칭 우수' : '비대칭 주의'}</span>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import {
  FullBodyLandmarks,
  JointAngles,
  MajorMode,
  ShoulderExercise,
  OperatedSide,
} from '../types';
import { drawDigitalTwin } from '../utils/drawUtils';
import { Activity, Sparkles, ShieldAlert } from 'lucide-react';

interface MiniDigitalTwinProps {
  landmarks: FullBodyLandmarks | null;
  angles: JointAngles | null;
  isMirrored?: boolean;
  majorMode: MajorMode;
  shoulderExercise: ShoulderExercise;
  operatedSide: OperatedSide;
  torsoCompensated?: boolean;
}

export const MiniDigitalTwin: React.FC<MiniDigitalTwinProps> = ({
  landmarks,
  angles,
  isMirrored = true,
  majorMode,
  shoulderExercise,
  operatedSide,
  torsoCompensated = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    drawDigitalTwin(
      ctx,
      landmarks,
      width,
      height,
      isMirrored,
      angles,
      majorMode,
      shoulderExercise,
      operatedSide,
      torsoCompensated
    );
  }, [landmarks, angles, isMirrored, majorMode, shoulderExercise, operatedSide, torsoCompensated]);

  return (
    <div className="bg-white border border-[#DEDECF] rounded-[28px] p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header (Requirement 20) */}
      <div className="flex items-center justify-between border-b border-[#F0F0E8] pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#F5F5F0] text-[#5A5A40]">
            <Activity className="w-4 h-4 text-[#FF6321]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D2D24]">Mini Digital Twin</h3>
            <p className="text-[11px] text-[#8A8A70]">
              {majorMode === 'knee'
                ? '하체 관절 스켈레톤 실시간 동기화'
                : '상체 및 견관절 스켈레톤 실시간 동기화'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#F5F5F0] rounded-full text-[10px] text-[#5A5A40] font-semibold border border-[#DEDECF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6321] animate-ping" />
          <span>실시간 트윈 연동</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 min-h-[220px] bg-[#FDFDFB] rounded-2xl border border-[#F0F0E8] overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={320}
          height={260}
          className="w-full h-full object-contain"
        />

        {/* Torso compensation floating tag */}
        {torsoCompensated && (
          <div className="absolute top-2 left-2 right-2 bg-[#D9381E]/90 text-white text-[10px] py-1 px-2 rounded-lg text-center font-medium flex items-center justify-center space-x-1">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>몸통 보상동작 감지 (기울임 주의)</span>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-xl border border-[#E8E8DF] text-[10px]">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#FF6321]" />
            <span className="text-[#5A5A40] font-medium">
              좌측 (Left){operatedSide === 'left' ? ' [수술측]' : ''}
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#3E5C38]" />
            <span className="text-[#5A5A40] font-medium">
              우측 (Right){operatedSide === 'right' ? ' [수술측]' : ''}
            </span>
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-[#F0F0E8] flex items-center justify-between text-[11px] text-[#5A5A40]">
        <span>
          {majorMode === 'knee'
            ? `무릎 비대칭도: ${angles ? angles.asymmetry.toFixed(1) : 0}°`
            : `어깨 비대칭도: ${angles ? angles.asymmetry.toFixed(1) : 0}°`}
        </span>
        <span className="text-[#8A8A70]">
          {majorMode === 'knee' ? '하체 강조 모드' : '상체·어깨 강조 모드'}
        </span>
      </div>
    </div>
  );
};

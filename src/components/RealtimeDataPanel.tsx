import React from 'react';
import {
  JointAngles,
  MajorMode,
  ShoulderExercise,
  OperatedSide,
  ShoulderUserConfig,
  SessionMaxROM,
  TrackingQuality,
  MeasurementQuality,
  KneeMovementState,
  ShoulderMovementState,
} from '../types';
import {
  Activity,
  ShieldCheck,
  Flame,
  Layers,
  Scale,
  Target,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface RealtimeDataPanelProps {
  majorMode: MajorMode;
  shoulderExercise: ShoulderExercise;
  operatedSide: OperatedSide;
  shoulderConfig: ShoulderUserConfig;
  angles: JointAngles | null;
  sessionMaxROM: SessionMaxROM;
  kneeState: KneeMovementState;
  shoulderState: ShoulderMovementState;
  kneeRepCount: number;
  shoulderRepCount: number;
  trackingQuality: TrackingQuality;
  measurementQuality: MeasurementQuality;
  feedbackMessage: string;
  torsoCompensated?: boolean;
}

export const RealtimeDataPanel: React.FC<RealtimeDataPanelProps> = ({
  majorMode,
  shoulderExercise,
  operatedSide,
  shoulderConfig,
  angles,
  sessionMaxROM,
  kneeState,
  shoulderState,
  kneeRepCount,
  shoulderRepCount,
  trackingQuality,
  measurementQuality,
  feedbackMessage,
  torsoCompensated = false,
}) => {
  const leftAngle = angles?.currentLeft ?? 0;
  const rightAngle = angles?.currentRight ?? 0;
  const asymmetry = angles?.asymmetry ?? 0;

  const activeState = majorMode === 'knee' ? kneeState : shoulderState;
  const activeRep = majorMode === 'knee' ? kneeRepCount : shoulderRepCount;

  // Tracking quality styling
  const trackingStyle = {
    GOOD: { bg: 'text-emerald-700', dot: 'bg-emerald-500', label: 'GOOD' },
    'LOW CONFIDENCE': { bg: 'text-amber-700', dot: 'bg-amber-500 animate-pulse', label: 'LOW' },
    LOST: { bg: 'text-red-700', dot: 'bg-red-500', label: 'LOST' },
  }[trackingQuality];

  // Quality badge styling
  const qualityBadge = {
    GOOD: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    FAIR: 'bg-amber-50 text-amber-800 border-amber-200',
    POOR: 'bg-red-50 text-red-800 border-red-200',
  }[measurementQuality];

  const jointLabel = majorMode === 'knee' ? '무릎 (Knee)' : shoulderExercise === 'flexion' ? '어깨 굴곡' : '어깨 외전';

  return (
    <div className="space-y-3">
      {/* 8 Data Cards Grid (Requirement 3) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: LEFT JOINT */}
        <div
          className={`border rounded-2xl p-3 shadow-xs flex flex-col justify-between transition-all ${
            operatedSide === 'left'
              ? 'bg-amber-50/50 border-[#FF6321] ring-1 ring-[#FF6321]/30'
              : 'bg-white border-[#DEDECF]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#FF6321] uppercase truncate">
              LEFT JOINT
            </span>
            {operatedSide === 'left' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#FF6321] text-white rounded-md">
                수술측
              </span>
            )}
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-serif font-black text-[#2D2D24]">
              {leftAngle.toFixed(1)}°
            </div>
            <p className="text-[10px] text-[#8A8A70]">
              Max: <strong className="text-[#5A5A40]">{sessionMaxROM.leftMax.toFixed(1)}°</strong>
            </p>
          </div>
          <div className="w-full bg-[#F5F5F0] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FF6321] h-full transition-all duration-150"
              style={{ width: `${Math.min(100, (leftAngle / (majorMode === 'knee' ? 130 : 180)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: RIGHT JOINT */}
        <div
          className={`border rounded-2xl p-3 shadow-xs flex flex-col justify-between transition-all ${
            operatedSide === 'right'
              ? 'bg-amber-50/50 border-[#FF6321] ring-1 ring-[#FF6321]/30'
              : 'bg-white border-[#DEDECF]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#3E5C38] uppercase truncate">
              RIGHT JOINT
            </span>
            {operatedSide === 'right' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#FF6321] text-white rounded-md">
                수술측
              </span>
            )}
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-serif font-black text-[#2D2D24]">
              {rightAngle.toFixed(1)}°
            </div>
            <p className="text-[10px] text-[#8A8A70]">
              Max: <strong className="text-[#5A5A40]">{sessionMaxROM.rightMax.toFixed(1)}°</strong>
            </p>
          </div>
          <div className="w-full bg-[#F5F5F0] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#3E5C38] h-full transition-all duration-150"
              style={{ width: `${Math.min(100, (rightAngle / (majorMode === 'knee' ? 130 : 180)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: RANGE OF MOTION (Target & Max Allowed) */}
        <div className="bg-white border border-[#DEDECF] rounded-2xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#5A5A40] uppercase">
              RANGE OF MOTION
            </span>
            <Target className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="my-1.5">
            <div className="text-xs font-semibold text-[#2D2D24]">
              목표: {shoulderConfig.targetROM ? `${shoulderConfig.targetROM}°` : '미설정'}
            </div>
            <div className="text-[10px] text-[#8A8A70] mt-0.5">
              제한: {shoulderConfig.maximumAllowedROM ? `${shoulderConfig.maximumAllowedROM}°` : '미설정'}
            </div>
          </div>
          <div className="text-[9px] text-[#8A8A70] truncate">
            {shoulderConfig.maximumAllowedROM && Math.max(leftAngle, rightAngle) > shoulderConfig.maximumAllowedROM ? (
              <span className="text-[#D9381E] font-bold">제한각 초과</span>
            ) : shoulderConfig.targetROM && Math.max(leftAngle, rightAngle) >= shoulderConfig.targetROM ? (
              <span className="text-emerald-600 font-bold">목표 도달</span>
            ) : (
              '정상 범위 내'
            )}
          </div>
        </div>

        {/* Card 4: TRACKING & QUALITY */}
        <div className="bg-white border border-[#DEDECF] rounded-2xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#5A5A40] uppercase">
              TRACKING
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
          </div>
          <div className="my-1.5">
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${trackingStyle.dot}`} />
              <span className="text-xs font-bold text-[#2D2D24]">{trackingStyle.label}</span>
            </div>
            <div className="mt-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${qualityBadge}`}>
                Quality: {measurementQuality}
              </span>
            </div>
          </div>
          <div className="text-[9px] text-[#8A8A70] truncate">
            {torsoCompensated ? '몸통 보상 감지' : '신뢰도 분석'}
          </div>
        </div>

        {/* Card 5: MOVEMENT STATE */}
        <div className="bg-white border border-[#DEDECF] rounded-2xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#5A5A40] uppercase">
              STATE
            </span>
            <Layers className="w-3.5 h-3.5 text-[#5A5A40]" />
          </div>
          <div className="my-1.5">
            <div className="text-sm sm:text-base font-bold text-[#5A5A40] truncate">
              {activeState}
            </div>
            <p className="text-[10px] text-[#8A8A70]">
              {majorMode === 'knee'
                ? activeState === 'STANDING'
                  ? '선 자세'
                  : activeState === 'BENDING'
                  ? '하강 중'
                  : activeState === 'BOTTOM'
                  ? '최저점'
                  : '상승 중'
                : activeState === 'REST'
                ? '휴식 자세'
                : activeState === 'RAISING'
                ? '팔 올리는 중'
                : activeState === 'TARGET'
                ? '목표 지점'
                : '내리는 중'}
            </p>
          </div>
          <div className="w-full bg-[#F5F5F0] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#5A5A40] h-full w-2/3" />
          </div>
        </div>

        {/* Card 6: REP COUNT */}
        <div className="bg-[#5A5A40] rounded-2xl p-3 text-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[10px] font-bold tracking-wider uppercase">REP COUNT</span>
            <Flame className="w-3.5 h-3.5 text-[#FF6321]" />
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-serif font-black">{activeRep}</div>
            <p className="text-[10px] opacity-75">
              {majorMode === 'knee'
                ? '스쿼트 완료 횟수'
                : shoulderConfig.enableRepCounter
                ? '어깨 리프트 횟수'
                : '카운터 미사용'}
            </p>
          </div>
          <div className="text-[9px] opacity-70">
            {majorMode === 'shoulder' && !shoulderConfig.enableRepCounter ? '선택 시 활성화' : '1사이클 완주 시 +1'}
          </div>
        </div>

        {/* Card 7: SYMMETRY */}
        <div className="bg-white border border-[#DEDECF] rounded-2xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#5A5A40] uppercase">
              SYMMETRY
            </span>
            <Scale className="w-3.5 h-3.5 text-[#5A5A40]" />
          </div>
          <div className="my-1.5">
            <div className="text-lg sm:text-xl font-serif font-bold text-[#2D2D24]">
              {asymmetry.toFixed(1)}°
            </div>
            <p className="text-[10px] text-[#8A8A70]">좌우 측정값 차이</p>
          </div>
          <div className="text-[9px] text-[#8A8A70]">
            {asymmetry <= 10 ? '대칭 양호' : '비대칭 감지'}
          </div>
        </div>

        {/* Card 8: FEEDBACK */}
        <div className="bg-[#F5F5F0] border border-[#DEDECF] rounded-2xl p-3 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#5A5A40] uppercase">
              FEEDBACK
            </span>
            <Activity className="w-3.5 h-3.5 text-[#FF6321]" />
          </div>
          <div className="my-1">
            <p className="text-xs font-semibold text-[#2D2D24] leading-tight line-clamp-2">
              {feedbackMessage}
            </p>
          </div>
          <div className="text-[9px] text-[#8A8A70] flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>실시간 자세 안내</span>
          </div>
        </div>
      </div>
    </div>
  );
};

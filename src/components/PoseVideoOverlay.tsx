import React, { useEffect, useRef } from 'react';
import {
  FullBodyLandmarks,
  JointAngles,
  MajorMode,
  ShoulderExercise,
  OperatedSide,
  TrackingQuality,
} from '../types';
import { CameraOff, RefreshCw, ShieldAlert, UserCheck, AlertCircle, Compass } from 'lucide-react';
import { drawPose } from '../utils/drawUtils';

interface PoseVideoOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  landmarks: FullBodyLandmarks | null;
  angles: JointAngles | null;
  warningMessage: string | null;
  majorMode: MajorMode;
  shoulderExercise: ShoulderExercise;
  operatedSide: OperatedSide;
  torsoCompensated?: boolean;
  isProcessing: boolean;
  videoUrl?: string | null;
  isMirrored?: boolean;
  facingMode?: 'user' | 'environment';
  trackingQuality?: TrackingQuality;
  cameraError?: string | null;
  onRetryCamera?: () => void;
}

export const PoseVideoOverlay: React.FC<PoseVideoOverlayProps> = ({
  videoRef,
  canvasRef,
  landmarks,
  angles,
  warningMessage,
  majorMode,
  shoulderExercise,
  operatedSide,
  torsoCompensated = false,
  isProcessing,
  videoUrl,
  isMirrored = true,
  facingMode = 'user',
  trackingQuality = 'LOST',
  cameraError = null,
  onRetryCamera,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw overlay via modular drawPose
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video?.videoWidth || 640;
    const height = video?.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (!landmarks) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    drawPose(
      ctx,
      landmarks,
      width,
      height,
      isMirrored,
      angles,
      warningMessage,
      majorMode,
      shoulderExercise,
      operatedSide,
      torsoCompensated
    );
  }, [
    landmarks,
    angles,
    warningMessage,
    isMirrored,
    majorMode,
    shoulderExercise,
    operatedSide,
    torsoCompensated,
    canvasRef,
    videoRef,
  ]);

  // Camera posture guidance (Requirement 28)
  const getCameraGuidance = () => {
    if (majorMode === 'knee') {
      return '무릎과 하체 전체(골반-무릎-발목)가 화면에 잘 들어오도록 2~2.5m 거리를 유지하세요.';
    }
    if (shoulderExercise === 'flexion') {
      return '팔 굴곡(Flexion) 측정: 몸의 측면(옆모습)이 카메라에 잘 보이도록 서서 앞으로 들어올리세요.';
    }
    return '팔 외전(Abduction) 측정: 카메라를 정면으로 바라보고 양팔을 옆으로 벌릴 공간을 확보하세요.';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-[#24241D] rounded-[28px] overflow-hidden border border-[#DEDECF] shadow-xs flex items-center justify-center group"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
      />

      {/* Canvas Overlay for Pose Landmarks */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
      />

      {/* Real-time Alert Banner */}
      {warningMessage && (
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-center pointer-events-none">
          <div className="bg-[#D9381E] text-white px-4 py-2 rounded-2xl shadow-md flex items-center space-x-2 text-xs sm:text-sm font-semibold max-w-xl text-center">
            <ShieldAlert className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <span>{warningMessage}</span>
          </div>
        </div>
      )}

      {/* Tracking Quality Indicator Badge (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-[11px] font-semibold border border-white/20">
        <span
          className={`w-2 h-2 rounded-full ${
            trackingQuality === 'GOOD'
              ? 'bg-emerald-400'
              : trackingQuality === 'LOW CONFIDENCE'
              ? 'bg-amber-400 animate-pulse'
              : 'bg-red-400'
          }`}
        />
        <span>
          {trackingQuality === 'GOOD'
            ? '정상 인식 (GOOD)'
            : trackingQuality === 'LOW CONFIDENCE'
            ? '인식 불안정 (LOW)'
            : '신체 미감지 (LOST)'}
        </span>
      </div>

      {/* Camera Positioning Guide (Bottom Bar, Requirement 28) */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-2xl text-white text-xs border border-white/20 max-w-lg">
          <Compass className="w-3.5 h-3.5 text-[#FF6321] shrink-0" />
          <span className="truncate">{getCameraGuidance()}</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] border border-white/20">
          <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-[#FF6321] animate-ping' : 'bg-slate-400'}`} />
          <span>{isProcessing ? '실시간 분석 중' : '일시정지'}</span>
        </div>
      </div>

      {/* Camera Error / Permission Denied Modal (Requirement 2) */}
      {cameraError && (
        <div className="absolute inset-0 bg-[#24241D]/90 backdrop-blur-md z-40 flex items-center justify-center p-6 text-center text-white">
          <div className="max-w-md space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-[#FF6321] flex items-center justify-center mx-auto border border-red-500/30">
              <CameraOff className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">카메라 연결 안내</h3>
            <p className="text-xs text-[#DEDECF] leading-relaxed">{cameraError}</p>
            {onRetryCamera && (
              <button
                onClick={onRetryCamera}
                className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a34] text-white rounded-2xl text-xs font-semibold flex items-center space-x-2 mx-auto transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>카메라 다시 시도</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

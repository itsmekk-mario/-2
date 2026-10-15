import React, { useEffect, useRef } from "react";
import {
  AppSourceMode,
  FullBodyLandmarks,
  JointAngles,
  MajorMode,
  ShoulderExercise,
  OperatedSide,
  TrackingQuality,
} from "../types";
import {
  CameraOff,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  AlertCircle,
  Compass,
} from "lucide-react";
import { HAND_CONNECTIONS, TrackedHand } from "../utils/handAnalysis";
import { drawPose } from "../utils/drawUtils";

interface PoseVideoOverlayProps {
  sourceMode: AppSourceMode;
  hands: TrackedHand[];
  onVideoEnded: () => void;
  onVideoError: () => void;
  onVideoPlayingChange: (playing: boolean) => void;
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
  facingMode?: "user" | "environment";
  trackingQuality?: TrackingQuality;
  cameraError?: string | null;
  onRetryCamera?: () => void;
}

export const PoseVideoOverlay: React.FC<PoseVideoOverlayProps> = ({
  sourceMode,
  hands,
  onVideoEnded,
  onVideoError,
  onVideoPlayingChange,
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
  facingMode = "user",
  trackingQuality = "LOST",
  cameraError = null,
  onRetryCamera,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw overlay via modular drawPose
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width =
      sourceMode === "pose_simulator" ? 640 : video?.videoWidth || 640;
    const height =
      sourceMode === "pose_simulator" ? 480 : video?.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    if (landmarks)
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
        torsoCompensated,
      );
    for (const hand of hands) {
      const pixel = (index: number) => ({
        x:
          (isMirrored ? 1 - hand.landmarks[index].x : hand.landmarks[index].x) *
          width,
        y: hand.landmarks[index].y * height,
      });
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      for (const [a, b] of HAND_CONNECTIONS) {
        const start = pixel(a),
          end = pixel(b);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      hand.landmarks.forEach((_, i) => {
        const p = pixel(i);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [
    sourceMode,
    hands,
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || sourceMode === "pose_simulator") return;
    if (!isProcessing) video.pause();
    else {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => {});
    }
  }, [isProcessing, sourceMode, videoUrl]);

  // Camera posture guidance (Requirement 28)
  const getCameraGuidance = () => {
    if (majorMode === "knee") {
      return "골반·무릎·발목 전체를 비추세요. 굴곡은 옆모습에서 더 잘 추정됩니다. 좌우 표시는 본인 신체 기준입니다.";
    }
    if (shoulderExercise === "flexion") {
      return "팔 굴곡(Flexion) 측정: 몸의 측면(옆모습)이 카메라에 잘 보이도록 서서 앞으로 들어올리세요.";
    }
    return "팔 외전(Abduction) 측정: 카메라를 정면으로 바라보고 양팔을 옆으로 벌릴 공간을 확보하세요.";
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] sm:aspect-video bg-[#24241D] rounded-[28px] overflow-hidden border border-[#DEDECF] shadow-xs flex items-center justify-center group"
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          playsInline
          muted
          autoPlay={isProcessing}
          controls={sourceMode === "video_file"}
          onPlay={() => {
            if (sourceMode === "video_file") onVideoPlayingChange(true);
          }}
          onPause={() => {
            if (
              sourceMode === "video_file" &&
              videoRef.current &&
              videoRef.current.readyState >= 2
            )
              onVideoPlayingChange(false);
          }}
          onEnded={onVideoEnded}
          onError={onVideoError}
          className={`${sourceMode === "pose_simulator" ? "hidden" : ""} absolute inset-0 w-full h-full object-contain ${isMirrored ? "scale-x-[-1]" : ""}`}
        />

        {/* Canvas Overlay for Pose Landmarks */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />

        {sourceMode === "pose_simulator" && (
          <span className="absolute top-4 left-4 text-xs font-bold text-amber-200 z-20">
            SIMULATION · 합성 동작
          </span>
        )}
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
              trackingQuality === "GOOD"
                ? "bg-emerald-400"
                : trackingQuality === "LOW CONFIDENCE"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
            }`}
          />
          <span>
            {trackingQuality === "GOOD"
              ? "정상 인식 (GOOD)"
              : trackingQuality === "LOW CONFIDENCE"
                ? "인식 불안정 (LOW)"
                : "신체 미감지 (LOST)"}
          </span>
        </div>

        {/* Camera Error / Permission Denied Modal (Requirement 2) */}
        {cameraError && (
          <div className="absolute inset-0 bg-[#24241D]/90 backdrop-blur-md z-40 flex items-center justify-center p-6 text-center text-white">
            <div className="max-w-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-[#FF6321] flex items-center justify-center mx-auto border border-red-500/30">
                <CameraOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">카메라 연결 안내</h3>
              <p className="text-xs text-[#DEDECF] leading-relaxed">
                {cameraError}
              </p>
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
      <div className="flex items-start gap-2 px-2 pt-3 text-xs text-[#5A5A40] leading-relaxed">
        <Compass className="w-4 h-4 text-[#FF6321] shrink-0" />
        <p>
          {sourceMode === "pose_simulator"
            ? "합성 관절 좌표를 실제 측정과 같은 계산 경로로 분석합니다."
            : getCameraGuidance()}
        </p>
        <span className="ml-auto shrink-0">
          {isProcessing ? "분석 중" : "일시정지"}
        </span>
      </div>
    </>
  );
};

import React, { useState } from 'react';
import {
  AppSourceMode,
  MajorMode,
  ShoulderExercise,
  OperatedSide,
  ShoulderUserConfig,
} from './types';
import { useMediaPipePose } from './hooks/useMediaPipePose';
import { Header } from './components/Header';
import { CameraControls } from './components/CameraControls';
import { ShoulderControlBar } from './components/ShoulderControlBar';
import { PoseVideoOverlay } from './components/PoseVideoOverlay';
import { MiniDigitalTwin } from './components/MiniDigitalTwin';
import { RealtimeDataPanel } from './components/RealtimeDataPanel';
import { LiveChart } from './components/LiveChart';
import { DebugPanel } from './components/DebugPanel';
import { SessionReport } from './components/SessionReport';
import { ResearchInfoModal } from './components/ResearchInfoModal';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function App() {
  // Mode selection (Requirement 3: [Knee Analysis] / [Shoulder Analysis])
  const [majorMode, setMajorMode] = useState<MajorMode>('knee');
  const [shoulderExercise, setShoulderExercise] = useState<ShoulderExercise>('abduction');
  const [operatedSide, setOperatedSide] = useState<OperatedSide>('none');
  const [shoulderConfig, setShoulderConfig] = useState<ShoulderUserConfig>({
    targetROM: 90,
    maximumAllowedROM: 100,
    enableRepCounter: false,
  });

  // Source & Camera States
  const [sourceMode, setSourceMode] = useState<AppSourceMode>('realtime_camera');
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'analysis' | 'report' | 'research'>('analysis');
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);

  // Core MediaPipe Hook
  const {
    videoRef,
    canvasRef,
    landmarks,
    angles,
    kneeState,
    shoulderState,
    kneeRepCount,
    shoulderRepCount,
    trackingQuality,
    measurementQuality,
    torsoCompensation,
    sessionMaxROM,
    feedbackMessage,
    warningMessage,
    cameraError,
    sessionStats,
    fps,
    debugInfo,
    startCamera,
    stopCamera,
    resetSession,
    resetSessionMaxROM,
  } = useMediaPipePose(
    sourceMode,
    majorMode,
    shoulderExercise,
    operatedSide,
    shoulderConfig,
    isProcessing,
    soundEnabled,
    facingMode,
    isMirrored
  );

  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setSourceMode('video_file');
    setIsProcessing(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#2D2D24] font-sans selection:bg-[#FF6321] selection:text-white flex flex-col justify-between">
      {/* Top Header with title & mode selector (Requirement 3) */}
      <Header
        sourceMode={sourceMode}
        majorMode={majorMode}
        setMajorMode={setMajorMode}
        isProcessing={isProcessing}
        fps={fps}
        onOpenResearchModal={() => setIsResearchModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Dashboard */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 flex-1">
        {/* Universal Camera Controls Bar */}
        <CameraControls
          sourceMode={sourceMode}
          setSourceMode={setSourceMode}
          analysisMode={majorMode}
          setAnalysisMode={(m) => setMajorMode(m as MajorMode)}
          isProcessing={isProcessing}
          onToggleProcessing={() => setIsProcessing(!isProcessing)}
          onResetSession={resetSession}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          onFileUpload={handleFileUpload}
          facingMode={facingMode}
          setFacingMode={setFacingMode}
          isMirrored={isMirrored}
          setIsMirrored={setIsMirrored}
        />

        {/* Shoulder Dedicated Exercise & ROM Settings Bar (Requirements 12, 13, 14, 16, 21) */}
        {majorMode === 'shoulder' && (
          <ShoulderControlBar
            shoulderExercise={shoulderExercise}
            setShoulderExercise={setShoulderExercise}
            operatedSide={operatedSide}
            setOperatedSide={setOperatedSide}
            shoulderConfig={shoulderConfig}
            setShoulderConfig={setShoulderConfig}
            onResetSessionMaxROM={resetSessionMaxROM}
          />
        )}

        {/* Tab 1: Real-time Analysis */}
        {activeTab === 'analysis' && (
          <div className="space-y-5">
            {/* 8 Data Cards Panel (Requirement 3) */}
            <RealtimeDataPanel
              majorMode={majorMode}
              shoulderExercise={shoulderExercise}
              operatedSide={operatedSide}
              shoulderConfig={shoulderConfig}
              angles={angles}
              sessionMaxROM={sessionMaxROM}
              kneeState={kneeState}
              shoulderState={shoulderState}
              kneeRepCount={kneeRepCount}
              shoulderRepCount={shoulderRepCount}
              trackingQuality={trackingQuality}
              measurementQuality={measurementQuality}
              feedbackMessage={feedbackMessage}
              torsoCompensated={torsoCompensation.isCompensated}
            />

            {/* Main Stage: Left Camera View (Largest) & Right Mini Digital Twin (Requirement 3 & 20) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Live Camera Feed with Overlay (8 cols) */}
              <div className="lg:col-span-8">
                <div className="bg-white border border-[#DEDECF] rounded-[28px] p-3 sm:p-4 shadow-xs">
                  <div className="flex items-center justify-between px-2 pb-2.5 mb-1 border-b border-[#F0F0E8]">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF6321] animate-pulse" />
                      <h2 className="text-sm font-bold text-[#2D2D24]">
                        {majorMode === 'knee'
                          ? 'Camera View · 무릎 굴곡/신전 관절 추정'
                          : `Camera View · ${shoulderExercise === 'abduction' ? '어깨 외전 (Abduction)' : '어깨 굴곡 (Flexion)'}`}
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-[#8A8A70]">
                      {majorMode === 'knee' ? 'HIP · KNEE · ANKLE' : 'SHOULDER · ELBOW · WRIST · HIP'}
                    </span>
                  </div>

                  <PoseVideoOverlay
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    landmarks={landmarks}
                    angles={angles}
                    warningMessage={warningMessage}
                    majorMode={majorMode}
                    shoulderExercise={shoulderExercise}
                    operatedSide={operatedSide}
                    torsoCompensated={torsoCompensation.isCompensated}
                    isProcessing={isProcessing}
                    videoUrl={videoUrl}
                    facingMode={facingMode}
                    isMirrored={isMirrored}
                    trackingQuality={trackingQuality}
                    cameraError={cameraError}
                    onRetryCamera={startCamera}
                  />
                </div>
              </div>

              {/* Right Column: Mini Digital Twin (4 cols) (Requirement 20) */}
              <div className="lg:col-span-4 flex flex-col">
                <MiniDigitalTwin
                  landmarks={landmarks}
                  angles={angles}
                  isMirrored={isMirrored}
                  majorMode={majorMode}
                  shoulderExercise={shoulderExercise}
                  operatedSide={operatedSide}
                  torsoCompensated={torsoCompensation.isCompensated}
                />
              </div>
            </div>

            {/* Time Series Realtime Chart (Requirement 23) */}
            <LiveChart
              history={sessionStats.history}
              majorMode={majorMode}
              shoulderConfig={shoulderConfig}
            />

            {/* Developer Mode Debug Inspector Panel (Requirement 24) */}
            <DebugPanel debugInfo={debugInfo} fps={fps} majorMode={majorMode} />
          </div>
        )}

        {/* Tab 2: Session Report */}
        {activeTab === 'report' && (
          <SessionReport
            stats={sessionStats}
            analysisMode={majorMode}
            onResetSession={resetSession}
          />
        )}
      </main>

      {/* Mandatory Medical Safety & Disclaimer Footer (Requirement 29) */}
      <footer className="w-full bg-[#F5F5F0] border-t border-[#DEDECF] py-4 px-4 text-center mt-6">
        <div className="max-w-7xl mx-auto space-y-1.5 text-xs text-[#5A5A40]">
          <div className="flex items-center justify-center space-x-2 font-semibold text-[#2D2D24]">
            <Info className="w-4 h-4 text-[#FF6321] shrink-0" />
            <span>교육 및 재활 모니터링 프로토타입 안내</span>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#8A8A70]">
            <span>• 본 시스템은 교육 및 자세·관절 움직임 모니터링을 위한 프로토타입이며 의료기기가 아닙니다.</span>
            <span>• 측정값은 웹캠 기반 자세 추정 결과로 실제 관절 각도와 오차가 발생할 수 있습니다.</span>
            <span>• 수술 후 재활 운동의 허용 범위와 목표 각도는 담당 의료진의 지시를 따르세요.</span>
            <span className="text-[#D9381E] font-medium">• 통증이나 이상 증상이 발생하면 측정을 중단하세요.</span>
          </div>
        </div>
      </footer>

      {/* Academic Background Research Modal */}
      <ResearchInfoModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
      />
    </div>
  );
}

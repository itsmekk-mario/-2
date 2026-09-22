import React, { useRef } from 'react';
import { Camera, Video, Cpu, Play, Pause, RotateCcw, Volume2, VolumeX, FlipHorizontal, RefreshCw } from 'lucide-react';
import { AppSourceMode, AnalysisMode } from '../types';

interface CameraControlsProps {
  sourceMode: AppSourceMode;
  setSourceMode: (mode: AppSourceMode) => void;
  analysisMode: AnalysisMode;
  setAnalysisMode: (mode: AnalysisMode) => void;
  isProcessing: boolean;
  onToggleProcessing: () => void;
  onResetSession: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onFileUpload: (file: File) => void;
  facingMode?: 'user' | 'environment';
  setFacingMode?: (mode: 'user' | 'environment') => void;
  isMirrored?: boolean;
  setIsMirrored?: (mirrored: boolean) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  sourceMode,
  setSourceMode,
  analysisMode,
  setAnalysisMode,
  isProcessing,
  onToggleProcessing,
  onResetSession,
  soundEnabled,
  setSoundEnabled,
  onFileUpload,
  facingMode = 'user',
  setFacingMode,
  isMirrored = true,
  setIsMirrored,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      setSourceMode('video_file');
    }
  };

  return (
    <div className="bg-white border border-[#DEDECF] rounded-[24px] p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Source Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A70] flex items-center space-x-1.5">
            <span>입력 소스</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSourceMode('realtime_camera')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                sourceMode === 'realtime_camera'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#F5F5F0] text-[#5A5A40] hover:bg-[#E8E8DF]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>실시간 웹캠</span>
            </button>

            <button
              onClick={() => setSourceMode('pose_simulator')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                sourceMode === 'pose_simulator'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#F5F5F0] text-[#5A5A40] hover:bg-[#E8E8DF]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>자세 시뮬레이터 (테스트용)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                sourceMode === 'video_file'
                  ? 'bg-[#5A5A40] text-white shadow-xs'
                  : 'bg-[#F5F5F0] text-[#5A5A40] hover:bg-[#E8E8DF]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>동영상 파일 업로드</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Center: Camera Settings (Front/Back & Mirror Toggle for Realtime Camera) */}
        {sourceMode === 'realtime_camera' && setFacingMode && setIsMirrored && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A70]">
              카메라 설정
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                className="px-3 py-1.5 rounded-xl bg-[#F5F5F0] hover:bg-[#E8E8DF] border border-[#DEDECF] text-[#5A5A40] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="전면/후면 카메라 전환"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{facingMode === 'user' ? '전면 카메라' : '후면 카메라'}</span>
              </button>

              <button
                onClick={() => setIsMirrored(!isMirrored)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  isMirrored
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-[#F5F5F0] text-[#5A5A40] border-[#DEDECF] hover:bg-[#E8E8DF]'
                }`}
                title="좌우 거울 반전 토글"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>좌우 거울 모드: {isMirrored ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Right: Execution Actions (Start/Stop, Reset, Audio) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A70]">
            제어 액션
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleProcessing}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-all cursor-pointer ${
                isProcessing
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                  : 'bg-[#FF6321] text-white hover:bg-[#e05318]'
              }`}
            >
              {isProcessing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isProcessing ? '측정 일시정지' : '실시간 측정 시작'}</span>
            </button>

            <button
              onClick={onResetSession}
              className="px-3.5 py-2 rounded-2xl bg-[#F5F5F0] hover:bg-[#E8E8DF] border border-[#DEDECF] text-[#5A5A40] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="측정 횟수 및 세션 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>리셋</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-2xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-[#F5F5F0] text-[#5A5A40] border-[#DEDECF] hover:bg-[#E8E8DF]'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
              title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

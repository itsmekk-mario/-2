import React from 'react';
import { Activity, BookOpen, Camera, ShieldCheck, FileText, Dumbbell, Sparkles } from 'lucide-react';
import { AppSourceMode, MajorMode } from '../types';

interface HeaderProps {
  sourceMode: AppSourceMode;
  majorMode: MajorMode;
  setMajorMode: (mode: MajorMode) => void;
  isProcessing: boolean;
  fps: number;
  onOpenResearchModal: () => void;
  activeTab: 'analysis' | 'report' | 'research';
  setActiveTab: (tab: 'analysis' | 'report' | 'research') => void;
}

export const Header: React.FC<HeaderProps> = ({
  sourceMode,
  majorMode,
  setMajorMode,
  isProcessing,
  fps,
  onOpenResearchModal,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-white border-b border-[#DEDECF] text-[#2D2D24] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Main Title (Requirement 3: Mini Digital Twin Rehabilitation Motion Monitor) */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#5A5A40] text-white p-2.5 rounded-2xl shadow-xs flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#FF6321]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#2D2D24]">
                  Mini Digital Twin Rehabilitation Motion Monitor
                </h1>
                <span className="text-[10px] font-semibold bg-[#F5F5F0] text-[#5A5A40] border border-[#DEDECF] px-2 py-0.5 rounded-full">
                  MediaPipe Vision
                </span>
              </div>
              <p className="text-xs text-[#8A8A70]">
                실시간 관절 가동범위(ROM) 분석 및 생명과학 재활 모니터링 프로토타입
              </p>
            </div>
          </div>

          {/* Mode Selector & Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Analysis Mode Toggle [Knee Analysis] / [Shoulder Analysis] */}
            <div className="bg-[#F5F5F0] p-1 rounded-2xl border border-[#DEDECF] flex items-center text-xs font-bold">
              <button
                onClick={() => setMajorMode('knee')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  majorMode === 'knee'
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'text-[#8A8A70] hover:text-[#2D2D24]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Knee Analysis</span>
              </button>

              <button
                onClick={() => setMajorMode('shoulder')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  majorMode === 'shoulder'
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'text-[#8A8A70] hover:text-[#2D2D24]'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Shoulder Analysis</span>
              </button>
            </div>

            {/* View Tabs */}
            <div className="bg-[#F5F5F0] p-1 rounded-2xl border border-[#DEDECF] flex items-center text-xs font-semibold">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'analysis'
                    ? 'bg-white text-[#2D2D24] shadow-xs'
                    : 'text-[#8A8A70] hover:text-[#2D2D24]'
                }`}
              >
                모니터
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-white text-[#2D2D24] shadow-xs'
                    : 'text-[#8A8A70] hover:text-[#2D2D24]'
                }`}
              >
                리포트
              </button>
            </div>

            {/* Academic Modal Trigger */}
            <button
              onClick={onOpenResearchModal}
              className="px-3 py-1.5 bg-[#F5F5F0] hover:bg-[#E8E8DF] border border-[#DEDECF] rounded-2xl text-xs font-semibold text-[#5A5A40] flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">학술 배경</span>
            </button>

            {/* FPS Badge */}
            <div className="px-2.5 py-1 bg-[#F5F5F0] border border-[#DEDECF] rounded-xl text-[11px] font-mono text-[#5A5A40]">
              {fps} FPS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { DebugInfo, MajorMode } from '../types';
import { Terminal, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface DebugPanelProps {
  debugInfo: DebugInfo | null;
  fps: number;
  majorMode: MajorMode;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, fps, majorMode }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyJson = () => {
    if (!debugInfo) return;
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kneeLandmarks = [
    { label: 'LEFT_HIP (23)', lm: debugInfo?.leftHip },
    { label: 'LEFT_KNEE (25)', lm: debugInfo?.leftKnee },
    { label: 'LEFT_ANKLE (27)', lm: debugInfo?.leftAnkle },
    { label: 'RIGHT_HIP (24)', lm: debugInfo?.rightHip },
    { label: 'RIGHT_KNEE (26)', lm: debugInfo?.rightKnee },
    { label: 'RIGHT_ANKLE (28)', lm: debugInfo?.rightAnkle },
  ];

  const shoulderLandmarks = [
    { label: 'LEFT_SHOULDER (11)', lm: debugInfo?.leftShoulder },
    { label: 'LEFT_ELBOW (13)', lm: debugInfo?.leftElbow },
    { label: 'LEFT_WRIST (15)', lm: debugInfo?.leftWrist },
    { label: 'RIGHT_SHOULDER (12)', lm: debugInfo?.rightShoulder },
    { label: 'RIGHT_ELBOW (14)', lm: debugInfo?.rightElbow },
    { label: 'RIGHT_WRIST (16)', lm: debugInfo?.rightWrist },
  ];

  const landmarksToDisplay = majorMode === 'knee' ? kneeLandmarks : shoulderLandmarks;

  return (
    <div className="bg-white border border-[#DEDECF] rounded-2xl overflow-hidden shadow-xs">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#FF6321]" />
          <span>개발자 디버깅 모니터 (Developer Mode & Landmark Inspector)</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F5F5F0] text-[10px] text-[#5A5A40] border border-[#DEDECF]">
            {fps} FPS
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#E8E8DF] text-[10px] text-[#2D2D24] uppercase">
            {majorMode} MODE
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-[#8A8A70]">{isOpen ? '접기' : '좌표 및 내부 상태 보기'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 border-t border-[#F0F0E8] bg-[#FDFDFB] space-y-4 text-xs font-mono">
          {/* Top Status Badges (Requirement 24) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F0F0E8]">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2.5 py-1 bg-white border border-[#DEDECF] rounded-lg">
                State: <strong className="text-[#5A5A40]">{debugInfo?.currentState || 'N/A'}</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-[#DEDECF] rounded-lg">
                Count: <strong className="text-[#FF6321]">{debugInfo?.repCount ?? 0}회</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-[#DEDECF] rounded-lg">
                Tracking: <strong className="text-[#3E5C38]">{debugInfo?.trackingQuality || 'LOST'}</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-[#DEDECF] rounded-lg">
                Quality: <strong>{debugInfo?.measurementQuality || 'POOR'}</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-[#DEDECF] rounded-lg">
                Raw L/R: <strong>{debugInfo?.rawLeft.toFixed(1)}° / {debugInfo?.rawRight.toFixed(1)}°</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-[#DEDECF] rounded-lg">
                Smoothed L/R: <strong className="text-[#FF6321]">{debugInfo?.smoothedLeft.toFixed(1)}° / {debugInfo?.smoothedRight.toFixed(1)}°</strong>
              </span>
              <span className="px-2.5 py-1 bg-white border border-[#DEDECF] rounded-lg">
                Compensation: <strong className={debugInfo?.torsoCompensated ? 'text-[#D9381E]' : 'text-emerald-700'}>{debugInfo?.torsoCompensated ? `기울임 ${debugInfo.torsoTiltAngle.toFixed(1)}°` : '정상'}</strong>
              </span>
            </div>

            <button
              onClick={handleCopyJson}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#DEDECF] text-[#5A5A40] hover:bg-[#F5F5F0] text-[11px] flex items-center space-x-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료' : 'JSON 복사'}</span>
            </button>
          </div>

          {/* Landmarks Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#E8E8DF] text-[#8A8A70]">
                  <th className="py-1 px-2">관절 (Landmark)</th>
                  <th className="py-1 px-2">X (정규화)</th>
                  <th className="py-1 px-2">Y (정규화)</th>
                  <th className="py-1 px-2">Z (상대 깊이)</th>
                  <th className="py-1 px-2">Visibility (신뢰도)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0E8]">
                {landmarksToDisplay.map((item) => (
                  <tr key={item.label} className="hover:bg-white/60">
                    <td className="py-1.5 px-2 font-semibold text-[#2D2D24]">{item.label}</td>
                    <td className="py-1.5 px-2 text-[#5A5A40]">{item.lm?.x !== undefined ? item.lm.x.toFixed(4) : '-'}</td>
                    <td className="py-1.5 px-2 text-[#5A5A40]">{item.lm?.y !== undefined ? item.lm.y.toFixed(4) : '-'}</td>
                    <td className="py-1.5 px-2 text-[#5A5A40]">{item.lm?.z !== undefined ? item.lm.z.toFixed(4) : '-'}</td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          (item.lm?.visibility ?? 0) >= 0.5
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.lm?.visibility !== undefined ? `${Math.round(item.lm.visibility * 100)}%` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-[#8A8A70] italic">
            * 프레임 드랍을 방지하기 위해 브라우저 개발자 도구 콘솔(F12) 출력은 1초 간격으로 스로틀링(Throttling)됩니다.
          </p>
        </div>
      )}
    </div>
  );
};

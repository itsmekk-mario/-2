import React, { useState } from 'react';
import { SessionStats, AnalysisMode } from '../types';
import {
  FileText,
  Download,
  Bot,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Award,
  Printer,
  Sparkles,
} from 'lucide-react';

interface SessionReportProps {
  stats: SessionStats;
  analysisMode: AnalysisMode;
  onResetSession: () => void;
}

export const SessionReport: React.FC<SessionReportProps> = ({
  stats,
  analysisMode,
  onResetSession,
}) => {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Trigger Gemini AI Rehabilitation Feedback
  const handleGenerateAiFeedback = async () => {
    setIsLoadingAi(true);
    setAiError(null);

    try {
      const response = await fetch('/api/rehab-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: analysisMode,
          durationSec: stats.durationSec,
          leftMaxFlexion: stats.leftMaxFlexion,
          rightMaxFlexion: stats.rightMaxFlexion,
          leftMinExtension: stats.leftMinExtension,
          rightMinExtension: stats.rightMinExtension,
          asymmetry: stats.avgAsymmetry,
          stiffKneeCount: stats.stiffKneeCount,
          repCount: stats.squatRepCount,
        }),
      });

      const data = await response.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        setAiReport(data.report);
      }
    } catch (err: any) {
      setAiError('AI 분석 리포트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!stats.history || stats.history.length === 0) return;

    const headers = ['Timestamp(s)', 'LeftKneeFlexion(deg)', 'RightKneeFlexion(deg)', 'Asymmetry(deg)', 'StiffKneeEvent'];
    const rows = stats.history.map((pt) => [
      pt.time.toFixed(2),
      pt.leftKneeFlexion.toFixed(1),
      pt.rightKneeFlexion.toFixed(1),
      pt.asymmetry.toFixed(1),
      pt.isStiffKneeEvent ? 'YES' : 'NO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MediaPipe_Knee_Session_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-[#DEDECF] rounded-[28px] p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0F0E8] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-[#FF6321]" />
            <h2 className="text-xl font-bold text-[#2D2D24]">세션 관절 가동범위(ROM) & 디지털 트윈 분석 리포트</h2>
          </div>
          <p className="text-xs text-[#8A8A70] mt-1 font-medium">
            측정 시간: {stats.durationSec}초 | 총 프레임: {stats.totalFramesAnalyzed}프레임
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 print:hidden">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-[#F5F5F0] hover:bg-[#E8E8DF] text-[#5A5A40] text-xs font-semibold border border-[#DEDECF] transition-all flex items-center space-x-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>CSV 데이터 다운로드</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-2xl bg-[#5A5A40] hover:bg-[#4a4a34] text-white text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>보고서 인쇄/PDF 저장</span>
          </button>
        </div>
      </div>

      {/* Primary ROM Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Left Knee Max Flexion */}
        <div className="bg-[#FDFDFB] p-4 rounded-2xl border border-[#F0F0E8]">
          <span className="text-[10px] font-bold text-[#8A8A70] uppercase tracking-wider block">
            좌측 최대 굴곡 (Max Flexion)
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-serif font-black text-[#FF6321]">
              {stats.leftMaxFlexion.toFixed(1)}°
            </span>
            <span className="text-xs text-[#8A8A70]">목표 120°+</span>
          </div>
          <div className="mt-2 text-[11px] text-[#5A5A40] font-medium">
            신전 최소: {stats.leftMinExtension.toFixed(1)}°
          </div>
        </div>

        {/* Right Knee Max Flexion */}
        <div className="bg-[#FDFDFB] p-4 rounded-2xl border border-[#F0F0E8]">
          <span className="text-[10px] font-bold text-[#8A8A70] uppercase tracking-wider block">
            우측 최대 굴곡 (Max Flexion)
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-serif font-black text-[#5A5A40]">
              {stats.rightMaxFlexion.toFixed(1)}°
            </span>
            <span className="text-xs text-[#8A8A70]">목표 120°+</span>
          </div>
          <div className="mt-2 text-[11px] text-[#5A5A40] font-medium">
            신전 최소: {stats.rightMinExtension.toFixed(1)}°
          </div>
        </div>

        {/* Average Asymmetry */}
        <div className="bg-[#FDFDFB] p-4 rounded-2xl border border-[#F0F0E8]">
          <span className="text-[10px] font-bold text-[#8A8A70] uppercase tracking-wider block">
            평균 좌우 비대칭도
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className={`text-3xl font-serif font-black ${stats.avgAsymmetry > 10 ? 'text-[#FF6321]' : 'text-[#5A5A40]'}`}>
              {stats.avgAsymmetry.toFixed(1)}°
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#5A5A40] font-medium">
            최대 비대칭: {stats.maxAsymmetry.toFixed(1)}°
          </div>
        </div>

        {/* Stiff Knee / Squat Reps */}
        <div className="bg-[#5A5A40] p-4 rounded-2xl text-white shadow-md">
          <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider block">
            {analysisMode === 'squat' ? '완료된 스쿼트' : '뻣뻣한 보행 감지'}
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-serif font-black text-white">
              {analysisMode === 'squat' ? `${stats.squatRepCount}회` : `${stats.stiffKneeCount}회`}
            </span>
          </div>
          <div className="mt-2 text-[11px] opacity-90">
            {analysisMode === 'squat' ? `정상 자세: ${stats.goodFormReps}회` : `총 보행 주기 분석됨`}
          </div>
        </div>
      </div>

      {/* AI Rehabilitation Consultant Section */}
      <div className="bg-[#5A5A40] rounded-2xl p-5 text-white space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-white/10 rounded-2xl text-white">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>Gemini AI 재활 컨설턴트 종합 피드백</span>
                <Sparkles className="w-3.5 h-3.5 text-[#FF6321]" />
              </h3>
              <p className="text-xs opacity-80">
                측정된 관절 가동범위 데이터 기반 맞춤형 운동 및 자세 교정 지침
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateAiFeedback}
            disabled={isLoadingAi}
            className="px-4 py-2.5 rounded-2xl bg-[#FF6321] hover:bg-[#e05316] text-white text-xs font-semibold transition-all flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {isLoadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isLoadingAi ? 'AI 보고서 생성 중...' : 'AI 종합 분석 리포트 생성'}</span>
          </button>
        </div>

        {aiError && (
          <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-xs text-white">
            {aiError}
          </div>
        )}

        {aiReport ? (
          <div className="p-4 bg-white text-[#2D2D24] rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans shadow-sm">
            {aiReport}
          </div>
        ) : (
          <div className="p-4 bg-white/10 rounded-2xl border border-dashed border-white/20 text-center text-xs text-white/80">
            상단의 [AI 종합 분석 리포트 생성] 버튼을 클릭하면 Gemini AI가 측정된 관절 데이터와 임상 기준을 종합하여 전문적인 피드백을 작성합니다.
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { SessionStats, AnalysisMode, AppSourceMode } from "../types";
import { Download, Printer, FileText } from "lucide-react";
export function SessionReport({
  stats,
  analysisMode,
  sourceMode,
}: {
  stats: SessionStats;
  analysisMode: AnalysisMode;
  sourceMode: AppSourceMode;
  onResetSession: () => void;
}) {
  const [aiReport, setAiReport] = useState("");
  const [aiError, setAiError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAiReport("");
    setAiError("");
  }, [stats.startTime, analysisMode, sourceMode]);
  const requestReport = async () => {
    setBusy(true);
    setAiError("");
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/rehab-feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: analysisMode,
            source: sourceMode,
            durationSec: stats.durationSec,
            frames: stats.totalFramesAnalyzed,
            leftMaxROM:
              analysisMode === "knee"
                ? stats.leftMaxFlexion
                : stats.leftMaxShoulderROM,
            rightMaxROM:
              analysisMode === "knee"
                ? stats.rightMaxFlexion
                : stats.rightMaxShoulderROM,
            asymmetry: stats.avgAsymmetry,
            repCount:
              analysisMode === "knee"
                ? stats.kneeRepCount
                : stats.shoulderRepCount,
          }),
        },
      );
      if (
        !(response.headers.get("content-type") || "").includes(
          "application/json",
        )
      )
        throw new Error(
          "AI 요약은 API 서버가 있는 환경에서 지원됩니다. CSV와 PDF 저장을 이용해주세요.",
        );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAiReport(data.report);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "AI 요약을 불러오지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };
  const simulation = sourceMode === "pose_simulator";
  const exportCSV = () => {
    const rows = stats.history.map((p) => [
      p.time.toFixed(2),
      p.leftAngle.toFixed(2),
      p.rightAngle.toFixed(2),
      Math.abs(p.leftAngle - p.rightAngle).toFixed(2),
      p.isCompensated ? 1 : 0,
      p.targetROM ?? "",
      p.maxAllowedROM ?? "",
      sourceMode,
      analysisMode,
    ]);
    const csv =
      "\uFEFF" +
      [
        [
          "Time(s)",
          "LeftAngle(deg)",
          "RightAngle(deg)",
          "Asymmetry(deg)",
          "Compensated",
          "TargetROM",
          "MaximumROM",
          "Source",
          "Joint",
        ].join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `rehab-${analysisMode}-${sourceMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const available = stats.totalFramesAnalyzed > 0;
  const format = (n: number) => (available ? `${n.toFixed(1)}°` : "—");
  const cards = [
    [
      "왼쪽 최대 가동범위",
      format(
        analysisMode === "knee"
          ? stats.leftMaxFlexion
          : stats.leftMaxShoulderROM,
      ),
    ],
    [
      "오른쪽 최대 가동범위",
      format(
        analysisMode === "knee"
          ? stats.rightMaxFlexion
          : stats.rightMaxShoulderROM,
      ),
    ],
    ["평균 좌우 차이", format(stats.avgAsymmetry)],
    [
      "완료한 반복",
      `${analysisMode === "knee" ? stats.kneeRepCount : stats.shoulderRepCount}회`,
    ],
  ];
  return (
    <section className="bg-white border border-[#DEDECF] rounded-[28px] p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="text-[#FF6321]" />
            <h2 className="text-xl font-bold">
              {analysisMode === "knee" ? "무릎" : "어깨"} 측정 리포트
            </h2>
          </div>
          <p className="text-sm text-[#5A5A40] mt-2">
            유효 분석 시간 {stats.durationSec}초 · 유효 프레임{" "}
            {stats.totalFramesAnalyzed.toLocaleString()}개
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={exportCSV}
            disabled={!stats.history.length}
            className="action-button"
          >
            <Download size={16} /> CSV 내보내기
          </button>
          <button onClick={() => window.print()} className="action-button">
            <Printer size={16} /> 인쇄 / PDF
          </button>
        </div>
      </div>
      <p
        className={`rounded-xl p-3 text-sm ${simulation ? "bg-amber-50 text-amber-900" : "bg-[#F5F5F0]"}`}
      >
        {simulation
          ? "시뮬레이션 데이터 · 실제 신체 측정 결과가 아닙니다."
          : "카메라 기반 3D 관절 각도 추정 · 신뢰도가 낮은 프레임은 기록에서 제외합니다."}
      </p>
      {!available && (
        <p className="py-8 text-center text-[#5A5A40]">
          아직 유효한 측정값이 없습니다. 모니터에서 측정을 시작하세요.
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-[#F5F5F0] p-5">
            <p className="text-xs text-[#5A5A40]">{label}</p>
            <p className="text-3xl font-bold tabular-nums mt-3">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-[#5A5A40]">
        최대 좌우 차이 {format(stats.maxAsymmetry)} · 몸통 보상 발생{" "}
        {stats.compensationCount}회
      </p>
      <div className="rounded-2xl bg-[#F5F5F0] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">AI 측정 요약</h3>
            <p className="text-xs text-[#5A5A40] mt-1">
              측정된 통계를 바탕으로 관찰 내용을 정리합니다.
            </p>
          </div>
          <button
            className="action-button print:hidden"
            onClick={requestReport}
            disabled={!available || busy}
          >
            {busy ? "요약 생성 중…" : "AI 요약 생성"}
          </button>
        </div>
        {aiError && (
          <p role="alert" className="text-sm text-red-700">
            {aiError}
          </p>
        )}
        {aiReport && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {aiReport}
          </p>
        )}
      </div>
      <p className="text-xs text-[#8A8A70]">
        CSV는 최근 최대 1,500개 시계열 표본(약 10분)을 포함합니다. 요약 통계는
        전체 세션의 유효 프레임을 기준으로 계산합니다. 손가락 수치는 별도 실시간
        추정값으로 이 보고서에 포함되지 않습니다.
      </p>
    </section>
  );
}

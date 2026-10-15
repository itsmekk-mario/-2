import React from "react";
import { SimulationConfig } from "../utils/poseSimulator";
export function SimulationControls({
  config,
  setConfig,
  restart,
}: {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  restart: () => void;
}) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-amber-950">시뮬레이션 실험실</h2>
          <p className="text-xs text-amber-900 mt-1">
            합성 데이터 · 실제 측정 아님 · 6초 주기 동작 · 무릎/어깨 선택에 따라
            자동 전환
          </p>
        </div>
        <button onClick={restart} className="action-button">
          처음부터 재생
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-5">
        {(
          [
            ["speed", "재생 속도", 0.25, 2, 0.25, "×"],
            ["maxAngle", "최대 각도", 30, 150, 5, "°"],
            ["asymmetry", "오른쪽 가동범위 감소", 0, 40, 5, "°"],
          ] as const
        ).map(([key, label, min, max, step, unit]) => (
          <label
            key={key}
            className="text-xs font-semibold flex flex-col gap-2"
          >
            <span>
              {label}{" "}
              <span className="float-right tabular-nums">
                {config[key]}
                {unit}
              </span>
            </span>
            <input
              aria-label={label}
              type="range"
              min={min}
              max={max}
              step={step}
              value={config[key]}
              onChange={(e) =>
                setConfig((p) => ({ ...p, [key]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
      </div>
      <label className="flex gap-2 items-center text-xs">
        <input
          type="checkbox"
          checked={config.trackingLoss}
          onChange={(e) =>
            setConfig((p) => ({ ...p, trackingLoss: e.target.checked }))
          }
        />
        인식 불안정 재현 (수치·기록·반복 집계 중단)
      </label>
    </section>
  );
}

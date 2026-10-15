import React from "react";
import { FINGERS, TrackedHand } from "../utils/handAnalysis";
export function HandPanel({
  enabled,
  onToggle,
  hands,
  status,
  simulated,
}: {
  enabled: boolean;
  onToggle: () => void;
  hands: TrackedHand[];
  status: string;
  simulated: boolean;
}) {
  return (
    <section className="bg-white border border-[#DEDECF] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">
            손가락 움직임{" "}
            <span className="text-xs font-normal text-[#8A8A70]">
              MediaPipe Hands · 양손 21개 관절
            </span>
          </h2>
          <p role="status" className="text-xs text-[#5A5A40] mt-1">
            {status}
          </p>
        </div>
        <button
          disabled={simulated}
          aria-pressed={enabled}
          onClick={onToggle}
          className="action-button"
        >
          {enabled ? "손가락 인식 끄기" : "손가락 인식 켜기"}
        </button>
      </div>
      {enabled && !simulated && (
        <>
          <p className="text-xs text-[#8A8A70]">
            엄지는 IP, 나머지는 PIP 관절 굴곡 추정값입니다. 편 상태는 약 0°이며,
            손 전체가 화면에 보이도록 해주세요.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {["Left", "Right"].map((side) => {
              const hand = hands.find((h) => h.side === side);
              return (
                <div key={side} className="bg-[#F5F5F0] rounded-xl p-4">
                  <p className="font-semibold text-sm mb-3">
                    {side === "Left" ? "왼손" : "오른손"}{" "}
                    <span className="font-normal text-xs text-[#5A5A40]">
                      {hand
                        ? `인식 신뢰도 ${Math.round(hand.score * 100)}%`
                        : "미감지"}
                    </span>
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {FINGERS.map((name, i) => (
                      <div key={name}>
                        <p className="text-xs text-[#5A5A40]">{name}</p>
                        <p className="font-bold tabular-nums mt-1">
                          {hand ? `${hand.flexion[i].toFixed(0)}°` : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

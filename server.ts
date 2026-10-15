import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API route for health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API route for AI Rehabilitation & Pose Feedback powered by Gemini
app.post("/api/rehab-feedback", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error:
          "GEMINI_API_KEY가 설정되지 않았습니다. 기본 알고리즘 분석 결과만 표시합니다.",
      });
    }

    const {
      mode,
      source,
      durationSec,
      frames,
      leftMaxROM,
      rightMaxROM,
      asymmetry,
      repCount,
    } = req.body;
    if (
      !["knee", "shoulder"].includes(mode) ||
      !["realtime_camera", "video_file", "pose_simulator"].includes(source) ||
      ![
        durationSec,
        frames,
        leftMaxROM,
        rightMaxROM,
        asymmetry,
        repCount,
      ].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) ||
      frames < 1 ||
      leftMaxROM > 180 ||
      rightMaxROM > 180 ||
      asymmetry > 180
    ) {
      return res.status(400).json({ error: "유효한 측정 통계가 필요합니다." });
    }
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `웹캠 기반 관절 움직임 모니터의 관찰 내용을 한국어로 간결하게 요약하세요.
데이터는 ${source === "pose_simulator" ? "합성 시뮬레이션이며 실제 신체 측정이 아닙니다" : "MediaPipe 3D 관절 추정값이며 실측과 오차가 있습니다"}.
관절: ${mode === "knee" ? "무릎" : "어깨"}, 유효 시간: ${durationSec}초, 프레임: ${frames},
왼쪽 최대: ${leftMaxROM}도, 오른쪽 최대: ${rightMaxROM}도, 평균 좌우 차이: ${asymmetry}도, 완료 반복: ${repCount}회.
제공된 통계만 사용하세요. 측정하지 않은 보행, 신전 최소값, 손가락 값, 질환 원인 등을 추론하거나 만들어내지 마세요.
진단이나 개인별 운동 처방 대신 관찰 요약과 촬영 자세 확인 방법을 제시하세요. 고정된 임상 목표각을 강요하지 마세요.`;
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
    });
    const report = response.text || "측정 요약을 생성하지 못했습니다.";
    res.json({ report });
  } catch (error: any) {
    console.error("Gemini Rehab Feedback error:", error);
    res
      .status(500)
      .json({ error: error.message || "서버 오류가 발생했습니다." });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `MediaPipe Knee Twin Server running on http://localhost:${PORT}`,
    );
  });
}

startServer();

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
        error: "GEMINI_API_KEY가 설정되지 않았습니다. 기본 알고리즘 분석 결과만 표시합니다.",
      });
    }

    const { mode, leftMaxFlexion, rightMaxFlexion, leftMinExtension, rightMinExtension, asymmetry, stiffKneeCount, repCount, durationSec } = req.body;

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
너는 물리치료사 및 하체 재활 보행 분석 전문가(Physical Therapist & Biomechanics Specialist)이다.
다음 환자/사용자의 웹캠 기반 MediaPipe 하체 포즈 측정 데이터를 분석하여 전문적이고 용기를 북돋는 재활 분석 보고서를 한국어로 작성해라.

[측정 요약 데이터]
- 측정 모드: ${mode === 'gait' ? '보행 분석 (Gait Analysis)' : mode === 'squat' ? '스쿼트/재활 운동 (Squat Training)' : '자유 ROM 관절 가동범위 측정'}
- 측정 시간: ${durationSec || 0}초
- 왼쪽 무릎 최대 굴곡각 (Max Flexion): ${leftMaxFlexion?.toFixed(1) || 0}°
- 오른쪽 무릎 최대 굴곡각 (Max Flexion): ${rightMaxFlexion?.toFixed(1) || 0}°
- 왼쪽 무릎 최소 신전각 (Min Extension): ${leftMinExtension?.toFixed(1) || 0}°
- 오른쪽 무릎 최소 신전각 (Min Extension): ${rightMinExtension?.toFixed(1) || 0}°
- 좌우 무릎 각도 비대칭도 (Asymmetry Index): ${asymmetry?.toFixed(1) || 0}°
- 뻣뻣한 무릎 보행(Stiff Knee Gait) 감지 횟수: ${stiffKneeCount || 0}회
- 스쿼트/운동 완수 횟수: ${repCount || 0}회

[임상적 목표 가동범위 기준]
- 슬관절 전치환술(TKA) / 보행 재활 목표: 신전 0°, 굴곡 120° 이상
- 정상 보행 유각기(Swing Phase) 무릎 굴곡: 약 62°
- 뻣뻣한 무릎 보행(Stiff Knee Gait): 유각기 굴곡 45° 미만 (슬괵근 경직, 하퇴삼두근 약화, 뇌성마비 등 원인)

작성 형식:
1. 종합 평가 (2-3문장 요약)
2. 관절 가동범위(ROM) 및 좌우 대칭성 분석
3. 뻣뻣한 무릎 보행/자세 불균형에 대한 원인 추정 및 주의사항
4. 맞춤형 재활/교정 운동 추천 3가지 (단계별 안내)

답변은 마크다운 형식으로 명확하고 친절하며 임상적으로 신뢰성 있게 작성하세요.
`;

    let report = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });
      report = response.text || "분석 보고서를 생성하지 못했습니다.";
    } catch (modelErr: any) {
      console.warn("Primary model error, attempting fallback:", modelErr);
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });
      report = fallbackResponse.text || "분석 보고서를 생성하지 못했습니다.";
    }

    res.json({ report });
  } catch (error: any) {
    console.error("Gemini Rehab Feedback error:", error);
    res.status(500).json({ error: error.message || "서버 오류가 발생했습니다." });
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
    console.log(`MediaPipe Knee Twin Server running on http://localhost:${PORT}`);
  });
}

startServer();

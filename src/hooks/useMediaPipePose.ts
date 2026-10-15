import { useState, useEffect, useRef, useCallback } from "react";
import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  FullBodyLandmarks,
  JointAngles,
  KneeMovementState,
  ShoulderMovementState,
  TrackingQuality,
  MeasurementQuality,
  TorsoCompensationInfo,
  MajorMode,
  ShoulderExercise,
  OperatedSide,
  ShoulderUserConfig,
  SessionMaxROM,
  SessionStats,
  AppSourceMode,
  DebugInfo,
  Landmark,
} from "../types";
import {
  CONFIG,
  calculateKneeFlexionAngle,
  calculateShoulderFlexion,
  calculateShoulderAbduction,
  smoothAngle,
  isLandmarkReliable,
  detectTorsoCompensation,
  evaluateMeasurementQuality,
  updateKneeMovementState,
  updateShoulderMovementState,
  generateFeedback,
} from "../utils/angleCalculator";
import {
  DEFAULT_SIMULATION,
  SimulationConfig,
  simulatePose,
} from "../utils/poseSimulator";
import { TrackedHand, fingerFlexion } from "../utils/handAnalysis";

let visionRuntime: Promise<{
  tasks: typeof import("@mediapipe/tasks-vision");
  vision: Awaited<
    ReturnType<
      typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks
    >
  >;
}> | null = null;
function loadVisionRuntime() {
  if (!visionRuntime)
    visionRuntime = (async () => {
      const tasks = await import("@mediapipe/tasks-vision");
      const vision = await tasks.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
      );
      return { tasks, vision };
    })().catch((error) => {
      visionRuntime = null;
      throw error;
    });
  return visionRuntime;
}

const emptyStats = (): SessionStats => ({
  startTime: Date.now(),
  durationSec: 0,
  totalFramesAnalyzed: 0,
  leftMaxFlexion: 0,
  rightMaxFlexion: 0,
  kneeRepCount: 0,
  leftMaxShoulderROM: 0,
  rightMaxShoulderROM: 0,
  shoulderRepCount: 0,
  avgAsymmetry: 0,
  maxAsymmetry: 0,
  compensationCount: 0,
  history: [],
  logs: [],
});
const noCompensation = { isCompensated: false, tiltAngle: 0, message: null };
const indices = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
};
function mapPose(points: Landmark[]): FullBodyLandmarks {
  return Object.fromEntries(
    Object.entries(indices).map(([key, index]) => [key, points[index]]),
  ) as unknown as FullBodyLandmarks;
}

export function useMediaPipePose(
  sourceMode: AppSourceMode,
  majorMode: MajorMode,
  shoulderExercise: ShoulderExercise,
  operatedSide: OperatedSide,
  shoulderConfig: ShoulderUserConfig,
  isProcessing: boolean,
  soundEnabled: boolean,
  facingMode: "user" | "environment" = "user",
  isMirrored = true,
  simulation: SimulationConfig = DEFAULT_SIMULATION,
  handsEnabled = false,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarks, setLandmarks] = useState<FullBodyLandmarks | null>(null);
  const [angles, setAngles] = useState<JointAngles | null>(null);
  const [kneeState, setKneeState] = useState<KneeMovementState>("STANDING");
  const [shoulderState, setShoulderState] =
    useState<ShoulderMovementState>("REST");
  const [kneeRepCount, setKneeRepCount] = useState(0);
  const [shoulderRepCount, setShoulderRepCount] = useState(0);
  const [trackingQuality, setTrackingQuality] =
    useState<TrackingQuality>("LOST");
  const [measurementQuality, setMeasurementQuality] =
    useState<MeasurementQuality>("POOR");
  const [torsoCompensation, setTorsoCompensation] =
    useState<TorsoCompensationInfo>(noCompensation);
  const [sessionMaxROM, setSessionMaxROM] = useState<SessionMaxROM>({
    leftMax: 0,
    rightMax: 0,
  });
  const [feedbackMessage, setFeedbackMessage] = useState(
    "입력 소스를 선택하고 측정을 시작하세요.",
  );
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [hands, setHands] = useState<TrackedHand[]>([]);
  const [handStatus, setHandStatus] = useState("손가락 인식 꺼짐");
  const [fps, setFps] = useState(0);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [sessionStats, setSessionStats] = useState(emptyStats);
  const frameElapsed = useRef(0);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const handRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraGeneration = useRef(0);
  const state = useRef({
    knee: "STANDING" as KneeMovementState,
    shoulder: "REST" as ShoulderMovementState,
    knees: 0,
    shoulders: 0,
    kneeReady: false,
    shoulderReady: false,
  });
  const smooth = useRef<{ left: number | null; right: number | null }>({
    left: null,
    right: null,
  });
  const clock = useRef({
    simulation: 0,
    active: 0,
    lastHistory: -1,
    lastMedia: -1,
    frames: 0,
    fpsAt: 0,
    alertAt: 0,
    compensated: false,
  });
  const latest = useRef({
    sourceMode,
    majorMode,
    shoulderExercise,
    operatedSide,
    shoulderConfig,
    isProcessing,
    soundEnabled,
    simulation,
    handsEnabled,
  });
  latest.current = {
    sourceMode,
    majorMode,
    shoulderExercise,
    operatedSide,
    shoulderConfig,
    isProcessing,
    soundEnabled,
    simulation,
    handsEnabled,
  };
  const resetSession = useCallback(() => {
    state.current = {
      knee: "STANDING",
      shoulder: "REST",
      knees: 0,
      shoulders: 0,
      kneeReady: false,
      shoulderReady: false,
    };
    smooth.current = { left: null, right: null };
    clock.current = {
      simulation: 0,
      active: 0,
      lastHistory: -1,
      lastMedia: -1,
      frames: 0,
      fpsAt: 0,
      alertAt: 0,
      compensated: false,
    };
    setAngles(null);
    setLandmarks(null);
    setHands([]);
    setDebugInfo(null);
    setFps(0);
    setTrackingQuality("LOST");
    setMeasurementQuality("POOR");
    setTorsoCompensation(noCompensation);
    setWarningMessage(null);
    setKneeState("STANDING");
    setShoulderState("REST");
    setKneeRepCount(0);
    setShoulderRepCount(0);
    setSessionMaxROM({ leftMax: 0, rightMax: 0 });
    setSessionStats(emptyStats());
  }, []);
  useEffect(resetSession, [
    sourceMode,
    majorMode,
    shoulderExercise,
    operatedSide,
    shoulderConfig.targetROM,
    shoulderConfig.enableRepCounter,
    resetSession,
  ]);
  const resetSessionMaxROM = useCallback(() => {
    setSessionMaxROM({ leftMax: 0, rightMax: 0 });
    setSessionStats((p) => ({
      ...p,
      leftMaxFlexion: 0,
      rightMaxFlexion: 0,
      leftMaxShoulderROM: 0,
      rightMaxShoulderROM: 0,
    }));
  }, []);
  const stopCamera = useCallback(() => {
    cameraGeneration.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    const generation = cameraGeneration.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (generation !== cameraGeneration.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        if (latest.current.isProcessing) await videoRef.current.play();
      }
    } catch (error: any) {
      if (generation === cameraGeneration.current)
        setCameraError(
          error.name === "NotAllowedError"
            ? "카메라 권한을 허용하거나 시뮬레이션을 선택하세요."
            : "카메라 연결을 확인해주세요. HTTPS 또는 localhost에서 실행해야 합니다.",
        );
    }
  }, [facingMode, stopCamera]);
  useEffect(() => {
    setCameraError(null);
    if (sourceMode === "realtime_camera") void startCamera();
    else stopCamera();
    return stopCamera;
  }, [sourceMode, startCamera, stopCamera]);

  useEffect(() => {
    if (!isProcessing) setFps(0);
  }, [isProcessing]);
  const consume = useRef<(results: any) => void>(() => {});
  consume.current = (results: any) => {
    const opts = latest.current;
    if (!opts.isProcessing) return;
    clock.current.frames++;
    const image: Landmark[] = results.poseLandmarks;
    const world: Landmark[] = results.poseWorldLandmarks;
    const lost = (quality: TrackingQuality, message: string) => {
      setAngles(null);
      setLandmarks(image?.length === 33 ? mapPose(image) : null);
      setTrackingQuality(quality);
      setMeasurementQuality("POOR");
      setFeedbackMessage(message);
      setWarningMessage(null);
      setDebugInfo(null);
      setTorsoCompensation(noCompensation);
      smooth.current = { left: null, right: null };
      state.current.knee = "STANDING";
      state.current.shoulder = "REST";
      state.current.kneeReady = false;
      state.current.shoulderReady = false;
      setKneeState("STANDING");
      setShoulderState("REST");
    };
    if (image?.length !== 33 || world?.length !== 33) {
      lost("LOST", "신체 전체가 보이도록 위치를 조정하세요.");
      return;
    }
    const ids =
      opts.majorMode === "knee"
        ? [23, 24, 25, 26, 27, 28]
        : [11, 12, 13, 14, 23, 24];
    if (
      !isLandmarkReliable(ids.map((i) => image[i])) ||
      !isLandmarkReliable(
        ids.map((i) => world[i]),
        0,
      )
    ) {
      lost(
        "LOW CONFIDENCE",
        "관절 인식이 불안정해 기록을 중단했습니다. 가려진 관절을 비춰주세요.",
      );
      return;
    }
    const l = mapPose(world);
    const display = mapPose(image);
    const lk = calculateKneeFlexionAngle(l.leftHip, l.leftKnee, l.leftAnkle),
      rk = calculateKneeFlexionAngle(l.rightHip, l.rightKnee, l.rightAnkle);
    const lf = calculateShoulderFlexion(l.leftShoulder, l.leftElbow, l.leftHip),
      rf = calculateShoulderFlexion(l.rightShoulder, l.rightElbow, l.rightHip);
    const la = calculateShoulderAbduction(
        l.leftShoulder,
        l.leftElbow,
        l.leftHip,
      ),
      ra = calculateShoulderAbduction(
        l.rightShoulder,
        l.rightElbow,
        l.rightHip,
      );
    const rawLeft =
      opts.majorMode === "knee"
        ? lk.flexion
        : opts.shoulderExercise === "flexion"
          ? lf
          : la;
    const rawRight =
      opts.majorMode === "knee"
        ? rk.flexion
        : opts.shoulderExercise === "flexion"
          ? rf
          : ra;
    if (![rawLeft, rawRight].every(Number.isFinite)) {
      lost("LOW CONFIDENCE", "유효한 관절 각도를 계산할 수 없습니다.");
      return;
    }
    const factor =
      1 - Math.exp(-Math.max(frameElapsed.current, 1 / 120) / 0.08);
    const left = smoothAngle(rawLeft, smooth.current.left, factor),
      right = smoothAngle(rawRight, smooth.current.right, factor);
    smooth.current = { left, right };
    clock.current.active += frameElapsed.current;
    const a: JointAngles = {
      leftKneeFlexion: opts.majorMode === "knee" ? left : lk.flexion,
      rightKneeFlexion: opts.majorMode === "knee" ? right : rk.flexion,
      leftKneeInternal: lk.internal,
      rightKneeInternal: rk.internal,
      leftShoulderFlexion: lf,
      rightShoulderFlexion: rf,
      leftShoulderAbduction: la,
      rightShoulderAbduction: ra,
      currentLeft: left,
      currentRight: right,
      asymmetry: Math.abs(left - right),
    };
    const compensation =
      opts.majorMode === "shoulder"
        ? detectTorsoCompensation(
            l.leftShoulder,
            l.rightShoulder,
            l.leftHip,
            l.rightHip,
          )
        : noCompensation;
    const s = state.current;
    if (
      left <= CONFIG.knee.standingFlexion &&
      right <= CONFIG.knee.standingFlexion
    )
      s.kneeReady = true;
    const shoulderAngle =
      opts.operatedSide === "left"
        ? left
        : opts.operatedSide === "right"
          ? right
          : Math.min(left, right);
    if (compensation.isCompensated) {
      s.shoulderReady = false;
      s.shoulder = "REST";
    } else if (
      shoulderAngle <=
      Math.min(
        CONFIG.shoulder.restAngle,
        (opts.shoulderConfig.targetROM ?? 80) * 0.25,
      )
    )
      s.shoulderReady = true;
    if (opts.majorMode === "knee" && s.kneeReady) {
      const next = updateKneeMovementState(s.knee, left, right);
      s.knee = next.nextState;
      if (next.repCompleted) s.knees++;
    } else if (
      opts.majorMode === "shoulder" &&
      s.shoulderReady &&
      opts.shoulderConfig.enableRepCounter &&
      !compensation.isCompensated
    ) {
      const next = updateShoulderMovementState(
        s.shoulder,
        opts.operatedSide === "left"
          ? left
          : opts.operatedSide === "right"
            ? right
            : Math.min(left, right),
        opts.shoulderConfig.targetROM,
      );
      s.shoulder = next.nextState;
      if (next.repCompleted) s.shoulders++;
    }
    const quality = evaluateMeasurementQuality(
      "GOOD",
      compensation.isCompensated,
      true,
    );
    setLandmarks(display);
    setAngles(a);
    setTrackingQuality("GOOD");
    setMeasurementQuality(quality);
    setTorsoCompensation(compensation);
    setKneeState(s.knee);
    setShoulderState(s.shoulder);
    setKneeRepCount(s.knees);
    setShoulderRepCount(s.shoulders);
    setSessionMaxROM((p) => ({
      leftMax: Math.max(p.leftMax, left),
      rightMax: Math.max(p.rightMax, right),
    }));
    const feedback = generateFeedback({
      ...opts,
      angles: a,
      trackingQuality: "GOOD",
      kneeState: s.knee,
      shoulderState: s.shoulder,
      torsoCompensation: compensation,
    });
    setFeedbackMessage(feedback.message);
    setWarningMessage(
      feedback.alertLevel === "normal" ? null : feedback.message,
    );
    const now = performance.now();
    if (
      feedback.alertLevel === "alert" &&
      opts.soundEnabled &&
      now - clock.current.alertAt > 2500
    ) {
      clock.current.alertAt = now;
      try {
        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        gain.gain.value = 0.04;
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.12);
        oscillator.onended = () => {
          void audio.close();
        };
      } catch {
        /* Audio may be blocked until a user gesture. */
      }
    }
    const time = clock.current.active;
    const counts = { knees: s.knees, shoulders: s.shoulders };
    const log = {
      id: String(now),
      timestamp: new Date().toLocaleTimeString(),
      joint:
        opts.majorMode === "knee" ? ("KNEE" as const) : ("SHOULDER" as const),
      side:
        opts.operatedSide === "left"
          ? ("LEFT" as const)
          : opts.operatedSide === "right"
            ? ("RIGHT" as const)
            : ("BILATERAL" as const),
      movement:
        opts.majorMode === "knee"
          ? "FLEXION"
          : opts.shoulderExercise.toUpperCase(),
      angle: opts.operatedSide === "right" ? right : left,
      trackingConfidence: "GOOD" as const,
      compensationDetected: compensation.isCompensated,
    };
    const record = time - clock.current.lastHistory >= 0.4;
    if (record) clock.current.lastHistory = time;
    const compensationStarted =
      compensation.isCompensated && !clock.current.compensated;
    clock.current.compensated = compensation.isCompensated;
    setSessionStats((p) => ({
      ...p,
      durationSec: Math.floor(time),
      totalFramesAnalyzed: p.totalFramesAnalyzed + 1,
      leftMaxFlexion:
        opts.majorMode === "knee"
          ? Math.max(p.leftMaxFlexion, left)
          : p.leftMaxFlexion,
      rightMaxFlexion:
        opts.majorMode === "knee"
          ? Math.max(p.rightMaxFlexion, right)
          : p.rightMaxFlexion,
      leftMaxShoulderROM:
        opts.majorMode === "shoulder"
          ? Math.max(p.leftMaxShoulderROM, left)
          : p.leftMaxShoulderROM,
      rightMaxShoulderROM:
        opts.majorMode === "shoulder"
          ? Math.max(p.rightMaxShoulderROM, right)
          : p.rightMaxShoulderROM,
      kneeRepCount: counts.knees,
      shoulderRepCount: counts.shoulders,
      avgAsymmetry:
        p.avgAsymmetry +
        (a.asymmetry - p.avgAsymmetry) / (p.totalFramesAnalyzed + 1),
      maxAsymmetry: Math.max(p.maxAsymmetry, a.asymmetry),
      compensationCount: p.compensationCount + Number(compensationStarted),
      history: record
        ? [
            ...p.history.slice(-1499),
            {
              time,
              leftAngle: left,
              rightAngle: right,
              targetROM:
                opts.majorMode === "shoulder"
                  ? opts.shoulderConfig.targetROM
                  : null,
              maxAllowedROM:
                opts.majorMode === "shoulder"
                  ? opts.shoulderConfig.maximumAllowedROM
                  : null,
              isCompensated: compensation.isCompensated,
            },
          ]
        : p.history,
      logs: record ? [log, ...p.logs.slice(0, 49)] : p.logs,
    }));
    setDebugInfo({
      ...l,
      torsoTiltAngle: compensation.tiltAngle,
      torsoCompensated: compensation.isCompensated,
      rawLeft,
      rawRight,
      smoothedLeft: left,
      smoothedRight: right,
      currentState: opts.majorMode === "knee" ? s.knee : s.shoulder,
      repCount: opts.majorMode === "knee" ? s.knees : s.shoulders,
      trackingQuality: "GOOD",
      measurementQuality: quality,
    });
  };

  useEffect(() => {
    if (sourceMode === "pose_simulator") {
      setModelError(null);
      return;
    }
    let cancelled = false;
    let model: PoseLandmarker | undefined;
    (async () => {
      try {
        setModelError(null);
        setFeedbackMessage("자세 인식 모델을 불러오는 중입니다…");
        const { tasks, vision } = await loadVisionRuntime();
        if (cancelled) return;
        model = await tasks.PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        if (cancelled) model.close();
        else {
          poseRef.current = model;
          setFeedbackMessage("자세 모델 준비 완료 · 몸 전체를 비춰주세요.");
        }
      } catch {
        if (!cancelled)
          setModelError(
            "자세 모델 로드 실패. 네트워크를 확인하거나 시뮬레이션을 이용하세요.",
          );
      }
    })();
    return () => {
      cancelled = true;
      poseRef.current = null;
      model?.close();
    };
  }, [sourceMode]);

  useEffect(() => {
    setHands([]);
    if (!handsEnabled || sourceMode === "pose_simulator") {
      setHandStatus(
        sourceMode === "pose_simulator"
          ? "시뮬레이션에서는 손 인식을 실행하지 않습니다."
          : "손가락 인식 꺼짐",
      );
      return;
    }
    let cancelled = false;
    let model: HandLandmarker | undefined;
    setHandStatus("손가락 모델 로딩 중…");
    (async () => {
      try {
        const { tasks, vision } = await loadVisionRuntime();
        if (cancelled) return;
        model = await tasks.HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        if (cancelled) model.close();
        else {
          handRef.current = model;
          setHandStatus("손을 카메라 가까이 비춰주세요.");
        }
      } catch {
        if (!cancelled)
          setHandStatus(
            "손 모델 로드 실패. 네트워크를 확인하고 인식을 다시 켜세요.",
          );
      }
    })();
    return () => {
      cancelled = true;
      handRef.current = null;
      model?.close();
    };
  }, [handsEnabled, sourceMode]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let previous = performance.now();
    const tick = async (now: number) => {
      if (cancelled) return;
      const elapsed = document.hidden
        ? 0
        : Math.min((now - previous) / 1000, 0.25);
      previous = now;
      const opts = latest.current;
      if (opts.isProcessing) {
        if (opts.sourceMode === "pose_simulator") {
          frameElapsed.current = elapsed;
          clock.current.simulation += elapsed * opts.simulation.speed;
          consume.current(
            simulatePose(
              clock.current.simulation,
              opts.majorMode,
              opts.shoulderExercise,
              opts.simulation,
            ),
          );
        } else {
          const video = videoRef.current;
          if (
            video &&
            !video.paused &&
            video.readyState >= 2 &&
            poseRef.current &&
            video.currentTime !== clock.current.lastMedia
          ) {
            // Use media time so 30fps video on a 60Hz display is not timed at half speed.
            const mediaDelta = clock.current.lastMedia < 0 ? 0 : video.currentTime - clock.current.lastMedia;
            frameElapsed.current = mediaDelta >= 0 && mediaDelta < 0.5 ? mediaDelta : 0;
            clock.current.lastMedia = video.currentTime;
            try {
              const result = poseRef.current.detectForVideo(
                video,
                performance.now(),
              );
              consume.current({
                poseLandmarks: result.landmarks[0],
                poseWorldLandmarks: result.worldLandmarks[0],
              });
              if (cancelled) return;
              if (!cancelled && opts.handsEnabled && handRef.current) {
                try {
                  const result = handRef.current.detectForVideo(
                    video,
                    performance.now(),
                  );
                  setHands(
                    result.landmarks.flatMap((points, i) => {
                      const score = result.handedness[i]?.[0]?.score ?? 0;
                      if (score < 0.6 || !result.worldLandmarks[i]) return [];
                      // Tasks Vision labels refer to the original input, independent of CSS mirroring.
                      const side =
                        result.handedness[i]?.[0]?.categoryName ?? "Unknown";
                      const flexion = fingerFlexion(result.worldLandmarks[i]);
                      return flexion.every(Number.isFinite)
                        ? [{ side, score, landmarks: points, flexion }]
                        : [];
                    }),
                  );
                  setHandStatus(
                    result.landmarks.length
                      ? "손가락 추적 중 · IP/PIP 굴곡 추정"
                      : "손 미감지 · 손바닥 전체를 비춰주세요.",
                  );
                } catch {
                  setHands([]);
                  setHandStatus(
                    "손 추적 중 오류가 발생했습니다. 인식을 껐다가 다시 켜주세요.",
                  );
                }
              }
            } catch {
              if (!cancelled) {
                setHands([]);
                consume.current({});
              }
            }
          }
        }
        if (now - clock.current.fpsAt >= 1000) {
          setFps(
            Math.round(
              (clock.current.frames * 1000) / (now - clock.current.fpsAt),
            ),
          );
          clock.current.frames = 0;
          clock.current.fpsAt = now;
        }
      }
      if (!cancelled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [sourceMode]);
  return {
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
    cameraError:
      sourceMode === "pose_simulator" ? null : cameraError || modelError,
    sessionStats,
    fps,
    debugInfo,
    hands,
    handStatus,
    startCamera,
    stopCamera,
    resetSession,
    resetSessionMaxROM,
  };
}

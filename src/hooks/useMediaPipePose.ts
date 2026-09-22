import { useState, useEffect, useRef, useCallback } from 'react';
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
  DataPoint,
  MeasurementLogItem,
  AppSourceMode,
  DebugInfo,
} from '../types';
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
  updateRepCount,
  updateSessionMaxROM,
  generateFeedback,
} from '../utils/angleCalculator';

// Audio Feedback (Web Audio API)
function playTone(freq: number, type: OscillatorType = 'sine', duration = 0.12) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // ignore audio block
  }
}

export function useMediaPipePose(
  sourceMode: AppSourceMode,
  majorMode: MajorMode,
  shoulderExercise: ShoulderExercise,
  operatedSide: OperatedSide,
  shoulderConfig: ShoulderUserConfig,
  isProcessing: boolean,
  soundEnabled: boolean,
  facingMode: 'user' | 'environment' = 'user',
  isMirrored = true
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [landmarks, setLandmarks] = useState<FullBodyLandmarks | null>(null);
  const [angles, setAngles] = useState<JointAngles | null>(null);
  const [kneeState, setKneeState] = useState<KneeMovementState>('STANDING');
  const [shoulderState, setShoulderState] = useState<ShoulderMovementState>('REST');
  const [kneeRepCount, setKneeRepCount] = useState<number>(0);
  const [shoulderRepCount, setShoulderRepCount] = useState<number>(0);
  const [trackingQuality, setTrackingQuality] = useState<TrackingQuality>('LOST');
  const [measurementQuality, setMeasurementQuality] = useState<MeasurementQuality>('POOR');
  const [torsoCompensation, setTorsoCompensation] = useState<TorsoCompensationInfo>({
    isCompensated: false,
    tiltAngle: 0,
    message: null,
  });
  const [sessionMaxROM, setSessionMaxROM] = useState<SessionMaxROM>({ leftMax: 0, rightMax: 0 });
  const [feedbackMessage, setFeedbackMessage] = useState<string>('Pose 모델을 준비하는 중입니다...');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Session Statistics
  const [sessionStats, setSessionStats] = useState<SessionStats>({
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

  // Internal Refs
  const poseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const smoothedAnglesRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const lastLogTimeRef = useRef<number>(0);
  const lastHistoryLogTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(Date.now());

  // Reset Session
  const resetSession = useCallback(() => {
    setKneeRepCount(0);
    setShoulderRepCount(0);
    setKneeState('STANDING');
    setShoulderState('REST');
    setSessionMaxROM({ leftMax: 0, rightMax: 0 });
    setSessionStats({
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
    smoothedAnglesRef.current = { left: 0, right: 0 };
  }, []);

  // Reset Session Max ROM only (Requirement 16)
  const resetSessionMaxROM = useCallback(() => {
    setSessionMaxROM({ leftMax: 0, rightMax: 0 });
  }, []);

  /**
   * Stop Webcam and Cleanup MediaStream Tracks
   * Requirement 2: Clean stream termination
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Start Webcam Stream
   * Requirement 2: Browser camera permission, error handling
   */
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('이 브라우저는 웹캠 미디어 API를 지원하지 않습니다.');
      return;
    }

    try {
      setFeedbackMessage('카메라 권한을 확인하는 중입니다...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => resolve()).catch(() => resolve());
          };
        });
      }
      setFeedbackMessage('웹캠이 연결되었습니다. 신체를 비추세요.');
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('카메라 권한이 필요합니다. 브라우저 주소창에서 카메라 사용을 허용해주세요.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('카메라를 찾을 수 없습니다. 웹캠이 연결되어 있는지 확인해주세요.');
      } else {
        setCameraError(`카메라 초기화 실패: ${err.message || '카메라를 시작할 수 없습니다.'}`);
      }
      setTrackingQuality('LOST');
    }
  }, [facingMode, stopCamera]);

  /**
   * Initialize MediaPipe Pose Model
   */
  useEffect(() => {
    let isCancelled = false;

    async function initializePoseLandmarker() {
      try {
        setFeedbackMessage('Pose 모델을 불러오는 중입니다...');
        let PoseClass = (window as any).Pose;

        if (!PoseClass) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('MediaPipe Pose 스크립트 로드 실패'));
            document.head.appendChild(script);
          });
          PoseClass = (window as any).Pose;
        }

        if (!PoseClass) {
          throw new Error('MediaPipe Pose 생성자를 초기화할 수 없습니다.');
        }

        const pose = new PoseClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: CONFIG.visibilityThreshold,
          minTrackingConfidence: CONFIG.visibilityThreshold,
        });

        pose.onResults((results: any) => {
          if (!isCancelled) {
            handlePoseResults(results);
          }
        });

        poseRef.current = pose;
        setFeedbackMessage('Pose 모델 준비 완료. 측정을 시작합니다.');
      } catch (err: any) {
        console.error('MediaPipe initialization error:', err);
        setCameraError('MediaPipe 모델 로딩 실패: 네트워크 연결을 확인해주세요.');
        setTrackingQuality('LOST');
      }
    }

    initializePoseLandmarker();

    return () => {
      isCancelled = true;
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {}
        poseRef.current = null;
      }
    };
  }, []);

  /**
   * Handle Raw MediaPipe Results Frame
   */
  const handlePoseResults = useCallback(
    (results: any) => {
      // FPS calculation
      frameCountRef.current += 1;
      const now = Date.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      const rawLms = results.poseLandmarks;
      if (!rawLms || rawLms.length === 0) {
        setTrackingQuality('LOST');
        setMeasurementQuality('POOR');
        setLandmarks(null);
        setAngles(null);
        setFeedbackMessage('신체가 충분히 보이도록 카메라 위치를 조정해주세요.');
        return;
      }

      // Map 33 landmarks to full body structure
      const fullLms: FullBodyLandmarks = {
        nose: rawLms[0],
        leftEye: rawLms[2],
        rightEye: rawLms[5],
        leftEar: rawLms[7],
        rightEar: rawLms[8],
        leftShoulder: rawLms[11],
        rightShoulder: rawLms[12],
        leftElbow: rawLms[13],
        rightElbow: rawLms[14],
        leftWrist: rawLms[15],
        rightWrist: rawLms[16],
        leftHip: rawLms[23],
        rightHip: rawLms[24],
        leftKnee: rawLms[25],
        rightKnee: rawLms[26],
        leftAnkle: rawLms[27],
        rightAnkle: rawLms[28],
      };

      setLandmarks(fullLms);

      // Check key landmarks visibility depending on mode
      const relevantLms =
        majorMode === 'knee'
          ? [
              fullLms.leftHip,
              fullLms.rightHip,
              fullLms.leftKnee,
              fullLms.rightKnee,
              fullLms.leftAnkle,
              fullLms.rightAnkle,
            ]
          : [
              fullLms.leftShoulder,
              fullLms.rightShoulder,
              fullLms.leftElbow,
              fullLms.rightElbow,
              fullLms.leftHip,
              fullLms.rightHip,
            ];

      const isReliable = isLandmarkReliable(relevantLms, CONFIG.visibilityThreshold);
      const trackingQual: TrackingQuality = isReliable ? 'GOOD' : 'LOW CONFIDENCE';
      setTrackingQuality(trackingQual);

      // 1. Calculate Knee Angles
      const leftKneeCalc = calculateKneeFlexionAngle(fullLms.leftHip, fullLms.leftKnee, fullLms.leftAnkle);
      const rightKneeCalc = calculateKneeFlexionAngle(fullLms.rightHip, fullLms.rightKnee, fullLms.rightAnkle);

      // 2. Calculate Shoulder Angles
      const leftShoulderFlex = calculateShoulderFlexion(fullLms.leftShoulder, fullLms.leftElbow, fullLms.leftHip);
      const rightShoulderFlex = calculateShoulderFlexion(fullLms.rightShoulder, fullLms.rightElbow, fullLms.rightHip);
      const leftShoulderAbd = calculateShoulderAbduction(fullLms.leftShoulder, fullLms.leftElbow, fullLms.leftHip);
      const rightShoulderAbd = calculateShoulderAbduction(fullLms.rightShoulder, fullLms.rightElbow, fullLms.rightHip);

      // Current raw angles for selected mode
      const rawLeft =
        majorMode === 'knee'
          ? leftKneeCalc.flexion
          : shoulderExercise === 'flexion'
          ? leftShoulderFlex
          : leftShoulderAbd;

      const rawRight =
        majorMode === 'knee'
          ? rightKneeCalc.flexion
          : shoulderExercise === 'flexion'
          ? rightShoulderFlex
          : rightShoulderAbd;

      // 3. Smooth Angles
      const smoothedLeft = smoothAngle(rawLeft, smoothedAnglesRef.current.left);
      const smoothedRight = smoothAngle(rawRight, smoothedAnglesRef.current.right);
      smoothedAnglesRef.current = { left: smoothedLeft, right: smoothedRight };

      const asymmetry = Math.abs(smoothedLeft - smoothedRight);

      const calculatedAngles: JointAngles = {
        leftKneeFlexion: leftKneeCalc.flexion,
        rightKneeFlexion: rightKneeCalc.flexion,
        leftKneeInternal: leftKneeCalc.internal,
        rightKneeInternal: rightKneeCalc.internal,
        leftShoulderFlexion: leftShoulderFlex,
        rightShoulderFlexion: rightShoulderFlex,
        leftShoulderAbduction: leftShoulderAbd,
        rightShoulderAbduction: rightShoulderAbd,
        currentLeft: smoothedLeft,
        currentRight: smoothedRight,
        asymmetry,
      };
      setAngles(calculatedAngles);

      // 4. Torso Compensation Detection (Shoulder mode)
      const compensation = detectTorsoCompensation(
        fullLms.leftShoulder,
        fullLms.rightShoulder,
        fullLms.leftHip,
        fullLms.rightHip,
        CONFIG.shoulder.torsoCompensationThreshold
      );
      setTorsoCompensation(compensation);

      // 5. Update Session Max ROM
      setSessionMaxROM((prev) => {
        const updated = updateSessionMaxROM(smoothedLeft, smoothedRight, prev);
        return updated;
      });

      // 6. Movement State & Repetition Counters
      if (majorMode === 'knee') {
        setKneeState((prevState) => {
          const { nextState, repCompleted } = updateKneeMovementState(prevState, smoothedLeft, smoothedRight);
          if (repCompleted) {
            setKneeRepCount((c) => {
              const newCount = c + 1;
              if (soundEnabled) playTone(587.33, 'sine', 0.2); // D5 success tone
              return newCount;
            });
          }
          return nextState;
        });
      } else {
        // Shoulder Mode
        if (shoulderConfig.enableRepCounter) {
          const relevantAngle =
            operatedSide === 'left'
              ? smoothedLeft
              : operatedSide === 'right'
              ? smoothedRight
              : Math.max(smoothedLeft, smoothedRight);

          setShoulderState((prevState) => {
            const { nextState, repCompleted } = updateShoulderMovementState(
              prevState,
              relevantAngle,
              shoulderConfig.targetROM
            );
            if (repCompleted) {
              setShoulderRepCount((c) => {
                const newCount = c + 1;
                if (soundEnabled) playTone(659.25, 'sine', 0.2); // E5 success tone
                return newCount;
              });
            }
            return nextState;
          });
        }
      }

      // 7. Measurement Quality
      const measQuality = evaluateMeasurementQuality(trackingQual, compensation.isCompensated, isReliable);
      setMeasurementQuality(measQuality);

      // 8. Generate Feedback & Alerts
      const fb = generateFeedback({
        majorMode,
        trackingQuality: trackingQual,
        angles: calculatedAngles,
        kneeState,
        shoulderState,
        shoulderConfig,
        torsoCompensation: compensation,
        operatedSide,
      });
      setFeedbackMessage(fb.message);
      setWarningMessage(fb.alertLevel !== 'normal' ? fb.message : null);

      if (fb.alertLevel === 'alert' && soundEnabled && Math.random() < 0.05) {
        playTone(330, 'sawtooth', 0.15); // Warning buzz
      }

      // 9. Update Session Stats & Time-series History (Throttled ~2 times per sec)
      if (now - lastHistoryLogTimeRef.current >= 400) {
        lastHistoryLogTimeRef.current = now;
        const timeSec = (now - sessionStats.startTime) / 1000;

        setSessionStats((prev) => {
          const newPt: DataPoint = {
            time: timeSec,
            leftAngle: smoothedLeft,
            rightAngle: smoothedRight,
            targetROM: shoulderConfig.targetROM,
            maxAllowedROM: shoulderConfig.maximumAllowedROM,
            isCompensated: compensation.isCompensated,
          };

          const newLogItem: MeasurementLogItem = {
            id: String(now),
            timestamp: new Date(now).toLocaleTimeString(),
            joint: majorMode === 'knee' ? 'KNEE' : 'SHOULDER',
            side: operatedSide === 'left' ? 'LEFT' : operatedSide === 'right' ? 'RIGHT' : 'BILATERAL',
            movement: majorMode === 'knee' ? 'SQUAT/FLEXION' : shoulderExercise.toUpperCase(),
            angle: Number(smoothedLeft.toFixed(1)),
            trackingConfidence: trackingQual,
            compensationDetected: compensation.isCompensated,
          };

          return {
            ...prev,
            durationSec: Math.round(timeSec),
            totalFramesAnalyzed: prev.totalFramesAnalyzed + 1,
            leftMaxFlexion: Math.max(prev.leftMaxFlexion, calculatedAngles.leftKneeFlexion),
            rightMaxFlexion: Math.max(prev.rightMaxFlexion, calculatedAngles.rightKneeFlexion),
            leftMaxShoulderROM: Math.max(prev.leftMaxShoulderROM, smoothedLeft),
            rightMaxShoulderROM: Math.max(prev.rightMaxShoulderROM, smoothedRight),
            kneeRepCount,
            shoulderRepCount,
            avgAsymmetry: Math.round((prev.avgAsymmetry * 0.9 + asymmetry * 0.1) * 10) / 10,
            maxAsymmetry: Math.max(prev.maxAsymmetry, asymmetry),
            compensationCount: prev.compensationCount + (compensation.isCompensated ? 1 : 0),
            history: [...prev.history.slice(-60), newPt],
            logs: [newLogItem, ...prev.logs.slice(0, 49)],
          };
        });
      }

      // 10. Developer Mode Debug Info
      const activeState = majorMode === 'knee' ? kneeState : shoulderState;
      const activeRep = majorMode === 'knee' ? kneeRepCount : shoulderRepCount;

      const dInfo: DebugInfo = {
        leftHip: fullLms.leftHip,
        leftKnee: fullLms.leftKnee,
        leftAnkle: fullLms.leftAnkle,
        rightHip: fullLms.rightHip,
        rightKnee: fullLms.rightKnee,
        rightAnkle: fullLms.rightAnkle,
        leftShoulder: fullLms.leftShoulder,
        leftElbow: fullLms.leftElbow,
        leftWrist: fullLms.leftWrist,
        rightShoulder: fullLms.rightShoulder,
        rightElbow: fullLms.rightElbow,
        rightWrist: fullLms.rightWrist,
        torsoTiltAngle: compensation.tiltAngle,
        torsoCompensated: compensation.isCompensated,
        rawLeft,
        rawRight,
        smoothedLeft,
        smoothedRight,
        currentState: activeState,
        repCount: activeRep,
        trackingQuality: trackingQual,
        measurementQuality: measQuality,
      };
      setDebugInfo(dInfo);

      // Throttled Console Log (1 sec)
      if (now - lastLogTimeRef.current >= CONFIG.debugIntervalMs) {
        lastLogTimeRef.current = now;
        console.log(`[RehabMonitor] Mode: ${majorMode} | L/R: ${smoothedLeft.toFixed(1)}° / ${smoothedRight.toFixed(1)}° | State: ${activeState} | Tracking: ${trackingQual} | Compensation: ${compensation.isCompensated}`);
      }
    },
    [
      majorMode,
      shoulderExercise,
      shoulderConfig,
      operatedSide,
      kneeState,
      shoulderState,
      kneeRepCount,
      shoulderRepCount,
      soundEnabled,
      sessionStats.startTime,
    ]
  );

  /**
   * Continuous Video Processing Loop via requestAnimationFrame
   * Prevents duplicate frame processing
   */
  const processVideoFrame = useCallback(async () => {
    if (!isProcessing) return;

    const video = videoRef.current;
    if (video && video.readyState >= 2 && poseRef.current) {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          await poseRef.current.send({ image: video });
        } catch (err) {
          // Frame drop or busy, catch gracefully
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [isProcessing]);

  /**
   * Source Mode & Camera Lifecycle Handler
   */
  useEffect(() => {
    if (sourceMode === 'realtime_camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [sourceMode, startCamera, stopCamera]);

  /**
   * Start / Stop Animation Loop
   */
  useEffect(() => {
    if (isProcessing) {
      animFrameRef.current = requestAnimationFrame(processVideoFrame);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isProcessing, processVideoFrame]);

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
    cameraError,
    sessionStats,
    fps,
    debugInfo,
    startCamera,
    stopCamera,
    resetSession,
    resetSessionMaxROM,
  };
}

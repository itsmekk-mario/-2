import {
  Landmark,
  FullBodyLandmarks,
  JointAngles,
  KneeMovementState,
  ShoulderMovementState,
  TorsoCompensationInfo,
  ShoulderExercise,
  OperatedSide,
  ShoulderUserConfig,
  SessionMaxROM,
  TrackingQuality,
  MeasurementQuality,
} from '../types';

/**
 * Global Configuration for Angle Calculations, State Machines & Thresholds
 * Requirement 26: Unified CONFIG object, thresholds not hardcoded across files
 */
export const CONFIG = {
  visibilityThreshold: 0.5,
  smoothingFactor: 0.3, // Exponential Moving Average smoothing factor (0.1 ~ 0.5)

  knee: {
    standingFlexion: 20, // In degrees: <= 20° considered standing/extended
    bentFlexion: 60,     // In degrees: >= 60° considered fully bent/squat bottom
    asymmetryThreshold: 15,
  },

  shoulder: {
    torsoCompensationThreshold: 12, // degrees of trunk lateral tilt to flag compensation
    restAngle: 25,                  // <= 25° considered resting position
    raisingThreshold: 35,           // starting to raise arm
    defaultTargetROM: null as number | null,
    defaultMaxAllowedROM: null as number | null,
  },

  debugIntervalMs: 1000, // Console logging throttle (1 per sec)
};

/**
 * 2D/3D Vector Angle Calculation
 * Calculates internal angle at vertex B formed by vectors BA and BC
 * Includes NaN protection and 0-length guards
 */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  if (!a || !b || !c) return 0;

  const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);

  if (mag1 < 1e-6 || mag2 < 1e-6) {
    return 0;
  }

  let cosAngle = dot / (mag1 * mag2);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));

  const rad = Math.acos(cosAngle);
  return (rad * 180) / Math.PI;
}

/**
 * Knee Flexion Angle
 * kneeFlexion = 180° - internalAngle(hip, knee, ankle)
 * Fully extended leg ≈ 0°, bending knee increases the angle
 */
export function calculateKneeFlexionAngle(
  hip: Landmark,
  knee: Landmark,
  ankle: Landmark
): { flexion: number; internal: number } {
  const internal = calculateAngle(hip, knee, ankle);
  const flexion = Math.max(0, 180 - internal);
  return { flexion, internal };
}

/**
 * Shoulder Flexion Angle
 * Measured in sagittal plane (arm forward & upward)
 * Uses SHOULDER -> HIP (trunk vector) and SHOULDER -> ELBOW (upper arm vector)
 * Naturally down at side ≈ 0°, raising arm forward & up increases angle up to ~180°
 */
export function calculateShoulderFlexion(
  shoulder: Landmark,
  elbow: Landmark,
  hip: Landmark
): number {
  if (!shoulder || !elbow || !hip) return 0;
  // Angle between trunk vector (Shoulder -> Hip) and arm vector (Shoulder -> Elbow)
  const angle = calculateAngle(hip, shoulder, elbow);
  return Math.max(0, Math.min(180, angle));
}

/**
 * Shoulder Abduction Angle
 * Measured in frontal/coronal plane (arm raised laterally to side)
 * Uses SHOULDER -> HIP and SHOULDER -> ELBOW
 * Arm at side ≈ 0°, arm horizontal ≈ 90°, arm overhead ≈ 180°
 */
export function calculateShoulderAbduction(
  shoulder: Landmark,
  elbow: Landmark,
  hip: Landmark
): number {
  if (!shoulder || !elbow || !hip) return 0;
  // 2D projection on coronal plane gives stable abduction angle
  const trunkV = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };
  const armV = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };

  const dot = trunkV.x * armV.x + trunkV.y * armV.y;
  const magT = Math.hypot(trunkV.x, trunkV.y);
  const magA = Math.hypot(armV.x, armV.y);

  if (magT < 1e-6 || magA < 1e-6) return 0;

  let cosAngle = dot / (magT * magA);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));
  const angle = (Math.acos(cosAngle) * 180) / Math.PI;

  return Math.max(0, Math.min(180, angle));
}

/**
 * Exponential Moving Average (EMA) Angle Smoothing
 * Prevents jitter while retaining responsive motion
 */
export function smoothAngle(
  current: number,
  previous: number | null,
  factor = CONFIG.smoothingFactor
): number {
  if (previous === null || isNaN(previous)) {
    return current;
  }
  return factor * current + (1 - factor) * previous;
}

/**
 * Checks if key landmarks meet the visibility threshold
 */
export function isLandmarkReliable(
  landmarks: (Landmark | undefined)[],
  threshold = CONFIG.visibilityThreshold
): boolean {
  if (!landmarks || landmarks.length === 0) return false;
  return landmarks.every(
    (lm) =>
      lm !== undefined &&
      lm !== null &&
      (lm.visibility === undefined || lm.visibility >= threshold)
  );
}

/**
 * Detects lateral torso compensation (trunk tilt) during arm raising
 * Compares the shoulder-to-shoulder angle and hip-to-hip angle against horizontal
 */
export function detectTorsoCompensation(
  leftShoulder: Landmark,
  rightShoulder: Landmark,
  leftHip: Landmark,
  rightHip: Landmark,
  threshold = CONFIG.shoulder.torsoCompensationThreshold
): TorsoCompensationInfo {
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return { isCompensated: false, tiltAngle: 0, message: null };
  }

  // Calculate shoulder line tilt angle against horizontal
  const dx = rightShoulder.x - leftShoulder.x;
  const dy = rightShoulder.y - leftShoulder.y;
  const shoulderTiltRad = Math.atan2(Math.abs(dy), Math.abs(dx));
  const shoulderTiltDeg = (shoulderTiltRad * 180) / Math.PI;

  // Calculate hip line tilt angle
  const hdx = rightHip.x - leftHip.x;
  const hdy = rightHip.y - leftHip.y;
  const hipTiltRad = Math.atan2(Math.abs(hdy), Math.abs(hdx));
  const hipTiltDeg = (hipTiltRad * 180) / Math.PI;

  const maxTilt = Math.max(shoulderTiltDeg, hipTiltDeg);

  if (maxTilt > threshold) {
    return {
      isCompensated: true,
      tiltAngle: maxTilt,
      message: '몸통 기울임이 감지되었습니다. 가능하면 몸통을 고정하고 다시 측정하세요.',
    };
  }

  return {
    isCompensated: false,
    tiltAngle: maxTilt,
    message: null,
  };
}

/**
 * Evaluates Measurement Quality (GOOD / FAIR / POOR)
 */
export function evaluateMeasurementQuality(
  trackingQuality: TrackingQuality,
  torsoCompensated: boolean,
  landmarksVisible: boolean
): MeasurementQuality {
  if (trackingQuality === 'LOST' || !landmarksVisible) {
    return 'POOR';
  }
  if (trackingQuality === 'LOW CONFIDENCE' || torsoCompensated) {
    return 'FAIR';
  }
  return 'GOOD';
}

/**
 * Knee Movement State Machine (STANDING -> BENDING -> BOTTOM -> RISING -> STANDING)
 */
export function updateKneeMovementState(
  currentState: KneeMovementState,
  leftFlexion: number,
  rightFlexion: number,
  config = CONFIG.knee
): { nextState: KneeMovementState; repCompleted: boolean } {
  const avgFlexion = (leftFlexion + rightFlexion) / 2;
  const { standingFlexion, bentFlexion } = config;

  let nextState = currentState;
  let repCompleted = false;

  switch (currentState) {
    case 'STANDING':
      if (avgFlexion > standingFlexion + 5) {
        nextState = 'BENDING';
      }
      break;
    case 'BENDING':
      if (avgFlexion >= bentFlexion) {
        nextState = 'BOTTOM';
      } else if (avgFlexion <= standingFlexion) {
        nextState = 'STANDING';
      }
      break;
    case 'BOTTOM':
      if (avgFlexion < bentFlexion - 8) {
        nextState = 'RISING';
      }
      break;
    case 'RISING':
      if (avgFlexion <= standingFlexion + 3) {
        nextState = 'STANDING';
        repCompleted = true;
      }
      break;
  }

  return { nextState, repCompleted };
}

/**
 * Shoulder Movement State Machine (REST -> RAISING -> TARGET -> LOWERING -> REST)
 */
export function updateShoulderMovementState(
  currentState: ShoulderMovementState,
  currentAngle: number,
  targetROM: number | null,
  config = CONFIG.shoulder
): { nextState: ShoulderMovementState; repCompleted: boolean } {
  const restThreshold = config.restAngle;
  const targetThreshold = targetROM ? Math.max(targetROM - 10, 45) : 80;

  let nextState = currentState;
  let repCompleted = false;

  switch (currentState) {
    case 'REST':
      if (currentAngle > restThreshold + 5) {
        nextState = 'RAISING';
      }
      break;
    case 'RAISING':
      if (currentAngle >= targetThreshold) {
        nextState = 'TARGET';
      } else if (currentAngle <= restThreshold) {
        nextState = 'REST';
      }
      break;
    case 'TARGET':
      if (currentAngle < targetThreshold - 10) {
        nextState = 'LOWERING';
      }
      break;
    case 'LOWERING':
      if (currentAngle <= restThreshold + 5) {
        nextState = 'REST';
        repCompleted = true;
      }
      break;
  }

  return { nextState, repCompleted };
}

/**
 * Update Repetition Count
 */
export function updateRepCount(currentCount: number, repCompleted: boolean): number {
  return repCompleted ? currentCount + 1 : currentCount;
}

/**
 * Update Session Maximum ROM
 */
export function updateSessionMaxROM(
  currentLeft: number,
  currentRight: number,
  prevMax: SessionMaxROM
): SessionMaxROM {
  return {
    leftMax: Math.max(prevMax.leftMax, currentLeft),
    rightMax: Math.max(prevMax.rightMax, currentRight),
  };
}

/**
 * Generate Feedback Messages
 * Strictly Non-Diagnostic & Descriptive (Requirement 8 & 15)
 */
export function generateFeedback(params: {
  majorMode: 'knee' | 'shoulder';
  trackingQuality: TrackingQuality;
  angles: JointAngles | null;
  kneeState?: KneeMovementState;
  shoulderState?: ShoulderMovementState;
  shoulderConfig?: ShoulderUserConfig;
  torsoCompensation?: TorsoCompensationInfo;
  operatedSide?: OperatedSide;
}): { message: string; alertLevel: 'normal' | 'warning' | 'alert' } {
  const {
    majorMode,
    trackingQuality,
    angles,
    kneeState,
    shoulderState,
    shoulderConfig,
    torsoCompensation,
    operatedSide = 'none',
  } = params;

  if (trackingQuality === 'LOST') {
    return {
      message: '신체가 충분히 보이도록 카메라 위치와 거리를 조정해주세요.',
      alertLevel: 'alert',
    };
  }

  if (trackingQuality === 'LOW CONFIDENCE') {
    return {
      message: '관절 인식이 불안정합니다. 조명을 밝히고 신체 전체가 나오도록 해주세요.',
      alertLevel: 'warning',
    };
  }

  if (!angles) {
    return { message: '관절 위치를 추정하는 중입니다...', alertLevel: 'normal' };
  }

  // 1. Torso Compensation Check (for Shoulder mode)
  if (majorMode === 'shoulder' && torsoCompensation?.isCompensated) {
    return {
      message: torsoCompensation.message || '몸통 기울임이 감지되었습니다. 몸통을 고정하고 다시 측정하세요.',
      alertLevel: 'warning',
    };
  }

  // 2. Knee Mode Feedback
  if (majorMode === 'knee') {
    if (angles.asymmetry >= CONFIG.knee.asymmetryThreshold) {
      return {
        message: `좌우 무릎 움직임 차이가 큽니다 (${angles.asymmetry.toFixed(1)}°). 균형에 유의하세요.`,
        alertLevel: 'warning',
      };
    }

    if (kneeState === 'BENDING' && (angles.leftKneeFlexion + angles.rightKneeFlexion) / 2 < 45) {
      return {
        message: '무릎을 조금 더 굽혀주세요.',
        alertLevel: 'normal',
      };
    }

    if (kneeState === 'BOTTOM') {
      return {
        message: '목표 굴곡에 도달했습니다. 천천히 다시 일어서세요.',
        alertLevel: 'normal',
      };
    }

    if (kneeState === 'RISING') {
      return {
        message: '무릎을 끝까지 펴주세요.',
        alertLevel: 'normal',
      };
    }

    return {
      message: '정상적으로 추적되고 있습니다. 안정적인 속도를 유지하세요.',
      alertLevel: 'normal',
    };
  }

  // 3. Shoulder Mode Feedback
  if (majorMode === 'shoulder') {
    // Focus on operated side if specified, otherwise max of both
    const relevantAngle =
      operatedSide === 'left'
        ? angles.currentLeft
        : operatedSide === 'right'
        ? angles.currentRight
        : Math.max(angles.currentLeft, angles.currentRight);

    const { targetROM, maximumAllowedROM } = shoulderConfig || {};

    // Check Maximum Allowed ROM violation (Requirement 15)
    if (maximumAllowedROM !== null && maximumAllowedROM !== undefined) {
      if (relevantAngle > maximumAllowedROM) {
        return {
          message: '설정된 가동범위를 초과했습니다. 동작을 중지하고 설정값을 확인하세요.',
          alertLevel: 'alert',
        };
      }
      if (relevantAngle >= maximumAllowedROM - 5) {
        return {
          message: '설정한 가동범위 제한에 근접했습니다.',
          alertLevel: 'warning',
        };
      }
    }

    // Check Target ROM achievement (Requirement 15)
    if (targetROM !== null && targetROM !== undefined) {
      if (relevantAngle >= targetROM - 3 && relevantAngle <= targetROM + 5) {
        return {
          message: '설정된 목표 범위에 도달했습니다.',
          alertLevel: 'normal',
        };
      }
    }

    if (shoulderState === 'RAISING') {
      return {
        message: '팔을 부드럽게 올리고 있습니다. 통증이 없는 범위 내에서 진행하세요.',
        alertLevel: 'normal',
      };
    }

    return {
      message: '정상적으로 추적되고 있습니다.',
      alertLevel: 'normal',
    };
  }

  return {
    message: '정상적으로 추적되고 있습니다.',
    alertLevel: 'normal',
  };
}

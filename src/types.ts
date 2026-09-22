/**
 * MediaPipe Pose & Joint Digital Twin Types
 * Rehabilitation Motion Monitor (Knee & Shoulder Modes)
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FullBodyLandmarks {
  // Head / Neck reference
  nose?: Landmark;
  leftEye?: Landmark;
  rightEye?: Landmark;
  leftEar?: Landmark;
  rightEar?: Landmark;

  // Upper Body
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  leftElbow: Landmark;
  rightElbow: Landmark;
  leftWrist: Landmark;
  rightWrist: Landmark;

  // Trunk / Pelvis
  leftHip: Landmark;
  rightHip: Landmark;

  // Lower Body
  leftKnee: Landmark;
  rightKnee: Landmark;
  leftAnkle: Landmark;
  rightAnkle: Landmark;

  // Optional feet
  leftHeel?: Landmark;
  rightHeel?: Landmark;
  leftFootIndex?: Landmark;
  rightFootIndex?: Landmark;
}

export type MajorMode = 'knee' | 'shoulder';

export type ShoulderExercise = 'abduction' | 'flexion';

export type OperatedSide = 'left' | 'right' | 'none';

export type KneeMovementState = 'STANDING' | 'BENDING' | 'BOTTOM' | 'RISING';

// Backward compatibility aliases
export type LowerBodyLandmarks = FullBodyLandmarks;
export type GaitPhase = 'INITIAL_CONTACT' | 'STANCE_PHASE' | 'SWING_PHASE' | 'UNKNOWN';
export type SquatPhase = KneeMovementState;
export type MovementState = KneeMovementState;

export type ShoulderMovementState = 'REST' | 'RAISING' | 'TARGET' | 'LOWERING';

export type TrackingQuality = 'GOOD' | 'LOW CONFIDENCE' | 'LOST';

export type MeasurementQuality = 'GOOD' | 'FAIR' | 'POOR';

export interface JointAngles {
  // Knee flexion (0° = full extension, 90° = 90 deg bend, 120°+ = deep flex)
  leftKneeFlexion: number;
  rightKneeFlexion: number;
  leftKneeInternal: number;
  rightKneeInternal: number;

  // Shoulder angles (flexion or abduction)
  leftShoulderFlexion: number;
  rightShoulderFlexion: number;
  leftShoulderAbduction: number;
  rightShoulderAbduction: number;

  // Active mode current angles
  currentLeft: number;
  currentRight: number;

  // Asymmetry difference (absolute value)
  asymmetry: number;
}

export interface TorsoCompensationInfo {
  isCompensated: boolean;
  tiltAngle: number; // in degrees
  message: string | null;
}

export interface ShoulderUserConfig {
  targetROM: number | null; // e.g. 90
  maximumAllowedROM: number | null; // e.g. 100
  enableRepCounter: boolean;
}

export interface SessionMaxROM {
  leftMax: number;
  rightMax: number;
}

export interface DebugInfo {
  // Knee
  leftHip: Landmark | null;
  leftKnee: Landmark | null;
  leftAnkle: Landmark | null;
  rightHip: Landmark | null;
  rightKnee: Landmark | null;
  rightAnkle: Landmark | null;

  // Shoulder
  leftShoulder: Landmark | null;
  leftElbow: Landmark | null;
  leftWrist: Landmark | null;
  rightShoulder: Landmark | null;
  rightElbow: Landmark | null;
  rightWrist: Landmark | null;

  // Torso / Pelvis
  torsoTiltAngle: number;
  torsoCompensated: boolean;

  // Angles & States
  rawLeft: number;
  rawRight: number;
  smoothedLeft: number;
  smoothedRight: number;
  currentState: string;
  repCount: number;
  trackingQuality: TrackingQuality;
  measurementQuality: MeasurementQuality;
}

export interface DataPoint {
  time: number; // in seconds
  leftAngle: number;
  rightAngle: number;
  targetROM?: number | null;
  maxAllowedROM?: number | null;
  isCompensated?: boolean;
}

export interface MeasurementLogItem {
  id: string;
  timestamp: string;
  joint: 'KNEE' | 'SHOULDER';
  side: 'LEFT' | 'RIGHT' | 'BILATERAL';
  movement: string;
  angle: number;
  trackingConfidence: TrackingQuality;
  compensationDetected: boolean;
}

export interface SessionStats {
  startTime: number;
  durationSec: number;
  totalFramesAnalyzed: number;

  // Knee
  leftMaxFlexion: number;
  rightMaxFlexion: number;
  kneeRepCount: number;

  // Shoulder
  leftMaxShoulderROM: number;
  rightMaxShoulderROM: number;
  shoulderRepCount: number;

  // General
  avgAsymmetry: number;
  maxAsymmetry: number;
  compensationCount: number;

  // History for charts
  history: DataPoint[];
  logs: MeasurementLogItem[];
}

export type AppSourceMode = 'realtime_camera' | 'video_file' | 'pose_simulator';
export type AnalysisMode = MajorMode; // Alias for backward compatibility

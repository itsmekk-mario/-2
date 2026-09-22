import { Landmark } from '../types';

/**
 * Generates synthetic MediaPipe 33-landmark pose arrays for simulation/demo mode.
 */
export function generateSimulatedLandmarks(
  timestampSec: number,
  mode: 'gait' | 'squat' | 'free_rom'
): Landmark[] {
  // Base 33 landmark skeleton initialized to standing posture
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility: 0.95,
  }));

  // Upper body dummy coordinates
  landmarks[0] = { x: 0.5, y: 0.15, z: 0, visibility: 0.99 }; // Nose
  landmarks[11] = { x: 0.42, y: 0.28, z: -0.05, visibility: 0.98 }; // L Shoulder
  landmarks[12] = { x: 0.58, y: 0.28, z: -0.05, visibility: 0.98 }; // R Shoulder

  if (mode === 'squat') {
    // 4-second squat cycle
    const cycleTime = timestampSec % 4.0;
    let squatProgress = 0; // 0 = standing, 1 = deep squat

    if (cycleTime < 1.8) {
      // Descending
      squatProgress = cycleTime / 1.8;
    } else if (cycleTime < 2.2) {
      // Hold at bottom
      squatProgress = 1.0;
    } else if (cycleTime < 3.8) {
      // Ascending
      squatProgress = 1.0 - (cycleTime - 2.2) / 1.6;
    } else {
      // Standing pause
      squatProgress = 0.0;
    }

    // Smooth sine easing for natural motion
    const easedProgress = (1 - Math.cos(squatProgress * Math.PI)) / 2;

    // Hip positions drop as squat deepens
    const hipY = 0.52 + easedProgress * 0.18;
    const hipZ = -0.05 - easedProgress * 0.1;

    landmarks[23] = { x: 0.45, y: hipY, z: hipZ, visibility: 0.99 }; // L Hip
    landmarks[24] = { x: 0.55, y: hipY, z: hipZ, visibility: 0.99 }; // R Hip

    // Knee positions bend outward/forward (X pushes slightly wider, Y moves down, Z pushes forward)
    const kneeY = 0.68 + easedProgress * 0.05;
    const kneeZ = -0.08 - easedProgress * 0.22; // Bends forward
    const leftKneeX = 0.43 - easedProgress * 0.03;
    const rightKneeX = 0.57 + easedProgress * 0.03;

    landmarks[25] = { x: leftKneeX, y: kneeY, z: kneeZ, visibility: 0.99 }; // L Knee
    landmarks[26] = { x: rightKneeX, y: kneeY, z: kneeZ, visibility: 0.99 }; // R Knee

    // Ankle positions stay stationary on ground
    landmarks[27] = { x: 0.44, y: 0.88, z: 0.0, visibility: 0.99 }; // L Ankle
    landmarks[28] = { x: 0.56, y: 0.88, z: 0.0, visibility: 0.99 }; // R Ankle

    // Heels and feet
    landmarks[29] = { x: 0.44, y: 0.91, z: 0.02, visibility: 0.95 };
    landmarks[30] = { x: 0.56, y: 0.91, z: 0.02, visibility: 0.95 };
    landmarks[31] = { x: 0.44, y: 0.93, z: -0.08, visibility: 0.95 };
    landmarks[32] = { x: 0.56, y: 0.93, z: -0.08, visibility: 0.95 };

  } else if (mode === 'gait') {
    // 2.4-second gait cycle (walking animation)
    const gaitCycleSec = 2.4;
    const cycleTime = timestampSec % gaitCycleSec;
    const normCycle = cycleTime / gaitCycleSec; // 0.0 -> 1.0

    // Sine waves for left and right leg stride (180° out of phase)
    const leftPhase = normCycle * Math.PI * 2;
    const rightPhase = leftPhase + Math.PI;

    // Introduce an intentional "Stiff Knee" sequence every 3rd cycle to demonstrate stiff knee detection
    const cycleCount = Math.floor(timestampSec / gaitCycleSec);
    const isStiffDemoCycle = cycleCount % 4 === 2; // Every 4th cycle

    // Left knee swing flexion (Normal ~60° = 0.35 knee height lift)
    let leftKneeLift = Math.max(0, Math.sin(leftPhase));
    let rightKneeLift = Math.max(0, Math.sin(rightPhase));

    if (isStiffDemoCycle && leftKneeLift > 0.2) {
      // Dampen left knee lift to simulate stiff knee gait (< 40° flexion)
      leftKneeLift *= 0.35;
    }

    // Base Hip
    landmarks[23] = { x: 0.46, y: 0.50, z: -0.02, visibility: 0.99 }; // L Hip
    landmarks[24] = { x: 0.54, y: 0.50, z: -0.02, visibility: 0.99 }; // R Hip

    // Knee positions moving forward & bending up
    const leftKneeY = 0.68 - leftKneeLift * 0.12;
    const leftKneeZ = -0.05 - Math.sin(leftPhase) * 0.15;

    const rightKneeY = 0.68 - rightKneeLift * 0.12;
    const rightKneeZ = -0.05 - Math.sin(rightPhase) * 0.15;

    landmarks[25] = { x: 0.45, y: leftKneeY, z: leftKneeZ, visibility: 0.99 }; // L Knee
    landmarks[26] = { x: 0.55, y: rightKneeY, z: rightKneeZ, visibility: 0.99 }; // R Knee

    // Ankle stride motion
    const leftAnkleZ = Math.sin(leftPhase) * 0.18;
    const rightAnkleZ = Math.sin(rightPhase) * 0.18;

    landmarks[27] = { x: 0.45, y: 0.88, z: leftAnkleZ, visibility: 0.99 }; // L Ankle
    landmarks[28] = { x: 0.55, y: 0.88, z: rightAnkleZ, visibility: 0.99 }; // R Ankle

    landmarks[29] = { x: 0.45, y: 0.91, z: leftAnkleZ + 0.02, visibility: 0.95 };
    landmarks[30] = { x: 0.55, y: 0.91, z: rightAnkleZ + 0.02, visibility: 0.95 };
    landmarks[31] = { x: 0.45, y: 0.92, z: leftAnkleZ - 0.08, visibility: 0.95 };
    landmarks[32] = { x: 0.55, y: 0.92, z: rightAnkleZ - 0.08, visibility: 0.95 };

  } else {
    // Free ROM exercise mode (alternating leg lifts)
    const t = timestampSec * 1.5;
    const leftLift = Math.max(0, Math.sin(t));
    const rightLift = Math.max(0, Math.sin(t + Math.PI));

    landmarks[23] = { x: 0.45, y: 0.50, z: 0, visibility: 0.99 };
    landmarks[24] = { x: 0.55, y: 0.50, z: 0, visibility: 0.99 };

    landmarks[25] = { x: 0.44, y: 0.68 - leftLift * 0.18, z: -0.1 - leftLift * 0.2, visibility: 0.99 };
    landmarks[26] = { x: 0.56, y: 0.68 - rightLift * 0.18, z: -0.1 - rightLift * 0.2, visibility: 0.99 };

    landmarks[27] = { x: 0.44, y: 0.88, z: 0, visibility: 0.99 };
    landmarks[28] = { x: 0.56, y: 0.88, z: 0, visibility: 0.99 };
  }

  return landmarks;
}

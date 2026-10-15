import { Landmark, MajorMode, ShoulderExercise } from "../types";

export interface SimulationConfig {
  speed: number;
  maxAngle: number;
  asymmetry: number;
  trackingLoss: boolean;
}
export const DEFAULT_SIMULATION: SimulationConfig = {
  speed: 1,
  maxAngle: 90,
  asymmetry: 0,
  trackingLoss: false,
};

// Rigid segments in a common metric coordinate system; the requested angle is exact.
export function simulatePose(
  time: number,
  mode: MajorMode,
  exercise: ShoulderExercise,
  config: SimulationConfig,
) {
  const progress = (1 - Math.cos(((time % 6) / 6) * Math.PI * 2)) / 2;
  const world: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0,
    y: -0.7,
    z: 0,
    visibility: 0.99,
  }));
  const point = (x: number, y: number, z = 0): Landmark => ({
    x,
    y,
    z,
    visibility: config.trackingLoss ? 0.1 : 0.99,
  });
  world[0] = point(0, -0.85);
  for (const [side, sign] of [
    [0, -1],
    [1, 1],
  ]) {
    const x = sign * 0.18;
    const knee =
      ((mode === "knee"
        ? Math.max(0, config.maxAngle - side * config.asymmetry) * progress
        : 0) *
        Math.PI) /
      180;
    const hipY = -0.4 * Math.cos(knee / 2) * 2;
    world[27 + side] = point(x, 0);
    world[25 + side] = point(
      x,
      -0.4 * Math.cos(knee / 2),
      -0.4 * Math.sin(knee / 2),
    );
    world[23 + side] = point(x, hipY);
    world[11 + side] = point(x, hipY - 0.5);
    const arm =
      ((mode === "shoulder"
        ? Math.max(0, config.maxAngle - side * config.asymmetry) * progress
        : 5) *
        Math.PI) /
      180;
    const dx = exercise === "abduction" ? sign * Math.sin(arm) : 0;
    const dz = exercise === "flexion" ? -Math.sin(arm) : 0;
    world[13 + side] = point(
      x + dx * 0.28,
      hipY - 0.5 + Math.cos(arm) * 0.28,
      dz * 0.28,
    );
    world[15 + side] = point(
      x + dx * 0.52,
      hipY - 0.5 + Math.cos(arm) * 0.52,
      dz * 0.52,
    );
  }
  world[0] = point(0, world[23].y - 0.72);
  const image = world.map((p) => ({
    ...p,
    x: 0.5 + (p.x + p.z * 0.45) * 0.46,
    y: 0.92 + p.y * 0.46,
  }));
  return {
    poseLandmarks: image,
    poseWorldLandmarks: world,
    expectedLeft: config.maxAngle * progress,
    expectedRight: Math.max(0, config.maxAngle - config.asymmetry) * progress,
  };
}

// Kept for existing consumers.
export function generateSimulatedLandmarks(
  time: number,
  mode: "gait" | "squat" | "free_rom",
) {
  return simulatePose(time, "knee", "abduction", DEFAULT_SIMULATION)
    .poseLandmarks;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAngle,
  calculateKneeFlexionAngle,
  calculateShoulderFlexion,
  isLandmarkReliable,
  updateKneeMovementState,
  updateShoulderMovementState,
} from "../src/utils/angleCalculator";
import { simulatePose, DEFAULT_SIMULATION } from "../src/utils/poseSimulator";
import { fingerFlexion } from "../src/utils/handAnalysis";

for (const angle of [0, 30, 60, 90, 120, 150]) {
  test(`known geometry: knee and shoulder ${angle} degrees`, () => {
    for (const mode of ["knee", "shoulder"] as const)
      for (const exercise of ["abduction", "flexion"] as const) {
        const frame = simulatePose(3, mode, exercise, {
          ...DEFAULT_SIMULATION,
          maxAngle: angle,
        });
        const p = frame.poseWorldLandmarks;
        const measured =
          mode === "knee"
            ? calculateKneeFlexionAngle(p[23], p[25], p[27]).flexion
            : calculateShoulderFlexion(p[11], p[13], p[23]);
        assert.ok(
          Math.abs(measured - angle) < 1e-5,
          `${mode} ${exercise}: ${measured}`,
        );
      }
  });
}
test("invalid and degenerate coordinates cannot become zero-degree measurements", () => {
  const p = { x: 0, y: 0, z: 0 };
  assert.ok(Number.isNaN(calculateAngle(p, p, p)));
  assert.ok(Number.isNaN(calculateAngle({ ...p, x: NaN }, p, { ...p, x: 1 })));
  assert.equal(isLandmarkReliable([{ ...p, visibility: NaN }]), false);
  assert.equal(isLandmarkReliable([{ ...p, visibility: 0.2 }]), false);
});
test("asymmetry scenario matches specified right-side range reduction", () => {
  const p = simulatePose(3, "knee", "abduction", {
    ...DEFAULT_SIMULATION,
    maxAngle: 100,
    asymmetry: 25,
  }).poseWorldLandmarks;
  assert.ok(
    Math.abs(calculateKneeFlexionAngle(p[24], p[26], p[28]).flexion - 75) <
      1e-6,
  );
});
test("one complete simulated cycle counts exactly once; partial movements do not count", () => {
  let state: Parameters<typeof updateKneeMovementState>[0] = "STANDING";
  let reps = 0;
  for (let i = 0; i <= 360; i++) {
    const p = simulatePose(
      i / 60,
      "knee",
      "abduction",
      DEFAULT_SIMULATION,
    ).poseWorldLandmarks;
    const a = calculateKneeFlexionAngle(p[23], p[25], p[27]).flexion;
    const next = updateKneeMovementState(state, a, a);
    state = next.nextState;
    reps += Number(next.repCompleted);
  }
  assert.equal(reps, 1);
  state = "STANDING";
  reps = 0;
  for (const a of [0, 30, 40, 30, 0]) {
    const next = updateKneeMovementState(state, a, a);
    state = next.nextState;
    reps += Number(next.repCompleted);
  }
  assert.equal(reps, 0);
});
test("shoulder target must be reached, not target minus ten degrees", () => {
  assert.equal(
    updateShoulderMovementState("RAISING", 85, 90).nextState,
    "RAISING",
  );
  assert.equal(
    updateShoulderMovementState("RAISING", 90, 90).nextState,
    "TARGET",
  );
});
test("hand flexion measures extended and right-angle finger joints", () => {
  const points = Array.from({ length: 21 }, (_, i) => ({ x: 0, y: i, z: 0 }));
  assert.ok(fingerFlexion(points).every((a) => Math.abs(a) < 1e-6));
  points[7] = { x: 1, y: 6, z: 0 };
  assert.ok(Math.abs(fingerFlexion(points)[1] - 90) < 1e-6);
});

test("shoulder targets at small ROM and 90 degrees complete one full cycle", () => {
  for (const target of [10, 30, 90, 150]) {
    let state: Parameters<typeof updateShoulderMovementState>[0] = "REST";
    let reps = 0;
    for (let i = 0; i <= 360; i++) {
      const angle = (target * (1 - Math.cos((i / 360) * Math.PI * 2))) / 2;
      const next = updateShoulderMovementState(state, angle, target);
      state = next.nextState;
      reps += Number(next.repCompleted);
    }
    assert.equal(reps, 1, `target ${target}`);
  }
});

test("trunk lean uses the centerline, not the shoulder line slope", async () => {
  const { detectTorsoCompensation } =
    await import("../src/utils/angleCalculator");
  const hipL = { x: -0.2, y: 1, z: 0 },
    hipR = { x: 0.2, y: 1, z: 0 };
  assert.equal(
    detectTorsoCompensation(
      { x: -0.2, y: 0, z: 0 },
      { x: 0.2, y: 0.2, z: 0 },
      hipL,
      hipR,
    ).isCompensated,
    false,
  );
  assert.equal(
    detectTorsoCompensation(
      { x: 0.1, y: 0, z: 0 },
      { x: 0.5, y: 0, z: 0 },
      hipL,
      hipR,
    ).isCompensated,
    true,
  );
});

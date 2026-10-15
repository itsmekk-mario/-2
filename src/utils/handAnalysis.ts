import { Landmark } from "../types";
import { calculateAngle } from "./angleCalculator";
export interface TrackedHand {
  side: string;
  score: number;
  landmarks: Landmark[];
  flexion: number[];
}
export const FINGERS = ["엄지", "검지", "중지", "약지", "소지"];
export const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
// Thumb IP and each finger's PIP flexion, from metric world landmarks.
export function fingerFlexion(points: Landmark[]) {
  return [
    [2, 3, 4],
    [5, 6, 7],
    [9, 10, 11],
    [13, 14, 15],
    [17, 18, 19],
  ].map(([a, b, c]) => 180 - calculateAngle(points[a], points[b], points[c]));
}

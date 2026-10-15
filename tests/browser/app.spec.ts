import { test, expect } from "@playwright/test";
import {
  simulatePose,
  DEFAULT_SIMULATION,
} from "../../src/utils/poseSimulator";
const knee = simulatePose(3, "knee", "abduction", DEFAULT_SIMULATION);
test.beforeEach(async ({ page }) => {
  await page.addInitScript((frame) => {
    (window as any).fixture = frame;
  }, knee);
  await page.route(
    "**/node_modules/.vite/deps/@mediapipe_tasks-vision.js*",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `
    export const FilesetResolver = { forVisionTasks: async () => ({}) };
    export class PoseLandmarker {
      static async createFromOptions() { return new PoseLandmarker(); }
      close() {}
      detectForVideo() { const f=window.fixture; return { landmarks: [f.poseLandmarks], worldLandmarks: [f.poseWorldLandmarks] }; }
    }
    export class HandLandmarker { static async createFromOptions() { return new HandLandmarker(); } close() {} detectForVideo() { return {landmarks:[],worldLandmarks:[],handedness:[]}; } }
  `,
      }),
  );
  await page.goto("/");
});
test("camera uses world coordinates, updates selected mode and rejects low confidence", async ({
  page,
}) => {
  const left = page
    .locator("div")
    .filter({ has: page.locator("span", { hasText: /^LEFT JOINT$/ }) })
    .filter({ has: page.locator("p", { hasText: /^Max:/ }) })
    .last();
  await expect(left).toContainText("90.0°");
  await page.getByRole("button", { name: "어깨 분석", exact: true }).click();
  await page.evaluate(
    (frame) => {
      (window as any).fixture = frame;
    },
    simulatePose(3, "shoulder", "abduction", {
      ...DEFAULT_SIMULATION,
      maxAngle: 60,
    }),
  );
  await expect(left).toContainText("60.0°");
  await page.evaluate(
    (frame) => {
      (window as any).fixture = frame;
    },
    simulatePose(3, "shoulder", "abduction", {
      ...DEFAULT_SIMULATION,
      trackingLoss: true,
    }),
  );
  await expect(left).toContainText("—");
  await page.getByRole("button", { name: "리포트", exact: true }).click();
  const report = page.getByRole("heading", { name: "어깨 측정 리포트" });
  await expect(report).toBeVisible();
  const before = await page.getByText(/유효 분석 시간/).textContent();
  await page.waitForTimeout(700);
  expect(await page.getByText(/유효 분석 시간/).textContent()).toBe(before);
});
test("simulation pause, reps, report, CSV and tab lifecycle", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "자세 시뮬레이터 (테스트용)", exact: true })
    .click();
  await page.getByRole("slider", { name: "재생 속도" }).fill("2");
  await page.getByRole("button", { name: "처음부터 재생" }).click();
  const repCard = page.getByText("REP COUNT", { exact: true }).locator("../..");
  await expect(repCard.getByText("1", { exact: true })).toBeVisible({
    timeout: 10000,
  });
  await page
    .getByRole("button", { name: "측정 일시정지", exact: true })
    .click();
  await page.getByRole("button", { name: "리포트", exact: true }).click();
  const before = await page.getByText(/유효 분석 시간/).textContent();
  await page.waitForTimeout(700);
  expect(await page.getByText(/유효 분석 시간/).textContent()).toBe(before);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk;
  expect(csv).toContain("pose_simulator,knee");
  expect(csv).not.toMatch(/NaN|undefined/);
  await page.getByRole("button", { name: "모니터", exact: true }).click();
  await page.getByRole("button", { name: "측정 재개", exact: true }).click();
  await page.getByLabel("인식 불안정 재현").check();
  await expect(
    page.getByText(
      "관절 인식이 불안정해 기록을 중단했습니다. 가려진 관절을 비춰주세요.",
    ),
  ).toBeVisible();
});
test("mobile has no horizontal overflow and simulation draws a skeleton", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "자세 시뮬레이터 (테스트용)", exact: true })
    .click();
  await expect(page.getByText("SIMULATION · 합성 동작")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/workspace/project/artifacts/mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "/workspace/project/artifacts/desktop.png",
    fullPage: true,
  });
});

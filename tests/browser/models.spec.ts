import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Opt-in integration test: downloads real Pose/Hands WASM and models (~30 MB).
test("real Pose and Hand Landmarkers coexist and detect two hands", async ({
  page,
}) => {
  test.skip(
    process.env.MEDIAPIPE_SMOKE !== "1",
    "Requires network access to MediaPipe model assets.",
  );
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Managed environments inject credentials/CA trust via their HTTP proxy. Use
  // curl's inherited proxy path instead of making direct browser connections.
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
    const execute = promisify(execFile);
    await page.route("https://**", async (route) => {
      const url = route.request().url();
      if (
        !["cdn.jsdelivr.net", "storage.googleapis.com"].includes(
          new URL(url).hostname,
        )
      )
        return route.abort();
      try {
        const { stdout } = await execute(
          "curl",
          ["--fail", "--location", "--max-time", "60", url],
          { encoding: "buffer", maxBuffer: 100 * 1024 * 1024 },
        );
        await route.fulfill({
          body: stdout,
          contentType: url.endsWith(".js")
            ? "application/javascript"
            : url.endsWith(".wasm")
              ? "application/wasm"
              : url.endsWith(".jpg")
                ? "image/jpeg"
                : "application/octet-stream",
          headers: { "access-control-allow-origin": "*" },
        });
      } catch {
        await route.abort();
      }
    });
  }
  await page.goto("/");
  await page.getByRole("button", { name: "손가락 인식 켜기" }).click();
  await expect(page.getByRole("status")).toContainText(
    /손을 카메라 가까이 비춰주세요|손 미감지|손가락 추적 중/,
    { timeout: 90000 },
  );
  await page.evaluate(async () => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src =
      "https://storage.googleapis.com/mediapipe-assets/woman_hands.jpg";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const video = document.querySelector("video")!;
    (video.srcObject as MediaStream | null)
      ?.getTracks()
      .forEach((track) => track.stop());
    video.srcObject = canvas.captureStream(15);
    await video.play();
    const draw = () => {
      ctx.drawImage(image, 0, 0);
      requestAnimationFrame(draw);
    };
    draw();
  });
  await expect(page.getByRole("status")).toHaveText(
    "손가락 추적 중 · IP/PIP 굴곡 추정",
    { timeout: 30000 },
  );
  await expect(page.getByText(/왼손 인식 신뢰도/)).toBeVisible();
  await expect(page.getByText(/오른손 인식 신뢰도/)).toBeVisible();
  const panel = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: /손가락 움직임/ }) });
  expect(await panel.textContent()).not.toMatch(/NaN|undefined/);
  expect(errors).toEqual([]);
});

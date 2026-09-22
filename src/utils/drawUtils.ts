import {
  FullBodyLandmarks,
  JointAngles,
  MajorMode,
  ShoulderExercise,
  OperatedSide,
} from '../types';

/**
 * Draw MediaPipe Pose Landmarks & Connecting Bones over Camera Feed
 */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: FullBodyLandmarks,
  width: number,
  height: number,
  isMirrored: boolean,
  angles: JointAngles | null,
  warningMessage: string | null = null,
  majorMode: MajorMode = 'knee',
  shoulderExercise: ShoulderExercise = 'abduction',
  operatedSide: OperatedSide = 'none',
  torsoCompensated = false
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const toPx = (lm?: { x: number; y: number }) => {
    if (!lm) return null;
    return {
      x: isMirrored ? (1 - lm.x) * width : lm.x * width,
      y: lm.y * height,
    };
  };

  const drawBone = (
    p1: { x: number; y: number } | null,
    p2: { x: number; y: number } | null,
    color: string,
    lineWidth = 4,
    dash: number[] = []
  ) => {
    if (!p1 || !p2) return;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  };

  const drawJoint = (
    p: { x: number; y: number } | null,
    color: string,
    radius = 6,
    border = '#FFFFFF'
  ) => {
    if (!p) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.restore();
  };

  const drawAngleBadge = (
    p: { x: number; y: number } | null,
    angle: number,
    color: string,
    label: string
  ) => {
    if (!p) return;
    ctx.save();
    const text = `${label}: ${angle.toFixed(1)}°`;
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    const textMetrics = ctx.measureText(text);
    const padX = 8;
    const padY = 5;
    const rectW = textMetrics.width + padX * 2;
    const rectH = 22;
    const badgeX = Math.min(Math.max(10, p.x - rectW / 2), width - rectW - 10);
    const badgeY = Math.max(10, p.y - 28);

    ctx.fillStyle = 'rgba(36, 36, 29, 0.88)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, rectW, rectH, 6);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, badgeX + padX, badgeY + 15);
    ctx.restore();
  };

  // Convert points
  const lShoulder = toPx(landmarks.leftShoulder);
  const rShoulder = toPx(landmarks.rightShoulder);
  const lElbow = toPx(landmarks.leftElbow);
  const rElbow = toPx(landmarks.rightElbow);
  const lWrist = toPx(landmarks.leftWrist);
  const rWrist = toPx(landmarks.rightWrist);
  const lHip = toPx(landmarks.leftHip);
  const rHip = toPx(landmarks.rightHip);
  const lKnee = toPx(landmarks.leftKnee);
  const rKnee = toPx(landmarks.rightKnee);
  const lAnkle = toPx(landmarks.leftAnkle);
  const rAnkle = toPx(landmarks.rightAnkle);

  // 1. Torso Alignment (Shoulders to Hips)
  const trunkColor = torsoCompensated ? '#D9381E' : 'rgba(90, 90, 64, 0.6)';
  const trunkWidth = torsoCompensated ? 4 : 2.5;

  drawBone(lShoulder, rShoulder, trunkColor, trunkWidth);
  drawBone(lHip, rHip, trunkColor, trunkWidth);
  drawBone(lShoulder, lHip, trunkColor, trunkWidth);
  drawBone(rShoulder, rHip, trunkColor, trunkWidth);

  // 2. Mode-Specific Emphasis
  if (majorMode === 'knee') {
    // Knee Mode: Emphasize Lower Body (Hip - Knee - Ankle)
    drawBone(lHip, lKnee, '#FF6321', 5);
    drawBone(lKnee, lAnkle, '#FF6321', 5);
    drawBone(rHip, rKnee, '#3E5C38', 5);
    drawBone(rKnee, rAnkle, '#3E5C38', 5);

    // Minor lines for arms
    drawBone(lShoulder, lElbow, 'rgba(200, 200, 190, 0.4)', 2);
    drawBone(lElbow, lWrist, 'rgba(200, 200, 190, 0.4)', 2);
    drawBone(rShoulder, rElbow, 'rgba(200, 200, 190, 0.4)', 2);
    drawBone(rElbow, rWrist, 'rgba(200, 200, 190, 0.4)', 2);

    // Draw Joints
    drawJoint(lHip, '#FF6321', 6);
    drawJoint(lKnee, '#FF6321', 8);
    drawJoint(lAnkle, '#FF6321', 6);

    drawJoint(rHip, '#3E5C38', 6);
    drawJoint(rKnee, '#3E5C38', 8);
    drawJoint(rAnkle, '#3E5C38', 6);

    // Angle labels
    if (angles) {
      drawAngleBadge(lKnee, angles.leftKneeFlexion, '#FF6321', 'L 무릎');
      drawAngleBadge(rKnee, angles.rightKneeFlexion, '#3E5C38', 'R 무릎');
    }
  } else {
    // Shoulder Mode: Emphasize Upper Body (Shoulder - Elbow - Wrist - Hip)
    const lColor = operatedSide === 'left' ? '#FF6321' : '#3E5C38';
    const rColor = operatedSide === 'right' ? '#FF6321' : '#5A5A40';

    // Arms
    drawBone(lShoulder, lElbow, lColor, operatedSide === 'left' ? 6 : 4);
    drawBone(lElbow, lWrist, lColor, operatedSide === 'left' ? 6 : 4);

    drawBone(rShoulder, rElbow, rColor, operatedSide === 'right' ? 6 : 4);
    drawBone(rElbow, rWrist, rColor, operatedSide === 'right' ? 6 : 4);

    // Legs (faint)
    drawBone(lHip, lKnee, 'rgba(200, 200, 190, 0.4)', 2);
    drawBone(lKnee, lAnkle, 'rgba(200, 200, 190, 0.4)', 2);
    drawBone(rHip, rKnee, 'rgba(200, 200, 190, 0.4)', 2);
    drawBone(rKnee, rAnkle, 'rgba(200, 200, 190, 0.4)', 2);

    // Draw Joints
    drawJoint(lShoulder, lColor, operatedSide === 'left' ? 9 : 7);
    drawJoint(lElbow, lColor, 6);
    drawJoint(lWrist, lColor, 5);

    drawJoint(rShoulder, rColor, operatedSide === 'right' ? 9 : 7);
    drawJoint(rElbow, rColor, 6);
    drawJoint(rWrist, rColor, 5);

    drawJoint(lHip, trunkColor, 5);
    drawJoint(rHip, trunkColor, 5);

    // Angle labels
    if (angles) {
      const modeText = shoulderExercise === 'flexion' ? '굴곡' : '외전';
      drawAngleBadge(lShoulder, angles.currentLeft, lColor, `L ${modeText}`);
      drawAngleBadge(rShoulder, angles.currentRight, rColor, `R ${modeText}`);
    }

    // Operated side halo highlight
    if (operatedSide === 'left' && lShoulder) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(lShoulder.x, lShoulder.y, 16, 0, 2 * Math.PI);
      ctx.strokeStyle = '#FF6321';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    } else if (operatedSide === 'right' && rShoulder) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(rShoulder.x, rShoulder.y, 16, 0, 2 * Math.PI);
      ctx.strokeStyle = '#FF6321';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Torso compensation visual warning banner on canvas
  if (torsoCompensated) {
    ctx.save();
    ctx.fillStyle = 'rgba(217, 56, 30, 0.85)';
    ctx.fillRect(width / 2 - 120, 12, 240, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('몸통 기울임 감지 (보상동작)', width / 2, 29);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draw "Mini Digital Twin" 2D Skeleton
 * Requirement 20: Full-body skeleton (Head, Shoulders, Arms, Torso, Hips, Knees, Ankles)
 * Emphasizes Lower Body in Knee Mode, and Shoulders/Arms/Torso in Shoulder Mode.
 */
export function drawDigitalTwin(
  ctx: CanvasRenderingContext2D,
  landmarks: FullBodyLandmarks | null,
  width: number,
  height: number,
  isMirrored: boolean,
  angles: JointAngles | null,
  majorMode: MajorMode = 'knee',
  shoulderExercise: ShoulderExercise = 'abduction',
  operatedSide: OperatedSide = 'none',
  torsoCompensated = false
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Background subtle grid
  ctx.strokeStyle = '#F0F0E8';
  ctx.lineWidth = 1;
  const gridSize = 24;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (!landmarks) {
    ctx.fillStyle = '#8A8A70';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('스켈레톤 동기화 대기 중...', width / 2, height / 2);
    ctx.restore();
    return;
  }

  // Scaling helper: maps normalized coords (0..1) to fit nicely in the digital twin canvas
  const pad = 24;
  const toPx = (lm?: { x: number; y: number }) => {
    if (!lm) return null;
    const nx = isMirrored ? 1 - lm.x : lm.x;
    return {
      x: pad + nx * (width - pad * 2),
      y: pad + lm.y * (height - pad * 2),
    };
  };

  const drawSegment = (
    p1: { x: number; y: number } | null,
    p2: { x: number; y: number } | null,
    color: string,
    lw = 3
  ) => {
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const drawJointNode = (
    p: { x: number; y: number } | null,
    color: string,
    r = 5,
    border = '#FFFFFF'
  ) => {
    if (!p) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const nose = toPx(landmarks.nose);
  const lShoulder = toPx(landmarks.leftShoulder);
  const rShoulder = toPx(landmarks.rightShoulder);
  const lElbow = toPx(landmarks.leftElbow);
  const rElbow = toPx(landmarks.rightElbow);
  const lWrist = toPx(landmarks.leftWrist);
  const rWrist = toPx(landmarks.rightWrist);
  const lHip = toPx(landmarks.leftHip);
  const rHip = toPx(landmarks.rightHip);
  const lKnee = toPx(landmarks.leftKnee);
  const rKnee = toPx(landmarks.rightKnee);
  const lAnkle = toPx(landmarks.leftAnkle);
  const rAnkle = toPx(landmarks.rightAnkle);

  // Head Circle
  if (nose) {
    drawJointNode(nose, '#5A5A40', 8, '#DEDECF');
  } else if (lShoulder && rShoulder) {
    const headX = (lShoulder.x + rShoulder.x) / 2;
    const headY = (lShoulder.y + rShoulder.y) / 2 - 20;
    drawJointNode({ x: headX, y: headY }, '#5A5A40', 8, '#DEDECF');
  }

  // Trunk (Shoulders to Hips)
  const trunkColor = torsoCompensated ? '#D9381E' : '#5A5A40';
  drawSegment(lShoulder, rShoulder, trunkColor, 3);
  drawSegment(lHip, rHip, trunkColor, 3);
  drawSegment(lShoulder, lHip, trunkColor, 2.5);
  drawSegment(rShoulder, rHip, trunkColor, 2.5);

  // Mode based styling
  if (majorMode === 'knee') {
    // Legs: Emphasized
    drawSegment(lHip, lKnee, '#FF6321', 5);
    drawSegment(lKnee, lAnkle, '#FF6321', 5);
    drawSegment(rHip, rKnee, '#3E5C38', 5);
    drawSegment(rKnee, rAnkle, '#3E5C38', 5);

    // Arms: Thin
    drawSegment(lShoulder, lElbow, '#DEDECF', 2);
    drawSegment(lElbow, lWrist, '#DEDECF', 2);
    drawSegment(rShoulder, rElbow, '#DEDECF', 2);
    drawSegment(rElbow, rWrist, '#DEDECF', 2);

    // Joints
    drawJointNode(lHip, '#FF6321', 5);
    drawJointNode(lKnee, '#FF6321', 7);
    drawJointNode(lAnkle, '#FF6321', 5);

    drawJointNode(rHip, '#3E5C38', 5);
    drawJointNode(rKnee, '#3E5C38', 7);
    drawJointNode(rAnkle, '#3E5C38', 5);
  } else {
    // Shoulder Mode: Arms & Shoulders Emphasized
    const lColor = operatedSide === 'left' ? '#FF6321' : '#3E5C38';
    const rColor = operatedSide === 'right' ? '#FF6321' : '#5A5A40';

    drawSegment(lShoulder, lElbow, lColor, operatedSide === 'left' ? 5 : 3.5);
    drawSegment(lElbow, lWrist, lColor, operatedSide === 'left' ? 5 : 3.5);

    drawSegment(rShoulder, rElbow, rColor, operatedSide === 'right' ? 5 : 3.5);
    drawSegment(rElbow, rWrist, rColor, operatedSide === 'right' ? 5 : 3.5);

    // Legs: Thin
    drawSegment(lHip, lKnee, '#DEDECF', 2);
    drawSegment(lKnee, lAnkle, '#DEDECF', 2);
    drawSegment(rHip, rKnee, '#DEDECF', 2);
    drawSegment(rKnee, rAnkle, '#DEDECF', 2);

    // Joints
    drawJointNode(lShoulder, lColor, operatedSide === 'left' ? 8 : 6);
    drawJointNode(lElbow, lColor, 5);
    drawJointNode(lWrist, lColor, 4);

    drawJointNode(rShoulder, rColor, operatedSide === 'right' ? 8 : 6);
    drawJointNode(rElbow, rColor, 5);
    drawJointNode(rWrist, rColor, 4);

    drawJointNode(lHip, trunkColor, 4);
    drawJointNode(rHip, trunkColor, 4);

    // Operated side halo in Digital Twin
    const opJoint = operatedSide === 'left' ? lShoulder : operatedSide === 'right' ? rShoulder : null;
    if (opJoint) {
      ctx.beginPath();
      ctx.arc(opJoint.x, opJoint.y, 13, 0, 2 * Math.PI);
      ctx.strokeStyle = '#FF6321';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}

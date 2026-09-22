import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LowerBodyLandmarks, JointAngles } from '../types';
import { Eye, RotateCw, Maximize2 } from 'lucide-react';

interface DigitalTwin3DProps {
  landmarks: LowerBodyLandmarks | null;
  angles: JointAngles | null;
  syncWithVideo: boolean;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  landmarks,
  angles,
  syncWithVideo,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Joint Meshes
  const meshesRef = useRef<{
    lHip: THREE.Mesh;
    rHip: THREE.Mesh;
    lKnee: THREE.Mesh;
    rKnee: THREE.Mesh;
    lAnkle: THREE.Mesh;
    rAnkle: THREE.Mesh;
    pelvisBone: THREE.Mesh;
    lFemurBone: THREE.Mesh;
    lTibiaBone: THREE.Mesh;
    rFemurBone: THREE.Mesh;
    rTibiaBone: THREE.Mesh;
  } | null>(null);

  const [viewPreset, setViewPreset] = useState<'sagittal' | 'frontal' | 'orbit'>('sagittal');

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(1.5, 0.2, 2.5); // Default Sagittal perspective
    camera.lookAt(0, -0.2, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(3, 5, 4);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x34d399, 0.8);
    dirLight2.position.set(-3, -2, -2);
    scene.add(dirLight2);

    // Floor Grid Helper for 3D spatial reference
    const gridHelper = new THREE.GridHelper(4, 20, 0x334155, 0x1e293b);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    // Create 3D Joint Spheres & Bone Cylinders
    const jointGeo = new THREE.SphereGeometry(0.06, 24, 24);
    const hipMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.2 });
    const kneeMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.5 });
    const ankleMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.3 });

    const lHip = new THREE.Mesh(jointGeo, hipMat);
    const rHip = new THREE.Mesh(jointGeo, hipMat);
    const lKnee = new THREE.Mesh(jointGeo, kneeMat);
    const rKnee = new THREE.Mesh(jointGeo, kneeMat);
    const lAnkle = new THREE.Mesh(jointGeo, ankleMat);
    const rAnkle = new THREE.Mesh(jointGeo, ankleMat);

    scene.add(lHip, rHip, lKnee, rKnee, lAnkle, rAnkle);

    // Bone Cylinders Helper
    const createBoneMesh = (color: number) => {
      const boneGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 16);
      const boneMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const bone = new THREE.Mesh(boneGeo, boneMat);
      scene.add(bone);
      return bone;
    };

    const pelvisBone = createBoneMesh(0xf59e0b);
    const lFemurBone = createBoneMesh(0x38bdf8);
    const lTibiaBone = createBoneMesh(0x0284c7);
    const rFemurBone = createBoneMesh(0x34d399);
    const rTibiaBone = createBoneMesh(0x059669);

    meshesRef.current = {
      lHip,
      rHip,
      lKnee,
      rKnee,
      lAnkle,
      rAnkle,
      pelvisBone,
      lFemurBone,
      lTibiaBone,
      rFemurBone,
      rTibiaBone,
    };

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // View Preset Camera Positioning
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (viewPreset === 'sagittal') {
      // Sagittal View (Side view - crucial for knee flexion)
      camera.position.set(2.2, 0.0, 0.2);
      camera.lookAt(0, -0.2, 0);
    } else if (viewPreset === 'frontal') {
      // Frontal View (Front view - crucial for knee valgus/varus and symmetry)
      camera.position.set(0.0, 0.0, 2.5);
      camera.lookAt(0, -0.2, 0);
    } else {
      // 3D Isometric Orbit View
      camera.position.set(1.6, 0.8, 1.8);
      camera.lookAt(0, -0.2, 0);
    }
  }, [viewPreset]);

  // Update 3D Joint Positions based on MediaPipe landmarks
  useEffect(() => {
    if (!landmarks || !meshesRef.current || !syncWithVideo) return;

    const { lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, pelvisBone, lFemurBone, lTibiaBone, rFemurBone, rTibiaBone } =
      meshesRef.current;

    // Convert normalized MediaPipe coordinates (X: 0..1, Y: 0..1, Z: relative) to 3D Scene space
    // Scale X/Y centered around origin (0, 0)
    const scaleX = 2.0;
    const scaleY = -2.2; // inverted Y
    const scaleZ = -2.0;

    const to3D = (lm: { x: number; y: number; z: number }) =>
      new THREE.Vector3(
        (lm.x - 0.5) * scaleX,
        (lm.y - 0.5) * scaleY,
        (lm.z || 0) * scaleZ
      );

    const posLHip = to3D(landmarks.leftHip);
    const posRHip = to3D(landmarks.rightHip);
    const posLKnee = to3D(landmarks.leftKnee);
    const posRKnee = to3D(landmarks.rightKnee);
    const posLAnkle = to3D(landmarks.leftAnkle);
    const posRAnkle = to3D(landmarks.rightAnkle);

    lHip.position.copy(posLHip);
    rHip.position.copy(posRHip);
    lKnee.position.copy(posLKnee);
    rKnee.position.copy(posRKnee);
    lAnkle.position.copy(posLAnkle);
    rAnkle.position.copy(posRAnkle);

    // Helper function to stretch & orient bone cylinders between two joints
    const positionBone = (bone: THREE.Mesh, p1: THREE.Vector3, p2: THREE.Vector3) => {
      const distance = p1.distanceTo(p2);
      bone.scale.set(1, distance, 1);

      const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      bone.position.copy(midpoint);

      // Rotate cylinder along p1 -> p2
      const orientation = new THREE.Matrix4();
      orientation.lookAt(p2, p1, new THREE.Vector3(0, 1, 0));
      const rotation = new THREE.Euler().setFromRotationMatrix(orientation);
      bone.rotation.copy(rotation);
      bone.rotateX(Math.PI / 2); // Default cylinder orient
    };

    positionBone(pelvisBone, posLHip, posRHip);
    positionBone(lFemurBone, posLHip, posLKnee);
    positionBone(lTibiaBone, posLKnee, posLAnkle);
    positionBone(rFemurBone, posRHip, posRKnee);
    positionBone(rTibiaBone, posRKnee, posRAnkle);

  }, [landmarks, syncWithVideo]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col space-y-3">
      {/* Header & View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            3D 디지털 트윈 (하체 스켈레톤)
          </h3>
        </div>

        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewPreset('sagittal')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              viewPreset === 'sagittal'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="시상면 (측면) - 무릎 굴곡 각도 관찰에 최적"
          >
            시상면 (측면)
          </button>
          <button
            onClick={() => setViewPreset('frontal')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              viewPreset === 'frontal'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="관상면 (정면) - 무릎 내반/외반 및 비대칭 관찰"
          >
            관상면 (정면)
          </button>
          <button
            onClick={() => setViewPreset('orbit')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              viewPreset === 'orbit'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D 자유뷰
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800/80 shadow-inner"
      >
        {/* Real-time 3D Joint Angles Display Overlay */}
        {angles && (
          <div className="absolute top-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] space-y-1 text-slate-300 font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>좌측 굴곡: <strong className="text-cyan-300">{angles.leftKneeFlexion.toFixed(1)}°</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>우측 굴곡: <strong className="text-emerald-300">{angles.rightKneeFlexion.toFixed(1)}°</strong></span>
            </div>
            <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
              비대칭: {angles.asymmetry.toFixed(1)}°
            </div>
          </div>
        )}

        <div className="absolute bottom-2 right-3 z-10 text-[10px] text-slate-500 font-mono">
          Three.js Realtime Mesh Render
        </div>
      </div>
    </div>
  );
};

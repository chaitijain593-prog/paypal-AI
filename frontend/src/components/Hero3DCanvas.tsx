'use client';

import React, { useRef, useState, useEffect, useMemo, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  Float,
  Html,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import PhoneScreenContent from '@/components/PhoneScreenContent';

// Helper to build a rounded-corner smartphone chassis shape
function createRoundedRectShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

// GLTF Phone Loader for /public/phone.glb (used when user adds their 3D model)
function GLTFPhone() {
  const gltf = useGLTF('/phone.glb');
  return (
    <group>
      <primitive object={gltf.scene} scale={1.0} />
      {/* HTML screen overlay on the GLTF model */}
      <Html
        transform
        occlude
        distanceFactor={1.6}
        position={[0, 0, 0.08]}
        className="w-[335px] h-[670px] pointer-events-auto rounded-[34px] overflow-hidden"
      >
        <PhoneScreenContent />
      </Html>
    </group>
  );
}

// Procedural Sleek Metallic Smartphone (matches user screenshot proportions)
function ProceduralPhone({ cardsOpacityRef }: { cardsOpacityRef: React.MutableRefObject<number> }) {
  // Dimensions calibrated so distanceFactor={1.6} maps 335px * 670px exactly
  const phoneWidth = 1.40;
  const phoneHeight = 2.74;
  const cornerRadius = 0.16;

  // Outer metallic body geometry with rounded beveled corners
  const bodyGeometry = useMemo(() => {
    const shape = createRoundedRectShape(phoneWidth, phoneHeight, cornerRadius);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    geom.center();
    return geom;
  }, []);

  // Inner black screen frame geometry
  const screenBackdropGeometry = useMemo(() => {
    const shape = createRoundedRectShape(1.36, 2.70, 0.13);
    const geom = new THREE.ShapeGeometry(shape);
    geom.center();
    return geom;
  }, []);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  // Update floating cards opacity based on scroll stage without React re-render
  useFrame(() => {
    const op = cardsOpacityRef.current ?? 1;
    if (frontCardRef.current) {
      frontCardRef.current.style.opacity = String(op);
      frontCardRef.current.style.transform = `translate3d(0, 0, 0) scale(${0.85 + op * 0.15})`;
    }
    if (backCardRef.current) {
      backCardRef.current.style.opacity = String(op * 0.82);
      backCardRef.current.style.transform = `translate3d(0, 0, 0) scale(${0.85 + op * 0.15})`;
    }
  });

  return (
    <group>
      {/* Outer Titanium Metallic Chassis */}
      <mesh geometry={bodyGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.92}
          roughness={0.18}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Glossy Screen Glass Inset */}
      <mesh geometry={screenBackdropGeometry} position={[0, 0, 0.062]}>
        <meshStandardMaterial
          color="#06090e"
          roughness={0.08}
          metalness={0.5}
        />
      </mesh>

      {/* Dynamic Island Pill */}
      <mesh position={[0, 1.16, 0.066]}>
        <capsuleGeometry args={[0.028, 0.16, 4, 8]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Live Interactive Fintech UI via drei <Html transform occlude> */}
      <Html
        transform
        occlude
        distanceFactor={1.6}
        position={[0, 0, 0.065]}
        className="w-[335px] h-[670px] pointer-events-auto rounded-[34px] overflow-hidden shadow-2xl"
      >
        <PhoneScreenContent />
      </Html>

      {/* Floating Front Card: Visa CE 3.0 Rebuttal Won */}
      <Html
        transform
        distanceFactor={1.6}
        position={[-0.72, -0.42, 0.35]}
        className="pointer-events-none transition-all duration-300"
      >
        <div
          ref={frontCardRef}
          className="w-[245px] rounded-2xl bg-[#121826] border border-white/[0.14] p-4 shadow-2xl"
          style={{
            boxShadow: '-20px 28px 50px -10px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 112, 186, 0.3)',
          }}
        >
          <div className="text-center space-y-2.5">
            <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">
                CE 3.0 Rebuttal Won
              </p>
              <h3 className="text-sm font-bold text-white mt-0.5">Payment Confirmed</h3>
              <p className="text-[10px] text-slate-300 mt-0.5">
                Evidence verified by Visa &amp; PayPal
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-left text-xs flex justify-between items-center">
              <span className="text-slate-300">Protected Balance:</span>
              <span className="font-bold text-white tabular-nums">$1,249.99</span>
            </div>
          </div>
        </div>
      </Html>

      {/* Floating Back Card: Buyer AI Agent */}
      <Html
        transform
        distanceFactor={1.6}
        position={[0.92, 0.72, -0.24]}
        className="pointer-events-none transition-all duration-300 hidden sm:block"
      >
        <div
          ref={backCardRef}
          className="w-[240px] rounded-2xl bg-[#121826]/95 border border-white/[0.1] p-3.5 shadow-2xl"
          style={{
            filter: 'blur(0.5px)',
          }}
        >
          <div className="rounded-xl p-3 bg-white/[0.04] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-300">
              <span>BUYER AI AGENT</span>
              <span className="text-[#3B9EFF]">AGENT #409</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Pre-Authorized Balance</p>
              <p className="text-lg font-extrabold text-white tabular-nums">$15,236.00</p>
            </div>
            <div className="pt-1 flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Spending Guard: Auto-Checkout</span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Error Boundary for GLTF Phone Loading
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Graceful fallback to procedural metallic 3D phone model
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function PhoneAssembly({
  hasCustomModel,
  cardsOpacityRef,
}: {
  hasCustomModel: boolean;
  cardsOpacityRef: React.MutableRefObject<number>;
}) {
  if (!hasCustomModel) {
    return <ProceduralPhone cardsOpacityRef={cardsOpacityRef} />;
  }

  return (
    <ModelErrorBoundary fallback={<ProceduralPhone cardsOpacityRef={cardsOpacityRef} />}>
      <Suspense fallback={<ProceduralPhone cardsOpacityRef={cardsOpacityRef} />}>
        <GLTFPhone />
      </Suspense>
    </ModelErrorBoundary>
  );
}

interface SceneProps {
  progressRef: React.MutableRefObject<number>;
  presetAngle?: 'isometric' | 'floating' | 'flat';
}

function Scene({ progressRef, presetAngle = 'isometric' }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cardsOpacityRef = useRef<number>(1);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { camera } = useThree();
  const [hasCustomModel, setHasCustomModel] = useState(false);

  // Mouse parallax listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Check if /public/phone.glb exists so we don't throw 404 unhandled rejections
  useEffect(() => {
    fetch('/phone.glb', { method: 'HEAD' })
      .then((res) => {
        if (res.ok && res.status === 200) {
          setHasCustomModel(true);
        }
      })
      .catch(() => setHasCustomModel(false));
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = Math.min(Math.max(progressRef.current || 0, 0), 1);

    // Preset base rotations
    let baseRotX = 8 * (Math.PI / 180);
    let baseRotY = -22 * (Math.PI / 180);
    let baseRotZ = 3 * (Math.PI / 180);

    if (presetAngle === 'floating') {
      baseRotX = 4 * (Math.PI / 180);
      baseRotY = -12 * (Math.PI / 180);
      baseRotZ = 1 * (Math.PI / 180);
    } else if (presetAngle === 'flat') {
      baseRotX = 0;
      baseRotY = 0;
      baseRotZ = 0;
    }

    // Gentle mouse parallax active during Stage 1 (0 to 30%)
    const parallaxFactor = Math.max(0, 1 - p / 0.3);
    const mouseRotX = -mouseRef.current.y * 0.06 * parallaxFactor;
    const mouseRotY = mouseRef.current.x * 0.09 * parallaxFactor;

    let targetX = 1.60;
    let targetY = 0.08;
    let targetZ = 0.0;
    let targetRotX = baseRotX + mouseRotX;
    let targetRotY = baseRotY + mouseRotY;
    let targetRotZ = baseRotZ;
    let targetScale = 0.95;
    let targetCamZ = 5.6;
    let cardOpacity = 1.0;

    if (p <= 0.3) {
      // 0-30%: phone tilted right, headline visible, cards full opacity
      const t = p / 0.3;
      targetX = THREE.MathUtils.lerp(1.60, 1.45, t);
      targetY = THREE.MathUtils.lerp(0.08, 0.05, t);
      targetRotX = baseRotX + mouseRotX;
      targetRotY = baseRotY + mouseRotY;
      targetRotZ = baseRotZ;
      targetScale = 0.95;
      targetCamZ = 5.6;
      cardOpacity = 1.0 - t * 0.15;
    } else if (p <= 0.6) {
      // 30-60%: phone rotates to face camera and scales up 1.4x, headline fades out
      const t = (p - 0.3) / 0.3;
      const ease = t * t * (3 - 2 * t);
      targetX = THREE.MathUtils.lerp(1.45, 0.0, ease);
      targetY = THREE.MathUtils.lerp(0.05, 0.0, ease);
      targetRotX = THREE.MathUtils.lerp(baseRotX, 0.0, ease);
      targetRotY = THREE.MathUtils.lerp(baseRotY, 0.0, ease);
      targetRotZ = THREE.MathUtils.lerp(baseRotZ, 0.0, ease);
      targetScale = THREE.MathUtils.lerp(0.95, 1.35, ease);
      targetCamZ = THREE.MathUtils.lerp(5.6, 5.0, ease);
      cardOpacity = THREE.MathUtils.lerp(0.85, 0.0, ease);
    } else {
      // 60-100%: camera pushes into screen, bezel zooms past viewport, Command Center fades in
      const t = (p - 0.6) / 0.4;
      const ease = t * t;
      targetX = 0.0;
      targetY = 0.0;
      targetRotX = 0.0;
      targetRotY = 0.0;
      targetRotZ = 0.0;
      targetScale = THREE.MathUtils.lerp(1.35, 3.5, ease);
      targetCamZ = THREE.MathUtils.lerp(5.0, 2.1, ease);
      cardOpacity = 0.0;
    }

    cardsOpacityRef.current = cardOpacity;

    // 60fps buttery smooth lerp interpolation without triggering React re-renders
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.09);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.09);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.09);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.09);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.09);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, 0.09);

    const nextScale = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.09);
    groupRef.current.scale.set(nextScale, nextScale, nextScale);

    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.09);
  });

  return (
    <>
      {/* Lighting & Environment */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 6]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.5} color="#0070BA" />

      <Environment preset="city" />

      {/* Floating 3D Phone Assembly */}
      <Float speed={1.4} rotationIntensity={0.06} floatIntensity={0.18}>
        <group ref={groupRef}>
          <PhoneAssembly hasCustomModel={hasCustomModel} cardsOpacityRef={cardsOpacityRef} />
        </group>
      </Float>

      {/* Ground Contact Shadow with PayPal Navy/Blue Tint */}
      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={0.55}
        scale={8}
        blur={2.2}
        far={3.2}
        color="#002C6C"
      />
    </>
  );
}

interface Hero3DCanvasProps {
  progressRef: React.MutableRefObject<number>;
  presetAngle?: 'isometric' | 'floating' | 'flat';
}

export default function Hero3DCanvas({ progressRef, presetAngle = 'isometric' }: Hero3DCanvasProps) {
  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        camera={{ position: [0, 0, 5.6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene progressRef={progressRef} presetAngle={presetAngle} />
      </Canvas>
    </div>
  );
}

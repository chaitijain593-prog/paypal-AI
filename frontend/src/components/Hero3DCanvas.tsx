'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  Float,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { CheckCircle2, ShieldCheck, Sparkles, Cpu, Zap, Lock, ShieldAlert } from 'lucide-react';
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

// 3D Swirling Particle Nebula / Constellation Mesh
function ParticleNebula() {
  const count = 320;
  const meshRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const baseColor1 = new THREE.Color('#38BDF8'); // Cyan
    const baseColor2 = new THREE.Color('#0070BA'); // PayPal Blue
    const baseColor3 = new THREE.Color('#FFC43A'); // Gold accent

    for (let i = 0; i < count; i++) {
      const radius = 2.0 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (radius * Math.sin(phi) * Math.sin(theta)) * 0.9;
      pos[i * 3 + 2] = radius * Math.cos(phi) * 0.8;

      const choice = Math.random();
      const c = choice > 0.8 ? baseColor3 : choice > 0.4 ? baseColor1 : baseColor2;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.04;
    meshRef.current.rotation.x = Math.sin(t * 0.03) * 0.08;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Holographic Security Laser Scan Line (Sweeps across the phone glass)
function HolographicLaserScanner({ isExploded }: { isExploded: boolean }) {
  const scannerRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!scannerRef.current) return;
    const t = state.clock.getElapsedTime();
    // Sweeps up and down along the phone screen height (-1.25 to +1.25)
    const yPos = Math.sin(t * 2.2) * 1.25;
    scannerRef.current.position.y = yPos;
  });

  const zDepth = isExploded ? 0.22 : 0.095;

  return (
    <group ref={scannerRef} position={[0, 0, zDepth]}>
      {/* Primary Laser Line */}
      <mesh>
        <boxGeometry args={[1.32, 0.02, 0.005]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.9} />
      </mesh>
      {/* Volumetric Glowing Sheen Band */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[1.32, 0.22]} />
        <meshBasicMaterial
          color="#0284C7"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Dual Electromagnetic Firewall Shockwave Rings
function ShockwaveRings({ triggerPulse }: { triggerPulse: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pulseAge = useRef(999);

  useEffect(() => {
    if (triggerPulse > 0) {
      pulseAge.current = 0;
    }
  }, [triggerPulse]);

  useFrame((_, delta) => {
    if (pulseAge.current < 1.5) {
      pulseAge.current += delta;
      const progress = pulseAge.current / 1.5;
      const scale = 1.0 + progress * 3.8;
      const opacity = Math.max(0, 1.0 - progress);

      if (ringRef.current) {
        ringRef.current.scale.set(scale, scale, scale);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.8;
      }
      if (ring2Ref.current) {
        const scale2 = 1.0 + progress * 4.4;
        ring2Ref.current.scale.set(scale2, scale2, scale2);
        (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
      }
    } else {
      if (ringRef.current) {
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      }
      if (ring2Ref.current) {
        (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  });

  return (
    <group position={[0, 0, 0.1]}>
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <ringGeometry args={[1.3, 1.34, 48]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[1.4, 1.45, 48]} />
        <meshBasicMaterial color="#0070BA" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Procedural 3D Phone with Exploded CAD Architecture Mode
function ExplodablePhone({
  cardsOpacityRef,
  isExploded,
}: {
  cardsOpacityRef: React.MutableRefObject<number>;
  isExploded: boolean;
}) {
  const phoneWidth = 1.40;
  const phoneHeight = 2.74;
  const cornerRadius = 0.16;

  // Outer titanium frame
  const bodyGeometry = useMemo(() => {
    const shape = createRoundedRectShape(phoneWidth, phoneHeight, cornerRadius);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.085,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.022,
      bevelThickness: 0.022,
    });
    geom.center();
    return geom;
  }, []);

  // Screen frame geometry
  const screenBackdropGeometry = useMemo(() => {
    const shape = createRoundedRectShape(1.36, 2.70, 0.13);
    const geom = new THREE.ShapeGeometry(shape);
    geom.center();
    return geom;
  }, []);

  // Inner Silicon Logic Board (visible in exploded mode)
  const logicBoardGeometry = useMemo(() => {
    const shape = createRoundedRectShape(1.28, 2.58, 0.10);
    const geom = new THREE.ShapeGeometry(shape);
    geom.center();
    return geom;
  }, []);

  // Camera plateau
  const cameraPlateauGeom = useMemo(() => {
    const shape = createRoundedRectShape(0.48, 0.52, 0.10);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    });
    geom.center();
    return geom;
  }, []);

  const lensRingGeom = useMemo(() => new THREE.CylinderGeometry(0.085, 0.085, 0.025, 24), []);
  const lensGlassGeom = useMemo(() => new THREE.CylinderGeometry(0.075, 0.075, 0.027, 24), []);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const proofBadgeRef = useRef<HTMLDivElement>(null);

  // Group refs for exploded Z-translation
  const chassisGroupRef = useRef<THREE.Group>(null);
  const logicBoardGroupRef = useRef<THREE.Group>(null);
  const screenGroupRef = useRef<THREE.Group>(null);
  const frontCardGroupRef = useRef<THREE.Group>(null);
  const backCardGroupRef = useRef<THREE.Group>(null);
  const chipCoreRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    // Exploded Z-offsets
    const targetChassisZ = isExploded ? -0.42 : 0.0;
    const targetBoardZ = isExploded ? -0.16 : 0.01;
    const targetScreenZ = isExploded ? 0.20 : 0.068;
    const targetFrontCardZ = isExploded ? 0.72 : 0.38;
    const targetBackCardZ = isExploded ? -0.65 : -0.18;

    if (chassisGroupRef.current) {
      chassisGroupRef.current.position.z = THREE.MathUtils.damp(
        chassisGroupRef.current.position.z,
        targetChassisZ,
        5.0,
        dt
      );
    }
    if (logicBoardGroupRef.current) {
      logicBoardGroupRef.current.position.z = THREE.MathUtils.damp(
        logicBoardGroupRef.current.position.z,
        targetBoardZ,
        5.0,
        dt
      );
    }
    if (screenGroupRef.current) {
      screenGroupRef.current.position.z = THREE.MathUtils.damp(
        screenGroupRef.current.position.z,
        targetScreenZ,
        5.0,
        dt
      );
    }
    if (frontCardGroupRef.current) {
      frontCardGroupRef.current.position.z = THREE.MathUtils.damp(
        frontCardGroupRef.current.position.z,
        targetFrontCardZ,
        5.0,
        dt
      );
    }
    if (backCardGroupRef.current) {
      backCardGroupRef.current.position.z = THREE.MathUtils.damp(
        backCardGroupRef.current.position.z,
        targetBackCardZ,
        5.0,
        dt
      );
    }

    // Pulse the silicon cryptographic chip when exploded
    if (chipCoreRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = 1.0 + Math.sin(t * 4.0) * 0.08;
      chipCoreRef.current.scale.set(pulse, pulse, pulse);
    }

    // Card opacity damping
    const targetOp = cardsOpacityRef.current ?? 1;
    const op = targetOp;
    if (frontCardRef.current) {
      frontCardRef.current.style.opacity = String(op);
    }
    if (backCardRef.current) {
      backCardRef.current.style.opacity = String(op * 0.9);
    }
    if (proofBadgeRef.current) {
      proofBadgeRef.current.style.opacity = String(op);
    }
  });

  return (
    <group>
      {/* LAYER 1: Titanium Rear Chassis + Camera Module */}
      <group ref={chassisGroupRef}>
        <mesh geometry={bodyGeometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#1e2638"
            metalness={0.92}
            roughness={0.20}
            clearcoat={0.65}
            clearcoatRoughness={0.15}
            reflectivity={0.95}
            envMapIntensity={2.5}
          />
        </mesh>

        {/* Rear Camera Island */}
        <group position={[-0.34, 0.88, -0.065]}>
          <mesh geometry={cameraPlateauGeom} castShadow>
            <meshPhysicalMaterial
              color="#182030"
              metalness={0.88}
              roughness={0.22}
              envMapIntensity={2.0}
            />
          </mesh>
          <mesh geometry={lensRingGeom} position={[-0.11, 0.12, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh geometry={lensGlassGeom} position={[-0.11, 0.12, -0.022]} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#020617" />
          </mesh>
          <mesh geometry={lensRingGeom} position={[-0.11, -0.12, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh geometry={lensGlassGeom} position={[-0.11, -0.12, -0.022]} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#020617" />
          </mesh>
          <mesh geometry={lensRingGeom} position={[0.12, 0.0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh geometry={lensGlassGeom} position={[0.12, 0.0, -0.022]} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#020617" />
          </mesh>
        </group>
      </group>

      {/* LAYER 2: Cryptographic Silicon Logic Board (Exploded View) */}
      <group ref={logicBoardGroupRef}>
        <mesh geometry={logicBoardGeometry} position={[0, 0, 0]}>
          <meshStandardMaterial
            color="#082f49"
            metalness={0.85}
            roughness={0.35}
            wireframe={isExploded}
          />
        </mesh>

        {/* Central Luminous SHA-256 Silicon Chip */}
        <mesh ref={chipCoreRef} position={[0, 0.2, 0.015]}>
          <boxGeometry args={[0.38, 0.38, 0.02]} />
          <meshStandardMaterial
            color="#0284C7"
            emissive="#0284C7"
            emissiveIntensity={isExploded ? 2.5 : 0.4}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Chip Label in 3D Space */}
        {isExploded && (
          <Html position={[0, 0.2, 0.06]} transform distanceFactor={1.6} className="pointer-events-none select-none">
            <div className="px-2 py-0.5 rounded bg-black/80 border border-cyan-400 text-[9px] font-mono font-bold text-cyan-300 whitespace-nowrap shadow-lg">
              PAYPAL CRYPTO ENGINE // SHA-256
            </div>
          </Html>
        )}
      </group>

      {/* LAYER 3: Main OLED Screen & Interactive Web View */}
      <group ref={screenGroupRef}>
        <mesh geometry={screenBackdropGeometry}>
          <meshStandardMaterial
            color="#030712"
            roughness={0.05}
            metalness={0.8}
          />
        </mesh>

        {/* Live Interactive Fintech UI via drei <Html transform> */}
        <Html
          transform
          distanceFactor={1.6}
          position={[0, 0, 0.003]}
          className="w-[335px] h-[670px] pointer-events-auto rounded-[34px] overflow-hidden shadow-2xl"
        >
          <PhoneScreenContent />
        </Html>

        {/* Sweeping Holographic Laser Scanner Line */}
        <HolographicLaserScanner isExploded={isExploded} />
      </group>

      {/* LAYER 4: Exploded Floating Front Card: Dispute Rebuttal */}
      <group ref={frontCardGroupRef} position={[-0.44, -0.46, 0.38]}>
        <Html
          transform
          distanceFactor={1.6}
          className="pointer-events-none transition-all duration-300"
        >
          <div
            ref={frontCardRef}
            className="w-[220px] rounded-2xl bg-[#0B132B]/95 border border-[#38BDF8]/50 p-4 shadow-2xl backdrop-blur-2xl ring-1 ring-cyan-500/20"
            style={{
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.95), 0 0 35px rgba(14, 165, 233, 0.45)',
            }}
          >
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/60 mx-auto flex items-center justify-center text-emerald-400 shadow-inner">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-wider text-emerald-400">
                  Dispute Rebuttal Won
                </p>
                <h3 className="text-sm font-bold text-white mt-0.5">Payment Confirmed</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Authentic Carrier GPS + Signed Proof
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.08] border border-white/[0.14] text-left text-xs flex justify-between items-center text-slate-200">
                <span className="text-slate-300">Protected Balance:</span>
                <span className="font-extrabold text-white tabular-nums text-sm">$1,249.99</span>
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* LAYER 5: Exploded Floating Back Card: Buyer AI Agent */}
      <group ref={backCardGroupRef} position={[0.54, 0.58, -0.18]}>
        <Html
          transform
          distanceFactor={1.6}
          className="pointer-events-none transition-all duration-300 hidden sm:block"
        >
          <div
            ref={backCardRef}
            className="w-[215px] rounded-2xl bg-[#0B132B]/90 border border-white/[0.16] p-3.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10"
            style={{
              boxShadow: '0 25px 45px -10px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.25)',
            }}
          >
            <div className="rounded-xl p-2.5 bg-white/[0.04] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-slate-300">
                <span>BUYER AI AGENT</span>
                <span className="text-[#38BDF8]">AGENT #409</span>
              </div>
              <div>
                <p className="text-[9.5px] text-slate-400">Pre-Authorized Balance</p>
                <p className="text-base font-extrabold text-white tabular-nums">$15,236.00</p>
              </div>
              <div className="pt-0.5 flex items-center gap-1.5 text-[9.5px] font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Spending Guard: Auto-Checkout</span>
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* Floating Holographic Proof Chip */}
      <group position={[0.38, -0.22, isExploded ? 0.82 : 0.44]}>
        <Html
          transform
          distanceFactor={1.6}
          className="pointer-events-none transition-all duration-300 hidden md:block"
        >
          <div
            ref={proofBadgeRef}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0284C7]/30 border border-cyan-400/60 text-white shadow-xl backdrop-blur-md"
            style={{
              boxShadow: '0 12px 30px rgba(2, 132, 199, 0.5)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFC43A] animate-spin" />
            <span className="text-[10px] font-mono font-bold tracking-tight text-cyan-200">
              SHA-256 Merkle Proof Verified
            </span>
          </div>
        </Html>
      </group>
    </group>
  );
}

interface SceneProps {
  progressRef: React.MutableRefObject<number>;
  presetAngle?: 'isometric' | 'floating' | 'flat';
  isExploded?: boolean;
  triggerSpin?: number;
  triggerPulse?: number;
}

function Scene({
  progressRef,
  presetAngle = 'isometric',
  isExploded = false,
  triggerSpin = 0,
  triggerPulse = 0,
}: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cardsOpacityRef = useRef<number>(1);
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseSmoothRef = useRef({ x: 0, y: 0 });
  const scrollSmoothRef = useRef(0);
  const targetSpinAngleRef = useRef(0);
  const currentSpinAngleRef = useRef(0);
  const prevSpinTriggerRef = useRef(triggerSpin);
  const { camera } = useThree();

  // Mouse parallax listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseTargetRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTargetRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Listen for 360 Spin Trigger - adds full 360 deg (+2*PI rad)
  useEffect(() => {
    if (triggerSpin > prevSpinTriggerRef.current) {
      targetSpinAngleRef.current += Math.PI * 2;
      prevSpinTriggerRef.current = triggerSpin;
    }
  }, [triggerSpin]);

  // Liquid 60/120fps physics loop with delta-time dampening
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    // 1. Inertial Damped Mouse Tracking
    mouseSmoothRef.current.x = THREE.MathUtils.damp(mouseSmoothRef.current.x, mouseTargetRef.current.x, 5.0, dt);
    mouseSmoothRef.current.y = THREE.MathUtils.damp(mouseSmoothRef.current.y, mouseTargetRef.current.y, 5.0, dt);

    // 2. Smooth Scroll Damping (absorbs mouse wheel notches)
    const rawProgress = Math.min(Math.max(progressRef.current || 0, 0), 1);
    scrollSmoothRef.current = THREE.MathUtils.damp(scrollSmoothRef.current, rawProgress, 4.8, dt);
    const p = scrollSmoothRef.current;

    // 3. Preset Base Rotations
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

    // 4. Subtle Parallax and Zero-G Floating Oscillation
    const time = state.clock.getElapsedTime();
    const idleY = Math.sin(time * 1.6) * 0.035;
    const idleRotX = Math.cos(time * 1.2) * 0.015;
    const idleRotY = Math.sin(time * 0.9) * 0.015;

    const parallaxFactor = Math.max(0, 1 - p / 0.3);
    const mouseRotX = -mouseSmoothRef.current.y * 0.09 * parallaxFactor;
    const mouseRotY = mouseSmoothRef.current.x * 0.14 * parallaxFactor;

    // 5. Spin Damping (Smooth continuous 360 spin animation)
    currentSpinAngleRef.current = THREE.MathUtils.damp(
      currentSpinAngleRef.current,
      targetSpinAngleRef.current,
      4.2,
      dt
    );
    const spinAngle = currentSpinAngleRef.current;

    let targetX = 0.15;
    let targetY = 0.0;
    let targetZ = 0.0;
    let targetRotX = baseRotX + mouseRotX;
    let targetRotY = baseRotY + mouseRotY + spinAngle;
    let targetRotZ = baseRotZ;
    let targetScale = isExploded ? 0.92 : 1.0;
    let targetCamZ = isExploded ? 5.8 : 5.2;
    let cardOpacity = 1.0;

    if (p <= 0.3) {
      const t = p / 0.3;
      targetX = THREE.MathUtils.lerp(0.15, 0.08, t);
      targetY = 0.0;
      targetRotX = baseRotX + mouseRotX;
      targetRotY = baseRotY + mouseRotY + spinAngle;
      targetRotZ = baseRotZ;
      targetScale = isExploded ? 0.92 : 1.0;
      targetCamZ = isExploded ? 5.8 : 5.2;
      cardOpacity = 1.0 - t * 0.15;
    } else if (p <= 0.6) {
      const t = (p - 0.3) / 0.3;
      const ease = t * t * (3 - 2 * t);
      targetX = THREE.MathUtils.lerp(0.08, 0.0, ease);
      targetY = 0.0;
      targetRotX = THREE.MathUtils.lerp(baseRotX, 0.0, ease);
      targetRotY = THREE.MathUtils.lerp(baseRotY, 0.0, ease);
      targetRotZ = THREE.MathUtils.lerp(baseRotZ, 0.0, ease);
      targetScale = THREE.MathUtils.lerp(1.0, 1.25, ease);
      targetCamZ = THREE.MathUtils.lerp(5.2, 4.6, ease);
      cardOpacity = THREE.MathUtils.lerp(0.85, 0.0, ease);
    } else {
      const t = (p - 0.6) / 0.4;
      const ease = t * t;
      targetX = 0.0;
      targetY = 0.0;
      targetRotX = 0.0;
      targetRotY = 0.0;
      targetRotZ = 0.0;
      targetScale = THREE.MathUtils.lerp(1.25, 3.2, ease);
      targetCamZ = THREE.MathUtils.lerp(4.6, 2.2, ease);
      cardOpacity = 0.0;
    }

    cardsOpacityRef.current = cardOpacity;

    // Apply delta-time spring dampening to all 3D transforms
    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 5.5, dt);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY + idleY, 5.5, dt);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 5.5, dt);

    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX + idleRotX, 5.5, dt);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY + idleRotY, 5.5, dt);
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetRotZ, 5.5, dt);

    const currentScale = groupRef.current.scale.x;
    const nextScale = THREE.MathUtils.damp(currentScale, targetScale, 5.5, dt);
    groupRef.current.scale.set(nextScale, nextScale, nextScale);

    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 5.5, dt);
  });

  return (
    <>
      {/* Cinematic Studio Lighting: Key, Rim, and Fill */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 6]} intensity={2.4} castShadow />
      <directionalLight position={[-6, 4, 3]} intensity={1.8} color="#38BDF8" />
      <directionalLight position={[-2, -3, -2]} intensity={0.9} color="#0070BA" />

      {/* Studio Environment Map */}
      <Environment preset="city" />

      {/* Floating 3D Particle Swarm */}
      <ParticleNebula />

      {/* Electromagnetic Firewall Shockwave Rings */}
      <ShockwaveRings triggerPulse={triggerPulse} />

      {/* Floating 3D Phone Assembly */}
      <Float speed={1.3} rotationIntensity={0.05} floatIntensity={0.14}>
        <group ref={groupRef}>
          <ExplodablePhone
            cardsOpacityRef={cardsOpacityRef}
            isExploded={isExploded}
          />
        </group>
      </Float>

      {/* Ground Contact Shadow */}
      <ContactShadows
        position={[0, -1.82, 0]}
        opacity={0.65}
        scale={7.5}
        blur={2.4}
        far={3.8}
        color="#001838"
      />
    </>
  );
}

interface Hero3DCanvasProps {
  progressRef: React.MutableRefObject<number>;
  presetAngle?: 'isometric' | 'floating' | 'flat';
  isExploded?: boolean;
  triggerSpin?: number;
  triggerPulse?: number;
}

export default function Hero3DCanvas({
  progressRef,
  presetAngle = 'isometric',
  isExploded = false,
  triggerSpin = 0,
  triggerPulse = 0,
}: Hero3DCanvasProps) {
  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <Scene
          progressRef={progressRef}
          presetAngle={presetAngle}
          isExploded={isExploded}
          triggerSpin={triggerSpin}
          triggerPulse={triggerPulse}
        />
      </Canvas>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, Shield, Sparkles, Zap } from 'lucide-react';

interface OrbPortalProps {
  onEnter: () => void;
}

export default function OrbPortal({ onEnter }: OrbPortalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEntering, setIsEntering] = useState(false);

  // Keydown listener for Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isEntering) {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEntering]);

  const handleEnter = () => {
    setIsEntering(true);
    setTimeout(() => {
      onEnter();
    }, 600); // Allow exit transition to animate
  };

  // Full-viewport Three.js WebGL Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 1. Central Geodesic Shield Core
    const coreGeo = new THREE.IcosahedronGeometry(1.8, 2);
    const coreWire = new THREE.WireframeGeometry(coreGeo);
    const coreMat = new THREE.LineBasicMaterial({
      color: 0x0090e0,
      transparent: true,
      opacity: 0.75,
    });
    const coreMesh = new THREE.LineSegments(coreWire, coreMat);
    worldGroup.add(coreMesh);

    // 2. Inner Glowing Core
    const innerGeo = new THREE.IcosahedronGeometry(1.0, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    worldGroup.add(innerMesh);

    // 3. Dual Orbital Energy Rings
    const ring1Geo = new THREE.TorusGeometry(2.6, 0.02, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x0070ba,
      transparent: true,
      opacity: 0.5,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    worldGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(3.1, 0.02, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xffc43a,
      transparent: true,
      opacity: 0.45,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    worldGroup.add(ring2);

    // 4. Surrounding Cryptographic Constellation Particles
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const r = 2.4 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    worldGroup.add(particleSystem);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      worldGroup.rotation.y = targetX * 0.7 + elapsedTime * 0.12;
      worldGroup.rotation.x = -targetY * 0.7 + Math.sin(elapsedTime * 0.25) * 0.08;

      coreMesh.rotation.y += 0.003;
      coreMesh.rotation.x += 0.002;
      innerMesh.rotation.y -= 0.004;

      ring1.rotation.z += 0.006;
      ring2.rotation.z -= 0.005;

      particleSystem.rotation.y -= 0.001;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeo.dispose();
      innerGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      particleGeo.dispose();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isEntering ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-[#060A14] flex flex-col justify-between items-center py-10 px-6 overflow-hidden select-none"
    >
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 pointer-events-auto cursor-grab active:cursor-grabbing"
      />

      {/* Ambient Cosmic Background Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(0,112,186,0.18),transparent_65%)]" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#06B6D4]/15 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP: Subtitle Pill */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-500/30 text-xs font-semibold text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-md"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        PayPal AI Hackathon 2026 · Official Entry
      </motion.div>

      {/* CENTER: Project Name & Typography */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative z-10 text-center space-y-3 pointer-events-none my-auto"
      >
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-[0_10px_35px_rgba(0,112,186,0.5)]">
          PaySentinel{' '}
          <span className="bg-gradient-to-r from-[#0090E0] via-[#06B6D4] to-[#FFC43A] bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-base sm:text-xl font-medium text-slate-300 max-w-xl mx-auto tracking-wide">
          Verifiable Agentic Commerce & Deterministic Dispute Firewall
        </p>
      </motion.div>

      {/* BOTTOM: Interactive Enter Command Center Prompt */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 flex flex-col items-center gap-3.5 pb-4"
      >
        <button
          onClick={handleEnter}
          disabled={isEntering}
          className="group relative flex items-center gap-3.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0070BA] via-[#0090E0] to-[#06B6D4] hover:from-[#005ea6] hover:to-[#0070BA] text-white font-extrabold text-sm sm:text-base shadow-[0_10px_35px_rgba(0,112,186,0.45)] hover:shadow-[0_15px_45px_rgba(6,182,212,0.5)] transition-all hover:scale-[1.03] active:scale-[0.98] border border-white/20"
        >
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/30 border border-white/25 font-mono text-xs text-cyan-200">
            <CornerDownLeft className="w-3.5 h-3.5" /> ENTER
          </span>
          <span>ENTER COMMAND CENTER</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-xs font-mono text-slate-400 tracking-wider">
          Press <span className="text-cyan-300 font-semibold">[Enter]</span> on your keyboard or click to launch
        </p>
      </motion.div>
    </motion.div>
  );
}

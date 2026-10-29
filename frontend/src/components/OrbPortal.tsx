'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface OrbPortalProps {
  onEnter: () => void;
}

export default function OrbPortal({ onEnter }: OrbPortalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEntering, setIsEntering] = useState(false);
  const isEnteringRef = useRef(false);

  // Trigger warp-in transition and enter command center
  const triggerEnter = () => {
    if (isEnteringRef.current) return;
    isEnteringRef.current = true;
    setIsEntering(true);
    setTimeout(() => {
      onEnter();
    }, 700);
  };

  // Keyboard listener for Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock background scrolling while portal is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Three.js 3D Orb Scene
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
    camera.position.z = 6.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 1. Outer Geodesic Cryptographic Shield
    const outerGeo = new THREE.IcosahedronGeometry(2.0, 2);
    const outerWire = new THREE.WireframeGeometry(outerGeo);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0x0090e0,
      transparent: true,
      opacity: 0.8,
    });
    const outerMesh = new THREE.LineSegments(outerWire, outerMat);
    worldGroup.add(outerMesh);

    // 2. Vertex Node Points on Shield
    const nodeMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.08,
      transparent: true,
      opacity: 0.95,
    });
    const nodePoints = new THREE.Points(outerGeo, nodeMat);
    worldGroup.add(nodePoints);

    // 3. Inner Pulsating Energy Core
    const innerGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    worldGroup.add(innerMesh);

    // 4. Central Radiant Plasma Sphere
    const plasmaGeo = new THREE.SphereGeometry(0.65, 32, 32);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: 0x0070ba,
      transparent: true,
      opacity: 0.6,
    });
    const plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    worldGroup.add(plasmaMesh);

    // 5. Dual Orbital Energy Rings (Sapphire + PayPal Gold)
    const ring1Geo = new THREE.TorusGeometry(2.8, 0.022, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x0070ba,
      transparent: true,
      opacity: 0.65,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 8;
    worldGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(3.3, 0.022, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xffc43a,
      transparent: true,
      opacity: 0.55,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 3.5;
    ring2.rotation.y = -Math.PI / 6;
    worldGroup.add(ring2);

    // 6. Constellation Stardust Particles
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2.4 + Math.random() * 4.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.035,
      transparent: true,
      opacity: 0.85,
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

      // Hyper-warp forward when entering
      if (isEnteringRef.current) {
        camera.position.z -= 0.16;
        worldGroup.rotation.y += 0.05;
        worldGroup.scale.multiplyScalar(1.02);
      } else {
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        worldGroup.rotation.y = targetX * 0.5 + elapsedTime * 0.14;
        worldGroup.rotation.x = -targetY * 0.5 + Math.sin(elapsedTime * 0.3) * 0.08;

        outerMesh.rotation.y += 0.003;
        nodePoints.rotation.y += 0.003;
        innerMesh.rotation.y -= 0.005;
        plasmaMesh.scale.setScalar(1 + Math.sin(elapsedTime * 2.5) * 0.08);

        ring1.rotation.z += 0.007;
        ring2.rotation.z -= 0.006;
        particleSystem.rotation.y -= 0.001;
      }

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
      outerGeo.dispose();
      innerGeo.dispose();
      plasmaGeo.dispose();
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
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      onClick={triggerEnter}
      className="fixed inset-0 z-[9999] bg-[#040711] flex flex-col justify-between items-center py-12 px-6 overflow-hidden select-none cursor-pointer"
    >
      {/* Fullscreen 3D WebGL Canvas Layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Cosmic Deep Radial Lighting Glows */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(0,112,186,0.22),transparent_70%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#06B6D4]/10 rounded-full blur-[160px] pointer-events-none" />

      {/* TOP: Project Name Only */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="relative z-10 text-center pointer-events-none mt-4 sm:mt-6"
      >
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-[0_0_45px_rgba(0,144,224,0.65)]">
          PaySentinel{' '}
          <span className="bg-gradient-to-r from-[#0090E0] via-[#06B6D4] to-[#FFC43A] bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-xs sm:text-sm font-mono tracking-[0.28em] text-cyan-400/80 uppercase mt-2 font-medium">
          Autonomous Fintech Defense Matrix
        </p>
      </motion.div>

      {/* CENTER: Dedicated Empty Space For The 3D Orb To Shine Unobstructed */}
      <div className="my-auto pointer-events-none" />

      {/* BOTTOM: Minimal Enter Command Center Prompt */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.7 }}
        className="relative z-10 flex flex-col items-center gap-3 mb-4 sm:mb-8"
      >
        <div
          className={`flex items-center gap-3 px-7 py-3.5 rounded-full bg-slate-900/80 border border-cyan-500/40 text-cyan-200 font-mono text-xs sm:text-sm tracking-wider uppercase backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all ${
            isEntering
              ? 'scale-110 border-cyan-300 text-white shadow-[0_0_50px_rgba(6,182,212,0.6)]'
              : 'hover:border-cyan-400 hover:scale-105'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>PRESS</span>
          <kbd className="px-2.5 py-1 rounded-md bg-black/50 border border-cyan-400/50 text-white font-bold text-xs shadow-inner">
            ↵ ENTER
          </kbd>
          <span>TO ENTER COMMAND CENTER</span>
        </div>

        <p className="text-[11px] font-mono text-slate-500 tracking-widest uppercase">
          or click anywhere to initialize
        </p>
      </motion.div>
    </motion.div>
  );
}

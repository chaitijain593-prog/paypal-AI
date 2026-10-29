'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShieldCheck, Lock, Sparkles, Activity, RefreshCw } from 'lucide-react';

export default function ThreeSentinelScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shieldIntegrity, setShieldIntegrity] = useState(100);
  const [activeNode, setActiveNode] = useState<'merkle' | 'firewall' | 'paypal'>('merkle');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene Setup
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 6;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for mouse parallax
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 1. Central Geodesic Sphere (The Cryptographic Shield Core)
    const coreGeometry = new THREE.IcosahedronGeometry(1.6, 2);
    const coreWireframe = new THREE.WireframeGeometry(coreGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00a3ff,
      transparent: true,
      opacity: 0.65,
    });
    const coreMesh = new THREE.LineSegments(coreWireframe, lineMaterial);
    worldGroup.add(coreMesh);

    // Inner Glowing Solid Core
    const innerGeo = new THREE.IcosahedronGeometry(0.9, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    worldGroup.add(innerMesh);

    // 2. Holographic Orbiting Ring 1 (PayPal Blue & Cyan)
    const ring1Geo = new THREE.TorusGeometry(2.3, 0.025, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x0070ba,
      transparent: true,
      opacity: 0.7,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    worldGroup.add(ring1);

    // 3. Holographic Orbiting Ring 2 (Financial Gold)
    const ring2Geo = new THREE.TorusGeometry(2.7, 0.02, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xffc43a,
      transparent: true,
      opacity: 0.6,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    worldGroup.add(ring2);

    // 4. Floating Cryptographic Particles
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const c1 = new THREE.Color(0x06b6d4); // cyan
    const c2 = new THREE.Color(0xffc43a); // gold
    const c3 = new THREE.Color(0x0070ba); // paypal blue

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.0 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const chosenColor = Math.random() > 0.6 ? c2 : Math.random() > 0.5 ? c1 : c3;
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    worldGroup.add(particleSystem);

    // Mouse tracking with smooth damping
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      mouseX = (x / rect.width) * 2;
      mouseY = -(y / rect.height) * 2;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Damped mouse follow
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      worldGroup.rotation.y = targetX * 0.8 + elapsedTime * 0.15;
      worldGroup.rotation.x = -targetY * 0.8 + Math.sin(elapsedTime * 0.3) * 0.1;

      // Rotate sub-elements
      coreMesh.rotation.y += 0.003;
      coreMesh.rotation.x += 0.002;
      innerMesh.rotation.y -= 0.004;

      ring1.rotation.z += 0.007;
      ring2.rotation.z -= 0.005;
      ring2.rotation.x += 0.003;

      particleSystem.rotation.y -= 0.001;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeometry.dispose();
      innerGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      particleGeo.dispose();
    };
  }, []);

  return (
    <div
      className="relative w-full h-[480px] lg:h-[560px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B1426]/90 via-[#0E1A33]/80 to-[#122244]/80 border border-cyan-500/30 shadow-[0_15px_45px_rgba(0,112,186,0.25)] backdrop-blur-2xl group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing z-0" />

      {/* Subtle Grid Ambient Lighting */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.12),transparent_70%)]" />

      {/* Top Floating Telemetry Overlay */}
      <div className="absolute top-5 left-5 right-5 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-mono font-bold text-cyan-300">
            3D SENTINEL CORE · ONLINE
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 backdrop-blur-md text-xs font-mono text-slate-300">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Shield Integrity:</span>
          <span className="font-bold text-emerald-400">{shieldIntegrity}%</span>
        </div>
      </div>

      {/* Floating Interactive 3D Hologram Nodes */}
      <div className="absolute bottom-6 left-6 right-6 z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pointer-events-auto">
        {/* Node 1: Merkle Proofs */}
        <button
          onClick={() => setActiveNode('merkle')}
          className={`p-3.5 rounded-2xl text-left transition-all border backdrop-blur-xl ${
            activeNode === 'merkle'
              ? 'bg-cyan-950/70 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
              Merkle Root
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-white truncate">SHA-256 Proof Chain</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            9b2e8f...c4a1d7
          </p>
        </button>

        {/* Node 2: Firewall */}
        <button
          onClick={() => setActiveNode('firewall')}
          className={`p-3.5 rounded-2xl text-left transition-all border backdrop-blur-xl ${
            activeNode === 'firewall'
              ? 'bg-blue-950/70 border-[#0070BA]/60 shadow-[0_0_20px_rgba(0,112,186,0.3)]'
              : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-[#0090E0] uppercase tracking-wider font-bold">
              AI Firewall
            </span>
            <Lock className="w-3 h-3 text-emerald-400" />
          </div>
          <p className="text-xs font-bold text-white truncate">Untrusted Input Guard</p>
          <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
            0 Prompt Injections
          </p>
        </button>

        {/* Node 3: PayPal Sandbox Loop */}
        <button
          onClick={() => setActiveNode('paypal')}
          className={`p-3.5 rounded-2xl text-left transition-all border backdrop-blur-xl ${
            activeNode === 'paypal'
              ? 'bg-amber-950/70 border-[#FFC43A]/60 shadow-[0_0_20px_rgba(255,196,58,0.3)]'
              : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-[#FFC43A] uppercase tracking-wider font-bold">
              Orders v2
            </span>
            <Sparkles className="w-3 h-3 text-[#FFC43A]" />
          </div>
          <p className="text-xs font-bold text-white truncate">Agentic Commerce</p>
          <p className="text-[11px] text-amber-300 font-medium mt-0.5">
            Autonomous Settle
          </p>
        </button>
      </div>

      {/* Floating Center Hint */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
        <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-black/60 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
          Drag / Move mouse to rotate 3D Shield
        </span>
      </div>
    </div>
  );
}

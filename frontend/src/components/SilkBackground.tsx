'use client';

import { useEffect, useRef, useState } from 'react';

// ── Vertex shader: fullscreen triangle ────────────────────────────────────
const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// ── Fragment shader: "Silk" flow shader ───────────────────────────────────
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;
uniform vec4 u_shape;
uniform vec4 u_surface;
uniform vec4 u_finish;
uniform vec4 u_transform;
uniform vec4 u_space;
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  float s = t * 3.0;
  int i = int(floor(s));
  float f = fract(s);
  if (i == 0) return mixColour(u_colors[0], u_colors[1], f);
  if (i == 1) return mixColour(u_colors[1], u_colors[2], f);
  if (i == 2) return mixColour(u_colors[2], u_colors[3], f);
  return u_colors[3];
}

vec3 hueRotate(vec3 col, float a) {
  float ca = cos(a), sa = sin(a);
  mat3 m = mat3(
    0.213 + ca * 0.787 - sa * 0.213,
    0.715 - ca * 0.715 - sa * 0.715,
    0.072 - ca * 0.072 + sa * 0.928,
    0.213 - ca * 0.213 + sa * 0.143,
    0.715 + ca * 0.285 + sa * 0.140,
    0.072 - ca * 0.072 - sa * 0.283,
    0.213 - ca * 0.213 - sa * 0.787,
    0.715 - ca * 0.715 + sa * 0.715,
    0.072 + ca * 0.928 + sa * 0.072
  );
  return clamp(m * col, 0.0, 1.0);
}

vec3 shade(vec2 uv, vec2 p, float t) {
  float w = sin(p.x * 2.4 + t * 0.6) * cos(p.y * 2.4 - t * 0.5);
  float w2 = sin(p.y * 3.2 - t * 0.4) * cos(p.x * 3.2 + t * 0.7);
  float field = (w + w2) * 0.5;
  field += fbm(p * 1.5 + vec2(t * 0.15, -t * 0.12)) * u_intensity;
  float c = (field + 1.0) * 0.5;
  return palette(c);
}

void main() {
  vec2 res = max(u_resolution.xy, vec2(1.0, 1.0));
  vec2 screenUv = gl_FragCoord.xy / res;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / max(min(res.x, res.y), 1.0);
  vec2 uv;

  if (u_cursorPresence > 0.001) {
    vec2 cursor = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float cursorDistance = length(p - cursor);
    float cursorRadius = max(u_cursorRadius, 0.001);
    float cursorMask = 1.0 - smoothstep(0.0, cursorRadius, cursorDistance);
    cursorMask *= u_cursorPresence;

    if (cursorMask > 0.0001) {
      vec2 cursorDelta = p - cursor;
      vec2 cursorDirection = cursorDistance > 0.0001 ? normalize(cursorDelta) : vec2(0.0);
      float cursorAngle = u_cursorStrength * cursorMask * 1.5;
      float cc = cos(cursorAngle), cs = sin(cursorAngle);
      p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
    }
  }

  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  p += u_offset;
  p += u_drift * vec2(sin(u_time * 0.2), cos(u_time * 0.15));

  vec3 col = shade(uv, p, u_time);
  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;

  float vd = length(screenUv - 0.5) * 1.41421356;
  col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);

  if (u_grain > 0.0001)
    col += (grainHash(gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(p));
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

interface SilkBackgroundProps {
  opacity?: number;
}

export default function SilkBackground({ opacity = 0.45 }: SilkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = createProgram(gl, vs, fs);
    if (!prog) return;
    gl.useProgram(prog);

    const posAttr = gl.getAttribLocation(prog, 'a_position');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const loc = {
      colors: gl.getUniformLocation(prog, 'u_colors'),
      scene: gl.getUniformLocation(prog, 'u_scene'),
      shape: gl.getUniformLocation(prog, 'u_shape'),
      surface: gl.getUniformLocation(prog, 'u_surface'),
      finish: gl.getUniformLocation(prog, 'u_finish'),
      transform: gl.getUniformLocation(prog, 'u_transform'),
      space: gl.getUniformLocation(prog, 'u_space'),
      cursor: gl.getUniformLocation(prog, 'u_cursor'),
    };

    // ── CALM, VIBRANT YET SWEET PAYPAL PALETTE ─
    // Midnight base, rich navy, iconic PayPal Royal Blue, and subtle cyan highlight
    const colors = new Float32Array([
      0.043, 0.065, 0.115, // #0B111D Deep Night
      0.055, 0.145, 0.285, // #0E2549 Rich Midnight Navy
      0.000, 0.439, 0.729, // #0070BA PayPal Royal Blue
      0.000, 0.612, 0.871, // #009CDE PayPal Light Blue / Cyan
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ]);
    gl.uniform3fv(loc.colors, colors);

    // Flowing silk curves with visible depth
    gl.uniform4f(loc.shape, 1.2, 0.38, 0.48, 0.0);
    gl.uniform4f(loc.surface, 2.2, 1.15, 0.02, 1.0);
    gl.uniform4f(loc.finish, 0.0, 0.2, 0.0, 0.03);
    gl.uniform4f(loc.transform, 1200.0, 0.0, 0.02, 0.0);

    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let cursorPresence = 0;
    let smoothPresence = 0;
    let rafId = 0;
    let running = true;

    const dpr = Math.min(devicePixelRatio || 1, 1.5);

    function resize() {
      const w = canvas!.clientWidth || window.innerWidth || 1280;
      const h = canvas!.clientHeight || window.innerHeight || 800;
      width = (w * dpr) | 0;
      height = (h * dpr) | 0;
      if (canvas!.width !== width || canvas!.height !== height) {
        canvas!.width = width;
        canvas!.height = height;
        gl!.viewport(0, 0, width, height);
      }
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      cursorPresence = 1;
    }
    function onPointerLeave() {
      cursorPresence = 0;
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', resize);
    resize();

    function onVisibility() {
      if (document.hidden) {
        running = false;
      } else {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    const startTime = performance.now();

    function frame(now: number) {
      if (!running) return;
      rafId = requestAnimationFrame(frame);

      resize();

      const elapsed = (now - startTime) / 1000;
      smoothPresence += (cursorPresence - smoothPresence) * 0.05;

      // Slow, smooth fluid flow (0.28 speed)
      gl!.uniform4f(loc.scene, width, height, elapsed * 0.28, 4.0);
      gl!.uniform4f(loc.space, 0.0, 0.0, mouseX, mouseY);
      gl!.uniform4f(loc.cursor, smoothPresence, 2.0, 0.35, 0.45);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'auto',
        display: 'block',
        opacity: opacity,
        transition: 'opacity 0.5s ease',
      }}
    />
  );
}

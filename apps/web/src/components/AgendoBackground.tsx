"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  center?: [number, number];   // UV 0..1
  radius?: number;             // 0.50..0.75 aprox (0.62 recomendado)
  ringWidth?: number;          // 0.04..0.10 (0.075 recomendado)
  softness?: number;           // 0.03..0.08 (0.055 recomendado)
  intensity?: number;          // 0.9..1.5
  speed?: number;              // 0.18..0.28
  breathAmp?: number;          // 0.01..0.03
  glowStrength?: number;       // 0.6..1.2
  vignette?: number;           // 0..1
  debug?: boolean;
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// ARO fino + glow violeta/magenta (más fuerte abajo)
const FRAG = /* glsl */ `
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_center;
uniform float u_radius;
uniform float u_ringWidth;
uniform float u_softness;
uniform float u_intensity;
uniform float u_breathSpeed;
uniform float u_breathAmp;
uniform float u_glowStrength;
uniform float u_vignette;

uniform vec3 uC1; // purpura suave base   (#7B6CFF linear)
uniform vec3 uC2; // turquesa        (#D073FF linear)
uniform vec3 uC3; // azul cielo   (#FFAE73 linear)

varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0., a=.5;
  for(int i=0;i<3;i++){ v+=a*noise(p); p*=2.; a*=.5; }
  return v;
}

vec2 aspectUV(vec2 uv, vec2 res){
  float asp = res.x / res.y;
  return vec2((uv.x - 0.5)*asp + 0.5, uv.y);
}

// anillo por diferencia: fino y suave
float ringThin(float d, float R, float w, float soft){
  float inner = smoothstep(R - w, R - w - soft, d);
  float outer = smoothstep(R + w + soft, R + w, d);
  return clamp(inner - outer, 0.0, 1.0);
}

void main(){
  vec2 res = u_resolution;
  vec2 uv = vUv;

  // corrige UV y también el centro
  vec2 cuv = aspectUV(uv, res);
  vec2 cc  = aspectUV(u_center, res);

  // respiración centrada
  float phase  = 0.5 + 0.5 * sin(u_time * u_breathSpeed);
  float breath = 1.0 + (phase - 0.5) * 2.0 * u_breathAmp;
  float R  = u_radius * breath;

  vec2  p = cuv - cc;
  float d = length(p);

  // grosor que se afina hacia arriba
  float y = clamp((uv.y - 0.35) / 0.3, 0.0, 1.0);   // 0 abajo → 1 arriba
  float wLocal = mix(u_ringWidth * 1.40, u_ringWidth * 0.000, y);
  float softLocal = mix(u_softness * 1.10, u_softness * 0.20, y);

  // sutil variación orgánica
  float rip = (fbm(uv*1.35 + vec2(0.0, u_time*0.05)) - 0.5) * 0.010;
  float rr  = R + rip;

  float ring = 1.0 - abs(d - rr) / (wLocal * 1.0);
  ring = smoothstep(0.0, 1.0, ring);
  ring = pow(ring, 1.0); // hace el aro más definido y brillante

  // brillo más fuerte abajo
  float bottomBoost = mix(1.40, 0.60, y);
  ring *= bottomBoost;

  // halos (interior/exterior) + haze
  float glowIn  = smoothstep(rr - 0.12, rr - 0.02, d);
  float glowOut = smoothstep(rr + 0.02, rr + 0.02, d);
  float haze    = smoothstep(rr + 0.28, rr + 0.04, d);

  // atenuaciones verticales (más abajo = más fuerte)
  glowIn  *= mix(1.10, 0.60, y);
  glowOut *= mix(1.30, 0.55, y);
  haze    *= mix(0.95, 0.45, y);

  // color
  vec3 coreCol  = mix(vec3(1.0), uC1, 0.25); // blanco con matiz violeta

  vec3 ringCol  = coreCol * ring;

  // Reducimos magenta y dejamos el glow más limpio
  vec3 haloCol  = mix(uC1, vec3(1.0), 0.2) * glowIn * 0.2;
  vec3 hazeCol  = uC1 * haze * 0.1;

  


  // vignette suave para integrar con el fondo
  float asp = res.x / res.y;
  vec2  vc  = vec2(asp*0.5, 0.5);
  float vig = smoothstep(1.25, 0.65, length(cuv - vc));
  vig = mix(1.0, vig, u_vignette);

  // composición (aditiva suave)
  vec3 col = vec3(0.0);
  col += ringCol * (1.05 * u_intensity);
  col += haloCol * (0.95 * u_intensity) * u_glowStrength;
  col += hazeCol * (0.70 * u_intensity);

  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToLinearRGB(hex: string): THREE.Color {
  const c = new THREE.Color(hex);
  c.convertSRGBToLinear();
  return c;
}

export default function AgendoBackground({
  center      = [0.5, 0.92],
  radius      = 0.62,
  ringWidth   = 0.075,
  softness    = 0.055,
  intensity   = 1.10,
  speed       = 0.20,
  breathAmp   = 0.015,
  glowStrength= 0.90,
  vignette    = 0.38,
  debug       = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const uniforms = useRef<any>(null);
  const initialProps = useRef({
    center,
    radius,
    ringWidth,
    softness,
    intensity,
    speed,
    breathAmp,
    glowStrength,
    vignette,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // === RENDERER ===
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    Object.assign(renderer.domElement.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "4",
      opacity: "0.88",
      mixBlendMode: "screen",
    });
    host.appendChild(renderer.domElement);

    // === SCENE ===
    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo    = new THREE.PlaneGeometry(2, 2);

    uniforms.current = {
      u_time:         { value: 0 },
      u_resolution:   { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_center:       { value: new THREE.Vector2(initialProps.current.center[0], initialProps.current.center[1]) },
      u_radius:       { value: initialProps.current.radius },
      u_ringWidth:    { value: initialProps.current.ringWidth },
      u_softness:     { value: initialProps.current.softness },
      u_intensity:    { value: initialProps.current.intensity },
      u_breathSpeed:  { value: initialProps.current.speed },
      u_breathAmp:    { value: initialProps.current.breathAmp },
      u_glowStrength: { value: initialProps.current.glowStrength },
      u_vignette:     { value: initialProps.current.vignette },

      // paleta (sRGB -> linear)
      uC1: { value: hexToLinearRGB("#A38BFF") }, // purpura suave
      uC2: { value: hexToLinearRGB("#34D2C2") }, // turquesa
      uC3: { value: hexToLinearRGB("#4F7FFF") }, // azul cielo
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: uniforms.current,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // === LOOP ===
    let raf = 0;
    let start = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (performance.now() - start) / 1000;
      uniforms.current.u_time.value = t;
      renderer.render(scene, camera);
    };
    loop();

    // === RESIZE ===
    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      uniforms.current.u_resolution.value.set(w, h);
    };
    window.addEventListener("resize", onResize);

    // === CLEANUP ===
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      scene.remove(mesh);
      geo.dispose(); mat.dispose(); renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []); // monta una vez (evita múltiples instancias)

  // props → uniforms (tiempo real)
  useEffect(() => {
    if (!uniforms.current) return;
    uniforms.current.u_center.value.set(center[0], center[1]);
    uniforms.current.u_radius.value       = radius;
    uniforms.current.u_ringWidth.value    = ringWidth;
    uniforms.current.u_softness.value     = softness;
    uniforms.current.u_intensity.value    = intensity;
    uniforms.current.u_breathSpeed.value  = speed;
    uniforms.current.u_breathAmp.value    = breathAmp;
    uniforms.current.u_glowStrength.value = glowStrength;
    uniforms.current.u_vignette.value     = vignette;
  }, [center, radius, ringWidth, softness, intensity, speed, breathAmp, glowStrength, vignette]);

  return (
    <>
      <div ref={hostRef} />
      {debug && (
        <div
          style={{
            position: "fixed",
            top: 8, left: 8,
            padding: "4px 8px",
            background: "rgba(20,20,20,.65)",
            color: "#9BE88D",
            borderRadius: 6,
            fontSize: 12,
            zIndex: 50
          }}
        >
          BG: WebGL · DEBUG
        </div>
      )}
    </>
  );
}

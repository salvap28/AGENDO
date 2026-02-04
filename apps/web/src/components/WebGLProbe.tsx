"use client";

import { useEffect, useRef } from "react";

export default function WebGLProbe() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current!;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const gl =
      (c.getContext("webgl2") as WebGL2RenderingContext) ||
      (c.getContext("webgl") as WebGLRenderingContext) ||
      (c.getContext("experimental-webgl") as WebGLRenderingContext);

    if (!gl) {
      console.error("[WebGLProbe] No WebGL context. Revisa flags del navegador / GPU drivers.");
      return;
    }

    // Info GPU
    try {
      // @ts-ignore
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      console.log("[WebGLProbe] GPU:", { vendor, renderer });
    } catch {}

    const vs = `
      attribute vec2 a;
      void main(){
        gl_Position = vec4(a, 0.0, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      void main(){
        vec2 uv = gl_FragCoord.xy / vec2(${window.innerWidth.toFixed(1)}, ${window.innerHeight.toFixed(1)});
        gl_FragColor = vec4(uv.x, uv.y, 0.3, 1.0);
      }
    `;

    const makeShader = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("[WebGLProbe] Shader compile error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vsh = makeShader(gl.VERTEX_SHADER, vs);
    const fsh = makeShader(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[WebGLProbe] Program link error:", gl.getProgramInfoLog(prog));
      return;
    }

    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // triángulo con coords clip-space
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([ -1,-1, 3,-1, -1,3 ]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    console.log("[WebGLProbe] OK: dibujado simple con WebGL.");
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none" }}
    />
  );
}

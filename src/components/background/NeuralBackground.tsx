"use client";

import React, { useEffect, useRef } from "react";

interface NodeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  isAccent: boolean;
}

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Cấu hình mạng lưới linh hoạt theo kích thước màn hình
    const getNodeConfig = (w: number) => {
      if (w <= 768) {
        // Mobile: tăng mật độ hạt và giữ hiệu năng mượt mà
        return { count: 140, maxDist: 115, mouseR: 150, lineAlphaFactor: 0.22 };
      }
      if (w <= 1024) {
        // Tablet / Small screen
        return { count: 240, maxDist: 145, mouseR: 180, lineAlphaFactor: 0.24 };
      }
      if (w <= 1600) {
        // Laptop & Desktop tiêu chuẩn: tăng số lượng nơ-ron dày đặc và liên kết phong phú
        return { count: 420, maxDist: 175, mouseR: 240, lineAlphaFactor: 0.25 };
      }
      // Màn hình lớn / 2K / 4K / Ultrawide: mạng lưới nơ-ron dày đặc toàn diện
      return { count: 550, maxDist: 185, mouseR: 260, lineAlphaFactor: 0.24 };
    };

    let cfg = getNodeConfig(width);
    let nodes: NodeParticle[] = [];

    const createNode = (): NodeParticle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.52,
      vy: (Math.random() - 0.5) * 0.52,
      radius: Math.random() * 1.6 + 1.2,
      baseAlpha: Math.random() * 0.45 + 0.35,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.025 + 0.015,
      isAccent: Math.random() < 0.2, // ~20% số hạt phát sáng nổi bật
    });

    const initNodes = (count: number) => {
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push(createNode());
      }
    };

    initNodes(cfg.count);

    const mouse = {
      x: -2000,
      y: -2000,
      active: false,
    };

    let mouseTimer: ReturnType<typeof setTimeout> | null = null;

    // Thiết lập kích thước canvas chuẩn sắc nét với màn hình High-DPI (Retina)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const newCfg = getNodeConfig(width);
      if (newCfg.count !== cfg.count) {
        cfg = newCfg;
        initNodes(cfg.count);
      }
    };

    resize();

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ("touches" in e) {
        if (e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          return;
        }
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      mouse.x = clientX;
      mouse.y = clientY;
      mouse.active = true;

      if (mouseTimer) clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        mouse.active = false;
      }, 2500);
    };

    const onPointerLeave = () => {
      mouse.active = false;
      mouse.x = -2000;
      mouse.y = -2000;
    };

    window.addEventListener("mousemove", onPointerMove, { passive: true });
    window.addEventListener("touchstart", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("resize", resize);

    // Vòng lặp render hiệu ứng
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const totalNodes = nodes.length;

      // Cập nhật vị trí hạt
      for (let i = 0; i < totalNodes; i++) {
        const node = nodes[i];

        node.pulsePhase += node.pulseSpeed;
        node.x += node.vx * (delta * 60);
        node.y += node.vy * (delta * 60);

        // Hiệu ứng tương tác với trỏ chuột (lực đẩy nhẹ êm dịu)
        if (mouse.active) {
          const dxMouse = node.x - mouse.x;
          const dyMouse = node.y - mouse.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

          if (distMouse < cfg.mouseR && distMouse > 0) {
            const force = (1 - distMouse / cfg.mouseR) * 1.6;
            const fx = (dxMouse / distMouse) * force;
            const fy = (dyMouse / distMouse) * force;
            node.x += fx;
            node.y += fy;
          }
        }

        // Bọc viền màn hình (wrap around edges) mượt mà
        if (node.x < -25) node.x = width + 25;
        else if (node.x > width + 25) node.x = -25;
        if (node.y < -25) node.y = height + 25;
        else if (node.y > height + 25) node.y = -25;
      }

      // Vẽ các sợi dây liên kết thần kinh giữa các nút gần nhau
      ctx.lineWidth = 0.85;
      const maxDist = cfg.maxDist;
      const maxDistSq = maxDist * maxDist;
      const mouseR = cfg.mouseR;
      const mouseRSq = mouseR * mouseR;
      const lineAlphaFactor = cfg.lineAlphaFactor;

      for (let i = 0; i < totalNodes; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < totalNodes; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          if (dx > maxDist || dx < -maxDist) continue;

          const dy = n2.y - n1.y;
          if (dy > maxDist || dy < -maxDist) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxDist) * lineAlphaFactor;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Kết nối các nút với trỏ chuột
        if (mouse.active) {
          const dxM = n1.x - mouse.x;
          if (dxM < mouseR && dxM > -mouseR) {
            const dyM = n1.y - mouse.y;
            if (dyM < mouseR && dyM > -mouseR) {
              const distSqM = dxM * dxM + dyM * dyM;
              if (distSqM < mouseRSq) {
                const distM = Math.sqrt(distSqM);
                const alphaM = (1 - distM / mouseR) * 0.46;
                ctx.strokeStyle = `rgba(255, 255, 255, ${alphaM})`;
                ctx.beginPath();
                ctx.moveTo(mouse.x, mouse.y);
                ctx.lineTo(n1.x, n1.y);
                ctx.stroke();
              }
            }
          }
        }
      }

      // Vẽ các nút hạt thần kinh
      for (let i = 0; i < totalNodes; i++) {
        const node = nodes[i];
        const pulse = Math.sin(node.pulsePhase) * 0.22;
        const currentAlpha = Math.max(0.18, Math.min(0.95, node.baseAlpha + pulse));

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.isAccent) {
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 1.25})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(255, 255, 255, 0.65)";
        } else {
          ctx.fillStyle = `rgba(225, 230, 240, ${currentAlpha * 0.85})`;
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      }

      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Tạm dừng vẽ khi chuyển tab để tiết kiệm GPU/Pin thiết bị
    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(animId);
      if (mouseTimer) clearTimeout(mouseTimer);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchstart", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div
      className="neural-network-bg pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Subtle deep black/vignette gradient backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#09090d] to-[#040406]"
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
      />
      {/* Subtle dark vignette overlay to accentuate typography */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]"
        aria-hidden="true"
      />
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  baseSpeedY: number;
  speedY: number;
  swaySpeed: number;
  swayDist: number;
  angle: number;
  angleStep: number;
  opacity: number;
  vx: number;
  vy: number;
}

export function SnowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates & state
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 130, // Repulsion radius in pixels
      active: false,
    };

    let mouseTimer: ReturnType<typeof setTimeout> | null = null;

    // Determine particle count based on screen size for optimal performance
    const isMobile = width <= 768;
    const flakeCount = isMobile ? 65 : 140;

    // Setup high DPI canvas scaling
    const setCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    setCanvasSize();

    // Create snowflakes with realistic parallax depth
    const createFlake = (initialY = -1): Snowflake => {
      const radius = 0.8 + Math.random() * 2.6; // 0.8px - 3.4px
      // Larger flakes fall slightly faster (depth perception)
      const depthFactor = (radius - 0.8) / 2.6; // 0 to 1
      const baseSpeedY = 0.5 + depthFactor * 1.6 + Math.random() * 0.4;
      const opacity = 0.25 + depthFactor * 0.65; // Far: ~0.25, Near: ~0.9

      return {
        x: Math.random() * width,
        y: initialY >= 0 ? initialY : Math.random() * height,
        radius,
        baseSpeedY,
        speedY: baseSpeedY,
        swaySpeed: 0.01 + Math.random() * 0.02,
        swayDist: 0.3 + Math.random() * 0.8,
        angle: Math.random() * Math.PI * 2,
        angleStep: 0.01 + Math.random() * 0.02,
        opacity,
        vx: 0,
        vy: 0,
      };
    };

    const flakes: Snowflake[] = Array.from({ length: flakeCount }, () =>
      createFlake()
    );

    // Track mouse & touch events
    const handlePointerMove = (x: number, y: number) => {
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;

      if (mouseTimer) clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        mouse.active = false;
      }, 2000);
    };

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      if (mouseTimer) clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        mouse.active = false;
      }, 500);
    };

    const onMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const onResize = () => {
      setCanvasSize();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave, { passive: true });
    window.addEventListener("resize", onResize);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const repelRadius = mouse.radius;
      const repelRadiusSq = repelRadius * repelRadius;

      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i];

        // 1. Mouse Repulsion Physics
        if (mouse.active) {
          const dx = flake.x - mouse.x;
          const dy = flake.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < repelRadiusSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            // Non-linear ease-out repulsive force: stronger when closer
            const normalForce = Math.pow(1 - dist / repelRadius, 1.6);
            const repelSpeed = 7.5 * normalForce;

            const nx = dx / dist;
            const ny = dy / dist;

            // Apply push away impulse
            flake.vx += nx * repelSpeed;
            flake.vy += ny * repelSpeed;

            // Clamp max velocity to keep motion smooth & natural
            const currentSpeed = Math.hypot(flake.vx, flake.vy);
            const maxSpeed = 10;
            if (currentSpeed > maxSpeed) {
              const ratio = maxSpeed / currentSpeed;
              flake.vx *= ratio;
              flake.vy *= ratio;
            }
          }
        }

        // 2. Velocity damping & natural fall
        flake.vx *= 0.91; // Smooth friction
        flake.vy *= 0.91;

        // Sway oscillation
        flake.angle += flake.angleStep;
        const sway = Math.sin(flake.angle) * flake.swayDist;

        // Position update
        flake.x += flake.vx + sway;
        flake.y += flake.vy + flake.baseSpeedY;

        // 3. Screen wrap / Recycle snowflake
        if (flake.y > height + 10) {
          flake.y = -10;
          flake.x = Math.random() * width;
          flake.vx = 0;
          flake.vy = 0;
        } else if (flake.y < -30) {
          flake.y = height + 5;
        }

        if (flake.x < -20) {
          flake.x = width + 10;
        } else if (flake.x > width + 20) {
          flake.x = -10;
        }

        // 4. Draw snowflake with soft snowy glow
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);

        // Add soft glow for larger flakes
        if (flake.radius > 2.0) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = `rgba(255, 255, 255, ${flake.opacity * 0.8})`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mouseTimer) clearTimeout(mouseTimer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className="snow-background-container pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Subtle deep black/vignette gradient backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#09090d] to-[#040406]"
        aria-hidden="true"
      />
      {/* Canvas for falling interactive snow */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full pointer-events-none"
      />
      {/* Subtle dark vignette overlay to accentuate typography */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]"
        aria-hidden="true"
      />
    </div>
  );
}

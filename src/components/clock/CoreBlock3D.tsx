"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { defaultCoreBlockConfig } from "@/config/clock.config";
import { CoreBlockConfig } from "@/types";

interface CoreBlock3DProps {
  config?: Partial<CoreBlockConfig>;
}

function smoothstep(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return clamped * clamped * (3 - 2 * clamped);
}

function getGlowTex(color = "rgba(255,255,255,1)", r = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = r * 2;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, color);
    g.addColorStop(0.2, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r * 2, r * 2);
  }
  return new THREE.CanvasTexture(c);
}

export function CoreBlock3D({ config }: CoreBlock3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const CFG: CoreBlockConfig = {
      ...defaultCoreBlockConfig,
      ...config,
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("[CoreBlock3D] WebGL initialization failed:", err);
      return;
    }

    const scene = new THREE.Scene();
    const width = root.clientWidth || 500;
    const height = root.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;

    const ambientLight = new THREE.AmbientLight(0x1a1a20, 0.7);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0xffffff, 4.5, 25);
    coreLight.castShadow = true;
    coreLight.shadow.mapSize.width = 1024;
    coreLight.shadow.mapSize.height = 1024;
    coreLight.shadow.camera.near = 0.1;
    coreLight.shadow.camera.far = 25;
    coreLight.shadow.bias = -0.0001;
    coreLight.shadow.normalBias = 0.05;
    coreLight.shadow.radius = 4;

    const staticGroup = new THREE.Group();
    scene.add(staticGroup);
    staticGroup.add(coreLight);

    const dirLight = new THREE.DirectionalLight(0xf0f0f5, 2.2);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x555566, 1.5);
    fillLight.position.set(-15, -10, -15);
    scene.add(fillLight);

    /* ─── 1. CORE MESH ─── */
    const coreGroup = new THREE.Group();
    staticGroup.add(coreGroup);
    const rotGroup = new THREE.Group();
    rotGroup.rotation.x = 0.15;
    rotGroup.rotation.y = -0.25;
    coreGroup.add(rotGroup);

    const RADIUS = 2.0;
    const coreGeo = new THREE.IcosahedronGeometry(RADIUS, 7);
    const basePos = new Float32Array(
      (coreGeo.attributes.position as THREE.BufferAttribute).array
    );
    const N = basePos.length / 3;
    const thetaArr = new Float32Array(N);
    const phiArr = new Float32Array(N);
    const randoms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const x = basePos[i * 3] / RADIUS;
      const y = basePos[i * 3 + 1] / RADIUS;
      const z = basePos[i * 3 + 2] / RADIUS;
      thetaArr[i] = Math.atan2(y, x);
      phiArr[i] = Math.acos(Math.max(-1, Math.min(1, z)));
      randoms[i] = Math.random();
    }
    coreGeo.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));

    const wireMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x333333,
      emissiveIntensity: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointsMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      map: getGlowTex("rgba(255,255,255,1)", 16),
      depthWrite: false,
    });

    wireMat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying float vNormalZ;" +
        shader.vertexShader.replace(
          "void main() {",
          "void main() { vNormalZ = (normalMatrix * normal).z;"
        );
      shader.fragmentShader =
        "varying float vNormalZ;" +
        shader.fragmentShader.replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          "float depthFade = smoothstep(-0.4, 0.6, vNormalZ); vec4 diffuseColor = vec4( diffuse, opacity * depthFade );"
        );
    };

    pointsMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader =
        "attribute float aRandom; varying float vRandom; varying float vNormalZ; uniform float uTime;" +
        shader.vertexShader
          .replace(
            "void main() {",
            "void main() { vRandom = aRandom; vNormalZ = (normalMatrix * normalize(position)).z;"
          )
          .replace(
            "gl_PointSize = size;",
            "float t_ = uTime * (2.0 + aRandom * 3.0) + aRandom * 100.0; float twinkle = 0.8 + 0.2 * sin(t_); gl_PointSize = size * twinkle;"
          );
      shader.fragmentShader =
        "varying float vRandom; varying float vNormalZ; uniform float uTime;" +
        shader.fragmentShader.replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          "float t_ = uTime * (2.0 + vRandom * 3.0) + vRandom * 100.0; float twinkle = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t_), 2.0); float depthFade = smoothstep(-0.4, 0.6, vNormalZ); vec4 diffuseColor = vec4( diffuse, opacity * twinkle * depthFade );"
        );
      pointsMat.userData.shader = shader;
    };

    const corePoints = new THREE.Points(coreGeo, pointsMat);
    const wireMesh = new THREE.Mesh(coreGeo, wireMat);
    wireMesh.castShadow = true;
    rotGroup.add(wireMesh);
    rotGroup.add(corePoints);

    /* ─── 2. FILAMENT SYSTEM ─── */
    const filamentGroup = new THREE.Group();
    rotGroup.add(filamentGroup);
    const filaments: {
      line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
      r: number;
      phase: number;
      speed: number;
      noiseScale: number;
    }[] = [];

    for (let i = 0; i < 20; i++) {
      const segs = 48;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= segs; j++) pts.push(new THREE.Vector3());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xffffff : 0xcccccc,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      filamentGroup.add(line);
      filaments.push({
        line,
        r: 0.4 + Math.random() * 0.5,
        phase: Math.random() * 10,
        speed: 0.8 + Math.random() * 1.5,
        noiseScale: 0.15 + Math.random() * 0.25,
      });
    }

    /* ─── 3. AURA SYSTEM ─── */
    const bhGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(bhGeo, bhMat);
    blackHole.renderOrder = 50;
    coreGroup.add(blackHole);

    const createGlowMat = (opacity: number, power: number) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xffffff) },
          uOpacity: { value: opacity },
          uPower: { value: power },
        },
        vertexShader:
          "varying vec3 vNormal; varying vec3 vViewVec; varying vec3 vLocalPos; void main() { vLocalPos = position; vNormal = normalize(normalMatrix * normal); vec4 mvPos = modelViewMatrix * vec4(position, 1.0); vViewVec = normalize(-mvPos.xyz); gl_Position = projectionMatrix * mvPos; }",
        fragmentShader:
          "uniform vec3 uColor; uniform float uOpacity; uniform float uPower; varying vec3 vNormal; varying vec3 vViewVec; varying vec3 vLocalPos; void main() { float dotNV = abs(dot(vNormal, vViewVec)); float glow = pow(dotNV, uPower); float softEdge = smoothstep(0.0, 0.15, dotNV); float zFade = 1.0; if (vLocalPos.z > -0.2) { zFade = smoothstep(0.2, -0.2, vLocalPos.z); } gl_FragColor = vec4(uColor, glow * uOpacity * softEdge * zFade); }",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

    const glowGeo = new THREE.SphereGeometry(1, 32, 32);
    const bhGlowMat = createGlowMat(1.0, 2.5);
    const bhGlow = new THREE.Mesh(glowGeo, bhGlowMat);
    bhGlow.scale.setScalar(0.75);
    bhGlow.renderOrder = 51;
    coreGroup.add(bhGlow);

    const glowMat = createGlowMat(0.9, 1.2);
    const glowOrb = new THREE.Mesh(glowGeo, glowMat);
    glowOrb.renderOrder = 5;
    coreGroup.add(glowOrb);

    let smoothBH = 1.0;
    const colorLight = new THREE.Color(0xffffff);
    const colorDark = new THREE.Color(0x555555);

    /* ─── 4. RING SYSTEM ─── */
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    const getSkipIndices = (
      count: number,
      probs: { skip: number; prob: number }[]
    ) => {
      const r = Math.random() * 100;
      let cumulative = 0;
      let numToSkip = 0;
      for (let pi = 0; pi < probs.length; pi++) {
        cumulative += probs[pi].prob;
        if (r <= cumulative) {
          numToSkip = probs[pi].skip;
          break;
        }
      }
      const indices: number[] = [];
      const available: number[] = [];
      for (let si = 0; si < count; si++) available.push(si);
      for (let si2 = 0; si2 < numToSkip; si2++) {
        if (available.length === 0) break;
        const idx = Math.floor(Math.random() * available.length);
        indices.push(available.splice(idx, 1)[0]);
      }
      return indices;
    };

    const createFragmentedRing = (
      innerR: number,
      outerR: number,
      depth: number,
      fragmentsCount: number,
      rotSpeed: number,
      axis: THREE.Vector3,
      hiddenIndices: number[],
      gap: number
    ) => {
      const group = new THREE.Group();
      const stoneMat = new THREE.MeshPhysicalMaterial({
        color: 0x141418,
        emissive: 0x050508,
        emissiveIntensity: 0.2,
        metalness: 1.0,
        roughness: 0.25,
        clearcoat: 0.6,
        flatShading: false,
      });
      const materials = [stoneMat, stoneMat];
      const totalArc = Math.PI * 2;
      const arcLength = totalArc / fragmentsCount - gap;

      for (let i = 0; i < fragmentsCount; i++) {
        if (hiddenIndices.includes(i)) continue;
        const start = i * (totalArc / fragmentsCount);
        const end = start + arcLength;
        const chamfer = 0.15;
        const shape = new THREE.Shape();
        shape.absarc(0, 0, outerR, start + chamfer / outerR, end - chamfer / outerR, false);
        shape.lineTo(Math.cos(end) * (outerR - chamfer), Math.sin(end) * (outerR - chamfer));
        shape.lineTo(Math.cos(end) * (innerR + chamfer), Math.sin(end) * (innerR + chamfer));
        shape.absarc(0, 0, innerR, end - chamfer / innerR, start + chamfer / innerR, true);
        shape.lineTo(Math.cos(start) * (innerR + chamfer), Math.sin(start) * (innerR + chamfer));
        shape.lineTo(Math.cos(start) * (outerR - chamfer), Math.sin(start) * (outerR - chamfer));
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSegments: 1,
          steps: 1,
          bevelSize: 0.15,
          bevelThickness: 0.15,
          curveSegments: 48,
        });
        geo.translate(0, 0, -depth / 2);
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }

      const gapConnectors: THREE.Mesh[] = [];
      for (let gi = 0; gi < fragmentsCount; gi++) {
        const nextIdx = (gi + 1) % fragmentsCount;
        if (!hiddenIndices.includes(gi) && !hiddenIndices.includes(nextIdx)) {
          const midAngle = gi * (totalArc / fragmentsCount) + arcLength + gap / 2;
          const poly = new THREE.Mesh(
            new THREE.IcosahedronGeometry((outerR - innerR) * 0.4, 0),
            stoneMat
          );
          poly.position.set(
            Math.cos(midAngle) * ((innerR + outerR) / 2),
            Math.sin(midAngle) * ((innerR + outerR) / 2),
            0
          );
          poly.castShadow = true;
          poly.receiveShadow = true;
          group.add(poly);
          gapConnectors.push(poly);
        }
      }
      return {
        obj: group,
        axis: axis.normalize(),
        speed: rotSpeed,
        gapConnectors,
      };
    };

    const ringConfigs = [
      { w: 0.6, d: 0.6, s: 0.007, a: new THREE.Vector3(1, 0.5, 0.2), skip: [{ skip: 1, prob: 20 }, { skip: 0, prob: 80 }] },
      { w: 0.8, d: 0.8, s: -0.004, a: new THREE.Vector3(-0.5, 1, 0.5), skip: [{ skip: 1, prob: 30 }, { skip: 0, prob: 70 }] },
      { w: 1.0, d: 1.2, s: 0.003, a: new THREE.Vector3(0.2, -0.5, 1), skip: [{ skip: 1, prob: 30 }, { skip: 2, prob: 20 }, { skip: 0, prob: 50 }] },
    ];

    const rings: ReturnType<typeof createFragmentedRing>[] = [];
    let currentR2 = 2.4;
    const fragmentGap = 0.3 / Math.sqrt(CFG.ringSpacing);
    for (let i = 0; i < CFG.ringAmount; i++) {
      const c = ringConfigs[i % ringConfigs.length];
      const ringGap = 0.6 * CFG.ringSpacing;
      const r1 = currentR2 + ringGap;
      const r2 = r1 + c.w;
      currentR2 = r2;
      const r = createFragmentedRing(
        r1,
        r2,
        c.d,
        3 + (i % 4),
        c.s,
        c.a.clone(),
        getSkipIndices(3 + (i % 4), c.skip),
        fragmentGap
      );
      rings.push(r);
      mainGroup.add(r.obj);
    }

    /* ─── 5. DEBRIS SYSTEM ─── */
    const debrisGroup = new THREE.Group();
    mainGroup.add(debrisGroup);
    const debrisMat = new THREE.MeshPhysicalMaterial({
      color: 0x18181c,
      roughness: 0.2,
      metalness: 0.9,
      clearcoat: 0.8,
      flatShading: true,
    });
    for (let i = 0; i < CFG.debrisAmount; i++) {
      const size = (0.1 + Math.random() * 0.3) * CFG.debrisSize;
      const randGeo = Math.floor(Math.random() * 5);
      let geo: THREE.BufferGeometry;
      switch (randGeo) {
        case 0:
          geo = new THREE.TetrahedronGeometry(size, 0);
          break;
        case 1:
          geo = new THREE.BoxGeometry(size * 1.3, size * 1.3, size * 1.3);
          break;
        case 2:
          geo = new THREE.OctahedronGeometry(size, 0);
          break;
        case 3:
          geo = new THREE.DodecahedronGeometry(size, 0);
          break;
        default:
          geo = new THREE.IcosahedronGeometry(size, 0);
          break;
      }
      const rock = new THREE.Mesh(geo, debrisMat);
      rock.castShadow = true;
      rock.receiveShadow = true;
      const r = 7 + Math.random() * 8;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      rock.position.set(
        r * Math.sin(ph) * Math.cos(th),
        r * Math.sin(ph) * Math.sin(th),
        r * Math.cos(ph)
      );
      rock.userData.rotAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      rock.userData.rotSpeed = 0.01 + Math.random() * 0.02;
      rock.userData.orbitSpeed = (Math.random() - 0.5) * 0.005;
      debrisGroup.add(rock);
    }

    /* ─── 6. PARTICLE SYSTEM ─── */
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(CFG.particleAmount * 3);
    const pRandoms = new Float32Array(CFG.particleAmount);
    const pDistances = new Float32Array(CFG.particleAmount);

    for (let i = 0; i < CFG.particleAmount; i++) {
      const r = 2.0 + Math.pow(Math.random(), 1.5) * 22.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
      pRandoms[i] = Math.random();
      pDistances[i] = r;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("aRandom", new THREE.BufferAttribute(pRandoms, 1));
    pGeo.setAttribute("aDist", new THREE.BufferAttribute(pDistances, 1));

    const pMat = new THREE.PointsMaterial({
      size: CFG.particleSize,
      map: getGlowTex("rgba(255,255,255,1)", 16),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    pMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader =
        "attribute float aRandom; attribute float aDist; varying float vRandom; varying float vDist;" +
        shader.vertexShader.replace(
          "void main() {",
          "void main() { vRandom = aRandom; vDist = aDist;"
        );
      shader.fragmentShader =
        "varying float vRandom; varying float vDist; uniform float uTime;" +
        shader.fragmentShader.replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          "float proximity = smoothstep(24.0, 2.0, vDist); float baseOpacity = 0.15 + proximity * 0.12; float idleTwinkle = pow(0.5 + 0.5 * sin(uTime * 1.2 + vRandom * 20.0 + vDist * 0.1), 2.0) * 0.2; float finalOpacity = baseOpacity + idleTwinkle; vec4 diffuseColor = vec4( diffuse, finalOpacity );"
        );
      pMat.userData.shader = shader;
    };
    const pSystem = new THREE.Points(pGeo, pMat);
    scene.add(pSystem);

    /* ─── 7. ANIMATION & QUATERNION DRAG ─── */
    camera.position.set(CFG.offsetX, CFG.offsetY, CFG.zoom);

    let engineT = 0;
    let introProgress = 0;
    let smoothM = 0;
    let targetM = 0;
    let nextPickTime = 0;

    const rotQ = new THREE.Quaternion();
    const dragVel = { x: 0, y: 0 };
    let dragActive = false;
    let dragPX = 0;
    let dragPY = 0;
    let autoRotate = true;
    let autoRotateTimer: ReturnType<typeof setTimeout> | null = null;
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      engineT += 0.01;
      const speedProp = CFG.speed;

      camera.position.z += (CFG.zoom - camera.position.z) * 0.05;
      camera.position.y += (CFG.offsetY - camera.position.y) * 0.05;
      camera.updateProjectionMatrix();

      if (!dragActive) {
        const spd = Math.sqrt(dragVel.x * dragVel.x + dragVel.y * dragVel.y);
        if (spd > 0.01) {
          rotQ.premultiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(dragVel.y, dragVel.x, 0).normalize(),
              spd * 0.008
            )
          );
          dragVel.x *= 0.97;
          dragVel.y *= 0.97;
        }
        if (autoRotate) {
          rotQ.premultiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              0.0015 * speedProp
            )
          );
        }
      }
      rotQ.normalize();
      mainGroup.quaternion.copy(rotQ);

      introProgress = Math.min(1, introProgress + 0.004);
      const ringIntro = smoothstep(Math.min(1, introProgress / 0.75));
      const coreIntro = smoothstep(Math.max(0, (introProgress - 0.7) / 0.3));
      const speedBoost = 1.0 + Math.pow(1.0 - ringIntro, 2) * 15.0;

      // Update Core Mesh Morphing
      if (!nextPickTime || engineT > nextPickTime) {
        const r = Math.random();
        targetM = r < 0.25 ? 0 : r < 0.5 ? 1 : r < 0.75 ? 2 : 3;
        nextPickTime = engineT + 5 + Math.random() * 5;
      }
      smoothM += (targetM - smoothM) * 0.04;

      const positions = (coreGeo.attributes.position as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < N; i++) {
        const idx = i * 3;
        const bx = basePos[idx];
        const by = basePos[idx + 1];
        const bz = basePos[idx + 2];
        const theta = thetaArr[i];
        const phi = phiArr[i];

        const tectonic = Math.sin(6 * theta) * Math.cos(6 * phi);
        const r1 = 1.0 + (tectonic > 0.3 ? 0.15 : tectonic < -0.3 ? -0.1 : 0);
        const tx1 = bx * r1,
          ty1 = by * r1,
          tz1 = bz * r1;
        const r2 =
          1.0 +
          0.25 * Math.sin(3 * theta - engineT * 1.5) +
          0.2 * Math.cos(4 * phi + engineT);
        const tx2 = bx * r2,
          ty2 = by * r2,
          tz2 = bz * r2;
        const r3 =
          1.0 +
          0.12 * Math.sin(8 * theta + engineT * 2) * Math.cos(engineT * 1.2) +
          0.05 * Math.sin(phi * 6);
        const tx3 = bx * r3,
          ty3 = by * r3,
          tz3 = bz * r3;

        let tx: number, ty: number, tz: number;
        if (smoothM < 1) {
          const l = smoothstep(smoothM);
          tx = bx + (tx1 - bx) * l;
          ty = by + (ty1 - by) * l;
          tz = bz + (tz1 - bz) * l;
        } else if (smoothM < 2) {
          const l = smoothstep(smoothM - 1);
          tx = tx1 + (tx2 - tx1) * l;
          ty = ty1 + (ty2 - ty1) * l;
          tz = tz1 + (tz2 - tz1) * l;
        } else if (smoothM < 3) {
          const l = smoothstep(smoothM - 2);
          tx = tx2 + (tx3 - tx2) * l;
          ty = ty2 + (ty3 - ty2) * l;
          tz = tz2 + (tz3 - tz2) * l;
        } else {
          const l = smoothstep(smoothM - 3);
          tx = tx3 + (bx - tx3) * l;
          ty = ty3 + (by - ty3) * l;
          tz = bz + (tz3 - bz) * l;
        }
        positions[idx] = bx + (tx - bx) * coreIntro;
        positions[idx + 1] = by + (ty - by) * coreIntro;
        positions[idx + 2] = bz + (tz - bz) * coreIntro;
      }
      coreGeo.attributes.position.needsUpdate = true;
      coreGeo.computeVertexNormals();
      if (pointsMat.userData.shader) {
        pointsMat.userData.shader.uniforms.uTime.value = engineT;
      }

      // Update Filaments
      for (let fi = 0; fi < filaments.length; fi++) {
        const f = filaments[fi];
        const pos = (f.line.geometry.attributes.position as THREE.BufferAttribute)
          .array as Float32Array;
        const segs = 48;
        const time = engineT * f.speed;
        for (let j = 0; j <= segs; j++) {
          const ang = (j / segs) * Math.PI * 2;
          const n = Math.sin(ang * 3 + time + f.phase) * f.noiseScale;
          const r = f.r * (1 + n * coreIntro);
          pos[j * 3] = Math.cos(ang) * r;
          pos[j * 3 + 1] = Math.sin(ang) * r;
          pos[j * 3 + 2] = Math.sin(time * 0.5 + ang * 2) * f.noiseScale * coreIntro;
        }
        f.line.geometry.attributes.position.needsUpdate = true;
        f.line.rotation.y += 0.01 * coreIntro;
        f.line.rotation.z += 0.005 * coreIntro;
        f.line.material.opacity = (0.2 + Math.sin(engineT + f.phase) * 0.1) * coreIntro;
      }

      // Update Aura
      coreLight.intensity =
        (0.8 + Math.sin(engineT * 2) * 0.4) * coreIntro * CFG.pointLightIntensity;
      glowOrb.scale.setScalar(
        (2.2 + Math.sin(engineT * 3) * 0.3) * (0.2 + 0.8 * coreIntro) * CFG.glowSize
      );
      bhGlow.scale.setScalar(0.75 * CFG.glowSize);
      const targetBH = 1.0 + Math.sin(engineT * 1.5) * 0.05;
      const lerpFactor = targetBH < smoothBH ? 0.35 : 0.15;
      smoothBH += (targetBH - smoothBH) * lerpFactor;
      blackHole.scale.setScalar(smoothBH);
      const cRatio = Math.max(0, Math.min(1, (smoothBH - 0.5) / 0.5));
      const finalColor = new THREE.Color().lerpColors(colorDark, colorLight, cRatio);
      glowMat.uniforms.uColor.value.copy(finalColor);
      glowMat.uniforms.uOpacity.value =
        (0.7 + (1.0 - cRatio) * 0.3) * CFG.glowIntensity * coreIntro;
      bhGlowMat.uniforms.uColor.value.copy(finalColor);
      bhGlowMat.uniforms.uOpacity.value = 0.9 * CFG.glowIntensity * coreIntro;

      const coreRotSpeed = 0.01 * (0.1 + 0.3 * coreIntro) * (0.5 + 0.5 * speedProp);
      rotGroup.rotation.y += coreRotSpeed;
      rotGroup.rotation.z = Math.sin(engineT * 0.5) * 0.2 * coreIntro;
      coreGroup.scale.setScalar(0.25 + 0.75 * ringIntro);

      // Update Rings
      for (let ri = 0; ri < rings.length; ri++) {
        const r = rings[ri];
        const ringSpeed = r.speed * (0.2 + 0.8 * ringIntro) * speedBoost * speedProp;
        r.obj.rotateOnAxis(r.axis, ringSpeed);
        r.obj.rotateX(0.002 * speedProp * ringIntro);
        r.obj.rotateZ(0.001 * speedProp * ringIntro);
        r.obj.scale.setScalar(ringIntro);
        for (let ci = 0; ci < r.gapConnectors.length; ci++) {
          const c = r.gapConnectors[ci];
          c.rotateX(0.015);
          c.rotateZ(0.01);
        }
      }

      // Update Debris
      for (let i = 0; i < debrisGroup.children.length; i++) {
        const rock = debrisGroup.children[i];
        rock.rotateOnAxis(rock.userData.rotAxis, rock.userData.rotSpeed * speedProp);
        rock.position.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rock.userData.orbitSpeed * speedProp
        );
        rock.position.y += Math.sin(engineT * 2 + i) * 0.005;
      }

      // Update Particles
      pSystem.rotation.y = engineT * 0.04 * speedProp;
      pSystem.rotation.z = Math.sin(engineT * 0.08) * 0.08;
      if (pMat.userData.shader) {
        pMat.userData.shader.uniforms.uTime.value = engineT;
      }

      ambientLight.intensity = 0.6;
      dirLight.intensity = CFG.dirLightIntensity;
      fillLight.intensity = CFG.fillLightIntensity;
      renderer.render(scene, camera);
    };

    const onResize = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      dragActive = true;
      dragPX = e.clientX;
      dragPY = e.clientY;
      canvas.style.cursor = "grabbing";
      autoRotate = false;
      if (autoRotateTimer) clearTimeout(autoRotateTimer);
    };

    const handleMouseUp = () => {
      if (!dragActive) return;
      dragActive = false;
      canvas.style.cursor = "grab";
      autoRotateTimer = setTimeout(() => {
        autoRotate = true;
      }, 3000);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragPX;
      const dy = e.clientY - dragPY;
      dragPX = e.clientX;
      dragPY = e.clientY;
      if (!dragActive) return;
      dragVel.x = dx;
      dragVel.y = dy;
      const spd = Math.sqrt(dx * dx + dy * dy);
      if (spd > 0) {
        rotQ.premultiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(dy, dx, 0).normalize(),
            spd * 0.008
          )
        );
      }
    };

    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const resizeInitTimer = setTimeout(onResize, 100);
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(resizeInitTimer);
      if (autoRotateTimer) clearTimeout(autoRotateTimer);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      // Giải phóng toàn bộ bộ nhớ GPU (Geometries, Materials, Textures)
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const mat of mats) {
            const matWithMap = mat as THREE.Material & {
              map?: THREE.Texture;
            };
            if (matWithMap.map) {
              matWithMap.map.dispose();
            }
            mat.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [config]);

  return (
    <div
      ref={containerRef}
      id="core-block"
      className="fixed left-1/2 top-1/2 z-[2] aspect-square h-[min(85vw,85vh)] w-[min(85vw,85vh)] -translate-x-1/2 -translate-y-1/2 bg-transparent pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-auto block !h-full !w-full cursor-grab"
      />
    </div>
  );
}

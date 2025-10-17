// src/components/Ballpit.tsx
"use client";

import React, { useEffect, useRef } from "react";

/**
 * Ballpit - client-only component
 *
 * Dynamic-imports three to avoid TypeScript module resolution issues.
 * Uses defensive null checks to avoid "'canvas' is possibly 'null'" diagnostics.
 *
 * Optional: remove usages of `any` after you install @types/three and
 * add a declaration for the RoomEnvironment example module (see suggestions above).
 */

type BallpitProps = {
  className?: string;
  followCursor?: boolean;
  count?: number;
  style?: React.CSSProperties;
};

const Ballpit: React.FC<BallpitProps> = ({ className = "", followCursor = true, count, style = {} }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<any>(null); // holds created instance info for cleanup

  useEffect(() => {
    let mounted = true;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      // dynamic import prevents TypeScript server from trying to resolve .d.ts at build-time
      const THREE: any = await import("three");
      const { RoomEnvironment }: { RoomEnvironment: any } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );

      if (!mounted) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // --- config ---
      const CONFIG = {
        count: typeof count === "number" ? count : 200,
        maxX: 5,
        maxY: 5,
        maxZ: 2,
        minSize: 0.5,
        maxSize: 1,
        size0: 1,
        gravity: 0.5,
        friction: 0.9975,
        wallBounce: 0.95,
        maxVelocity: 0.15,
        ambientColor: 0xffffff,
        ambientIntensity: 1,
        lightColor: 0x111111,
        lightIntensity: 200,
        followCursor: !!followCursor,
      };

      // --- renderer / scene / camera ---
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      try {
        if ("outputColorSpace" in renderer) (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
      } catch (e) {
        // ignore if property missing
      }
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      renderer.setPixelRatio(pixelRatio);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      camera.position.set(0, 0, 20);
      camera.lookAt(0, 0, 0);

      function resizeRenderer() {
        if (!canvas) return;
        const w = canvas.clientWidth || (canvas.parentElement?.clientWidth ?? window.innerWidth);
        const h = canvas.clientHeight || (canvas.parentElement?.clientHeight ?? window.innerHeight);
        camera.aspect = Math.max(0.0001, w / Math.max(1, h));
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }

      // --- environment map (PMREM) ---
      const pmrem = new THREE.PMREMGenerator(renderer);
      // pmrem.compileEquirectangularShader(); // not required explicitly
      const envScene = new RoomEnvironment();
      const envMap = pmrem.fromScene(envScene).texture;

      // --- instanced spheres ---
      const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
      const material = new THREE.MeshPhysicalMaterial({
        envMap,
        metalness: 0.5,
        roughness: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
      });

      const instanceCount = CONFIG.count;
      const instanced = new THREE.InstancedMesh(sphereGeo, material, instanceCount);
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      // attach simple lights to the instanced object so they stay in scene graph
      const ambient = new THREE.AmbientLight(CONFIG.ambientColor, CONFIG.ambientIntensity);
      const point = new THREE.PointLight(CONFIG.lightColor, CONFIG.lightIntensity);
      // InstancedMesh inherits Object3D, so `add` exists
      instanced.add(ambient);
      instanced.add(point);

      scene.add(instanced);

      // --- particle arrays ---
      const positions = new Float32Array(3 * instanceCount);
      const velocities = new Float32Array(3 * instanceCount);
      const sizes = new Float32Array(instanceCount);

      // init
      positions[0] = 0;
      positions[1] = 0;
      positions[2] = 0;
      sizes[0] = CONFIG.size0;
      for (let i = 1; i < instanceCount; i++) {
        positions[3 * i + 0] = (Math.random() - 0.5) * 2 * CONFIG.maxX;
        positions[3 * i + 1] = (Math.random() - 0.5) * 2 * CONFIG.maxY;
        positions[3 * i + 2] = (Math.random() - 0.5) * 2 * CONFIG.maxZ;
        velocities[3 * i + 0] = 0;
        velocities[3 * i + 1] = 0;
        velocities[3 * i + 2] = 0;
        sizes[i] = CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize);
      }

      const tempObj = new THREE.Object3D();

      function updateParticles(delta: number) {
        for (let i = 1; i < instanceCount; i++) {
          const base = 3 * i;
          velocities[base + 1] -= delta * CONFIG.gravity * sizes[i];
          velocities[base + 0] *= CONFIG.friction;
          velocities[base + 1] *= CONFIG.friction;
          velocities[base + 2] *= CONFIG.friction;

          // clamp
          const vx = velocities[base + 0], vy = velocities[base + 1], vz = velocities[base + 2];
          const speed = Math.hypot(vx, vy, vz);
          if (speed > CONFIG.maxVelocity) {
            const s = CONFIG.maxVelocity / (speed + 1e-9);
            velocities[base + 0] *= s;
            velocities[base + 1] *= s;
            velocities[base + 2] *= s;
          }
          positions[base + 0] += velocities[base + 0];
          positions[base + 1] += velocities[base + 1];
          positions[base + 2] += velocities[base + 2];

          // bounds
          if (Math.abs(positions[base + 0]) + sizes[i] > CONFIG.maxX) {
            positions[base + 0] = Math.sign(positions[base + 0]) * (CONFIG.maxX - sizes[i]);
            velocities[base + 0] = -velocities[base + 0] * CONFIG.wallBounce;
          }
          if (CONFIG.gravity === 0) {
            if (Math.abs(positions[base + 1]) + sizes[i] > CONFIG.maxY) {
              positions[base + 1] = Math.sign(positions[base + 1]) * (CONFIG.maxY - sizes[i]);
              velocities[base + 1] = -velocities[base + 1] * CONFIG.wallBounce;
            }
          } else if (positions[base + 1] - sizes[i] < -CONFIG.maxY) {
            positions[base + 1] = -CONFIG.maxY + sizes[i];
            velocities[base + 1] = -velocities[base + 1] * CONFIG.wallBounce;
          }
          if (Math.abs(positions[base + 2]) + sizes[i] > Math.max(CONFIG.maxZ, CONFIG.maxSize)) {
            positions[base + 2] = Math.sign(positions[base + 2]) * (CONFIG.maxZ - sizes[i]);
            velocities[base + 2] = -velocities[base + 2] * CONFIG.wallBounce;
          }
        }
      }

      function applyMatrices() {
        for (let i = 0; i < instanceCount; i++) {
          tempObj.position.set(positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2]);
          tempObj.scale.setScalar(sizes[i]);
          tempObj.updateMatrix();
          instanced.setMatrixAt(i, tempObj.matrix);
        }
        instanced.instanceMatrix.needsUpdate = true;
      }

      // --- simple pointer-to-world mapping ---
      const ray = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const worldPoint = new THREE.Vector3();
      let lastPointer = { x: -9999, y: -9999 };

      function onPointerMove(e: PointerEvent) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = (-(e.clientY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
        camera.getWorldDirection(plane.normal);
        const inter = ray.ray.intersectPlane(plane, worldPoint);
        if (inter) {
          // move control particle (index 0)
          positions[0] = worldPoint.x;
          positions[1] = worldPoint.y;
          positions[2] = worldPoint.z;

          // nudge some neighbors
          for (let i = 1; i < Math.min(8, instanceCount); i++) {
            const base = 3 * i;
            const dx = positions[base + 0] - worldPoint.x;
            const dy = positions[base + 1] - worldPoint.y;
            const dist = Math.hypot(dx, dy);
            const influence = Math.max(0, 1 - dist / 200);
            velocities[base + 0] += (dx > 0 ? -1 : 1) * 0.02 * influence;
            velocities[base + 1] += (dy > 0 ? -1 : 1) * 0.02 * influence;
          }
        }
        lastPointer.x = e.clientX;
        lastPointer.y = e.clientY;
      }

      function onPointerLeave() {
        // nothing for now
      }

      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      canvas.addEventListener("touchmove", (ev) => {
        const t = ev.touches && ev.touches[0];
        if (!t) return;
        onPointerMove({ clientX: t.clientX, clientY: t.clientY } as PointerEvent);
      }, { passive: true });

      // resize initial
      resizeRenderer();
      window.addEventListener("resize", resizeRenderer);

      // animate loop
      let prev = performance.now();
      function animate(now = performance.now()) {
        const dt = Math.min(0.05, (now - prev) / 1000);
        prev = now;
        updateParticles(dt);
        applyMatrices();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      }
      raf = requestAnimationFrame(animate);

      // initial apply
      applyMatrices();

      // store instance data for potential external control
      instanceRef.current = { renderer, scene, camera, instanced };

      // cleanup function
      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resizeRenderer);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        try {
          scene.remove(instanced);
          instanced.geometry?.dispose?.();
          instanced.material?.dispose?.();
          pmrem?.dispose?.();
          renderer?.dispose?.();
        } catch (e) {
          // ignore disposal errors
        }
      };
    })().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Ballpit init error:", err);
    });

    return () => {
      mounted = false;
      try {
        cleanup();
      } catch (e) {}
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%", display: "block", ...style }} />;
};

export default Ballpit;

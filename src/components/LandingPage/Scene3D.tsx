'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowRight, Rocket, ShoppingBag, Palette, Zap, Star, Radio, MapPin, Globe, CreditCard, Box, Lock, Image as ImageIcon, Book } from 'lucide-react';
import Link from 'next/link';

// --- MATERIALS & COLORS ---
const BG_COLOR = '#E0E0E0';
const WIREFRAME_COLOR = '#111111';
const ACCENT_COLOR = '#FF2040'; // Neon Cherry Red

// Helper to normalize input [min, max] to [0, 1]
function normalize(value: number, min: number, max: number) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Custom Fade: Fast In (20%), Slow Out (80%)
// Returns opacity 0..1
function calculateOpacity(offset: number, start: number, end: number) {
    if (offset < start || offset > end) return 0;
    const progress = normalize(offset, start, end);

    // Fast In: First 15% of the window
    if (progress < 0.15) {
        return normalize(progress, 0, 0.15); // 0 -> 1
    }
    // Slow Out: Remaining 85%
    else {
        return 1 - normalize(progress, 0.15, 1); // 1 -> 0
    }
}

// --- 3D COMPONENTS ---

// 1. GALAXY (HERO) - Window: 0.0 -> 0.20
function AbstractGalaxy() {
    const pointsRef = useRef<THREE.Points>(null);
    const scroll = useScroll();

    const particles = useMemo(() => {
        const count = 2000;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = i * 0.15;
            const radius = 0.5 + i * 0.01;
            positions[i * 3] = Math.cos(angle) * (radius * 0.5);
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1;
            positions[i * 3 + 2] = Math.sin(angle) * (radius * 0.5);
        }
        return positions;
    }, []);

    useFrame((state, delta) => {
        if (!pointsRef.current) return;
        const offset = scroll.offset;

        if (offset > 0.20) {
            pointsRef.current.visible = false;
            return;
        }
        pointsRef.current.visible = true;

        pointsRef.current.rotation.y += delta * 0.05;
        const opacity = 1 - normalize(offset, 0.05, 0.20);

        // @ts-ignore
        if (pointsRef.current.material) pointsRef.current.material.opacity = opacity * 0.8;

        // SCALE: Increased 2.0x
        pointsRef.current.scale.setScalar(2.0);

        // Moves away
        pointsRef.current.position.z = -offset * 10;
        pointsRef.current.position.y = offset * 2;
        // Positioned Right
        pointsRef.current.position.x = 4;
    });

    return (
        <points ref={pointsRef} position={[4, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={2000} array={particles} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.04} color={WIREFRAME_COLOR} sizeAttenuation transparent opacity={0.8} />
        </points>
    );
}

// 2. MILKY WAY SCRIBBLE (HOPIN) - Window: 0.20 -> 0.40
function AbstractMilkyWayScribble() {
    const groupRef = useRef<THREE.Group>(null);
    const scroll = useScroll();

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const offset = scroll.offset;

        if (offset < 0.20 || offset > 0.40) {
            groupRef.current.visible = false;
            return;
        }
        groupRef.current.visible = true;

        const opacity = calculateOpacity(offset, 0.20, 0.40);
        const scale = 2.5;

        groupRef.current.rotation.z += delta * 0.05;
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;

        const progress = normalize(offset, 0.20, 0.40);
        // Pushed further LEFT (-6)
        groupRef.current.position.x = -9 + progress * 3; // Ends at -6
        groupRef.current.position.z = -5;
        groupRef.current.scale.setScalar(scale);

        groupRef.current.children.forEach((child: any) => {
            if (child.material) child.material.opacity = opacity * 0.5;
        })
    });

    return (
        <group ref={groupRef} position={[-6, 0, 0]} rotation={[1, 0, 0]}>
            <mesh>
                <torusKnotGeometry args={[1.5, 0.4, 200, 32, 4, 3]} />
                <meshBasicMaterial color={WIREFRAME_COLOR} wireframe wireframeLinewidth={1} transparent />
            </mesh>
            <mesh scale={[1.1, 1.1, 1.5]}>
                <torusKnotGeometry args={[1.5, 0.2, 100, 32, 4, 3]} />
                <meshBasicMaterial color={ACCENT_COLOR} wireframe wireframeLinewidth={1} transparent />
            </mesh>
            <mesh scale={[0.5, 0.5, 2]}>
                <torusKnotGeometry args={[1, 0.5, 100, 16, 2, 5]} />
                <meshBasicMaterial color={ACCENT_COLOR} wireframe wireframeLinewidth={2} transparent />
            </mesh>
        </group>
    );
}

// --- SHADERS ---
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const CosmicShaderMaterial = shaderMaterial(
    { uTime: 0, uColor: new THREE.Color(ACCENT_COLOR), uOpacity: 0 },
    // Vertex Shader
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    // Fragment Shader
    `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      float len = length(uv);
      
      // Crazy warping time
      float t = uTime * 0.5;
      
      // Dynamic noise/plasma
      float val = sin(uv.x * 10.0 + t) + sin(uv.y * 10.0 + t) + sin((uv.x + uv.y) * 10.0 + t);
      val += sin(len * 20.0 - t * 2.0);
      
      // Concentric rings/tunnel
      float ring = abs(sin(len * 20.0 - t * 5.0));
      
      // Mix colors
      vec3 finalColor = mix(vec3(0.0), uColor, ring * 0.5 + 0.5);
      finalColor += vec3(val * 0.2);
      
      // Vignette to fade edges
      float alpha = uOpacity * (1.0 - smoothstep(0.4, 1.0, len));

      gl_FragColor = vec4(finalColor, alpha * 0.6); // Base opacity
    }
  `
);

extend({ CosmicShaderMaterial });

// 2.5. COSMIC VIDEO EFFECT (GLOBAL BACKGROUND - Starts after Hero)
function AbstractCosmicEffect() {
    const materialRef = useRef<any>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const scroll = useScroll();

    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current) return;
        const offset = scroll.offset;

        // Start appearing after Hero (0.20), fade in quickly
        if (offset < 0.15) {
            meshRef.current.visible = false;
            return;
        }
        meshRef.current.visible = true;

        // Fade in from 0.15 to 0.25, then stay visible
        const fadeIn = normalize(offset, 0.15, 0.25);
        let opacity = fadeIn;

        // BIG BANG SYNC (0.8+)
        // As scroll approaches 1.0, the effect goes wild
        let speedMultiplier = 1;
        if (offset > 0.8) {
            const bangProgress = normalize(offset, 0.8, 1.0);
            speedMultiplier = 1 + bangProgress * 10; // Speed up 10x
            opacity = 1 - bangProgress * 0.5; // Fade out slightly as white light takes over? Or keep bright?
            // Actually, let's keep it bright but warp it
            materialRef.current.uColor = new THREE.Color(ACCENT_COLOR).multiplyScalar(1 + bangProgress * 2); // Brighter
        } else {
            materialRef.current.uColor = new THREE.Color(ACCENT_COLOR);
        }

        materialRef.current.uTime = state.clock.elapsedTime * speedMultiplier;
        materialRef.current.uOpacity = opacity;

        // Slight rotation for extra movement
        meshRef.current.rotation.z = state.clock.elapsedTime * 0.05 * speedMultiplier;
    });

    return (
        <mesh ref={meshRef} position={[0, 0, -4]} scale={[25, 15, 1]}>
            <planeGeometry args={[1, 1, 32, 32]} />
            {/* @ts-ignore */}
            <cosmicShaderMaterial ref={materialRef} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
    );
}

// --- HERO SHADER (CREATIVE AURORA) ---
const HeroAuroraMaterial = shaderMaterial(
    { uTime: 0, uColor1: new THREE.Color('#00FFFF'), uColor2: new THREE.Color('#8A2BE2'), uColor3: new THREE.Color('#32CD32'), uOpacity: 0 },
    // Vertex
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    // Fragment
    `
    uniform float uTime;
    uniform vec3 uColor1; // Cyan
    uniform vec3 uColor2; // Purple
    uniform vec3 uColor3; // Lime
    uniform float uOpacity;
    varying vec2 vUv;

    // Simple noise function
    float random (in vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // Value noise
    float noise (in vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.8; // FASTER SPEED
      
      // Distort UVs to create "curtains"
      float n = noise(vec2(uv.x * 8.0 + t, uv.y * 2.5)); // Denser noise
      
      // Calculate vertical bands - Layered for fullness
      float aurora = sin(uv.y * 3.0 + n * 4.0);
      aurora += sin(uv.x * 5.0 + t * 0.5) * 0.5;
      aurora += noise(uv * 3.0 + t) * 0.5; // Fill gaps
      
      // Sharpness but fuller
      aurora = smoothstep(-0.2, 1.0, aurora); // Allow negative range to fill black spots
      
      // Bottom fade (horizon) - Less aggressive fade
      float fade = smoothstep(0.0, 0.3, uv.y) * (1.0 - smoothstep(0.85, 1.0, uv.y));
      
      // Dynamic Color Mixing (3 Colors)
      float mixVal = sin(uv.x * 2.0 + t) * 0.5 + 0.5;
      vec3 c1 = mix(uColor1, uColor2, mixVal);
      vec3 finalColor = mix(c1, uColor3, sin(uv.y * 5.0 + t) * 0.5 + 0.5);
      
      // Boost brightness to avoid dullness
      gl_FragColor = vec4(finalColor * 1.2, uOpacity * aurora * fade * 0.8); 
    }
  `
);

extend({ HeroAuroraMaterial });


// 2.6. HERO SUBTLE EFFECT (Starts at 0, fades out)
function HeroSubtleEffect() {
    const materialRef = useRef<any>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const scroll = useScroll();

    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current) return;
        const offset = scroll.offset;

        if (offset > 0.25) {
            meshRef.current.visible = false;
            return;
        }
        meshRef.current.visible = true;

        // Fade out
        const opacity = 1.0 * (1 - normalize(offset, 0.0, 0.25));

        materialRef.current.uTime = state.clock.elapsedTime;
        materialRef.current.uOpacity = opacity;

        // No rotation, just static curtains flowing
    });

    return (
        <mesh ref={meshRef} position={[0, 2, -8]} scale={[40, 20, 1]}>
            <planeGeometry args={[1, 1, 64, 64]} />
            {/* @ts-ignore */}
            <heroAuroraMaterial ref={materialRef} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
    );
}

// 3. SOLAR SYSTEM (SHOP) - Window: 0.40 -> 0.60
function AbstractSolarSystem() {
    const groupRef = useRef<THREE.Group>(null);
    const scroll = useScroll();

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const offset = scroll.offset;

        if (offset < 0.40 || offset > 0.60) {
            groupRef.current.visible = false;
            return;
        }
        groupRef.current.visible = true;

        const opacity = calculateOpacity(offset, 0.40, 0.60);
        const scale = 2.2;

        groupRef.current.rotation.z = Math.PI / 6;
        groupRef.current.rotation.y += delta * 0.05;

        const progress = normalize(offset, 0.40, 0.60);

        // REVERTED: Move to RIGHT (Original)
        groupRef.current.position.x = 9 - progress * 3; // Right side

        groupRef.current.position.z = -5;
        groupRef.current.scale.setScalar(scale);

        groupRef.current.children.forEach((child: any) => {
            if (child.material) child.material.opacity = opacity;
        })
    });

    return (
        <group ref={groupRef} position={[6, 0, 0]}> {/* Position Right */}
            <mesh>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial color={ACCENT_COLOR} wireframe transparent />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.5, 1.55, 64]} />
                <meshBasicMaterial color={WIREFRAME_COLOR} side={THREE.DoubleSide} transparent />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[2.5, 2.55, 64]} />
                <meshBasicMaterial color={WIREFRAME_COLOR} side={THREE.DoubleSide} transparent />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[3.5, 3.55, 64]} />
                <meshBasicMaterial color={WIREFRAME_COLOR} side={THREE.DoubleSide} transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

// 4. SCRIBBLES (JOURNAL) - Window: 0.60 -> 0.80
function AbstractScribbles() {
    const groupRef = useRef<THREE.Group>(null);
    const scroll = useScroll();

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const offset = scroll.offset;

        if (offset < 0.60 || offset > 0.80) {
            groupRef.current.visible = false;
            return;
        }
        groupRef.current.visible = true;

        const opacity = calculateOpacity(offset, 0.60, 0.80);
        const scale = 2.5;

        groupRef.current.rotation.x += delta * 0.1;
        groupRef.current.rotation.y += delta * 0.15;

        const progress = normalize(offset, 0.60, 0.80);
        // Pushed further LEFT (-6)
        groupRef.current.position.x = -9 + progress * 3;
        groupRef.current.position.z = -5;
        groupRef.current.scale.setScalar(scale);

        groupRef.current.children.forEach((child: any) => {
            if (child.material) child.material.opacity = opacity * 0.6;
        })
    });

    return (
        <group ref={groupRef} position={[-6, 0, 0]}>
            <mesh>
                <torusKnotGeometry args={[1, 0.3, 200, 32, 2, 5]} />
                <meshBasicMaterial color={WIREFRAME_COLOR} wireframe transparent />
            </mesh>
            <mesh scale={0.7}>
                <torusKnotGeometry args={[0.8, 0.2, 100, 16, 3, 7]} />
                <meshBasicMaterial color={ACCENT_COLOR} wireframe transparent opacity={0.6} />
            </mesh>
        </group>
    );
}

// 5. BIG BANG (CTA) - Window: 0.82 -> 1.0
function AbstractBigBang() {
    const particlesRef = useRef<THREE.Points>(null);
    const ringsRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const scroll = useScroll();

    // Create random explosion vectors
    const particles = useMemo(() => {
        const count = 4000;
        const array = new Float32Array(count * 3);
        const randoms = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);
            randoms[i * 3] = x; randoms[i * 3 + 1] = y; randoms[i * 3 + 2] = z;
            array[i * 3] = 0; array[i * 3 + 1] = 0; array[i * 3 + 2] = 0;
        }
        return { array, randoms };
    }, []);

    useFrame((state, delta) => {
        if (!particlesRef.current || !ringsRef.current || !coreRef.current) return;
        const offset = scroll.offset;

        if (offset < 0.75) {
            particlesRef.current.visible = false;
            ringsRef.current.visible = false;
            coreRef.current.visible = false;
            return;
        }
        particlesRef.current.visible = true;
        ringsRef.current.visible = true;
        coreRef.current.visible = true;

        const explosionStart = 0.82;

        if (offset < explosionStart) {
            // Pre-bang
            const buildup = normalize(offset, 0.75, explosionStart);
            const shake = buildup * 0.1;
            coreRef.current.position.set(
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake
            );
            coreRef.current.scale.setScalar(0.5 + buildup * 0.5);
            // @ts-ignore
            coreRef.current.material.color.set(WIREFRAME_COLOR);
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length; i++) positions[i] = 0;
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
            ringsRef.current.scale.setScalar(0.01);
        } else {
            // Bang
            const progress = normalize(offset, explosionStart, 1.0);
            const explosivePower = Math.pow(progress, 3) * 35;
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < 4000; i++) {
                positions[i * 3] = particles.randoms[i * 3] * explosivePower;
                positions[i * 3 + 1] = particles.randoms[i * 3 + 1] * explosivePower;
                positions[i * 3 + 2] = particles.randoms[i * 3 + 2] * explosivePower;
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;

            const coreScale = 1 + Math.pow(progress, 4) * 60;
            coreRef.current.scale.setScalar(coreScale);
            // @ts-ignore
            coreRef.current.material.color.set(progress < 0.2 ? WIREFRAME_COLOR : ACCENT_COLOR);
            // @ts-ignore
            coreRef.current.material.opacity = Math.max(0, 1 - progress * 1.5);

            ringsRef.current.scale.setScalar(progress * 25);
            ringsRef.current.rotation.z += delta * 2;
            ringsRef.current.rotation.x += delta * 2;
        }
    });

    return (
        <group position={[0, 0, 0]}>
            <mesh ref={coreRef}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial color={WIREFRAME_COLOR} transparent opacity={0.8} />
            </mesh>
            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={4000} array={particles.array} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.05} color={ACCENT_COLOR} sizeAttenuation transparent opacity={0.8} />
            </points>
            <group ref={ringsRef}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1, 0.02, 16, 100]} />
                    <meshBasicMaterial color={WIREFRAME_COLOR} transparent opacity={0.5} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[1, 0.02, 16, 100]} />
                    <meshBasicMaterial color={WIREFRAME_COLOR} transparent opacity={0.5} />
                </mesh>
                <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
                    <torusGeometry args={[1, 0.05, 16, 100]} />
                    <meshBasicMaterial color={ACCENT_COLOR} transparent opacity={0.6} />
                </mesh>
            </group>
        </group>
    );
}

// --- CURSOR PARALLAX RIG ---
function Rig() {
    const { camera, pointer } = useThree();
    useFrame(() => {
        // Linearly interpolate camera position based on pointer
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.5, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 0.5, 0.05);
        camera.lookAt(0, 0, 0); // Always look at center
    });
    return null;
}

// --- HTML OVERLAY SECTIONS ---

const Section = ({ align = 'left', children }: { align?: 'left' | 'right' | 'center', children: React.ReactNode }) => (
    <section
        className={`h-screen w-screen flex flex-col justify-center p-8 md:p-24 pointer-events-none relative
      ${align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center'}
    `}
    >
        <div className="max-w-4xl pointer-events-auto relative z-10">
            {children}
        </div>
    </section>
);

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-start gap-5">
        <div className="p-3 bg-black/5 rounded-xl shrink-0">
            <Icon size={28} color={ACCENT_COLOR} />
        </div>
        <div className="text-left">
            <h4 className="font-bold text-lg text-black mb-1">{title}</h4>
            <p className="text-base text-gray-700 leading-relaxed font-medium opacity-80">{desc}</p>
        </div>
    </div>
);

// --- FRAMER MOTION IMPORTS ---
import { AnimatePresence, motion } from 'framer-motion';

// --- HELPER: CYCLING CARD ---
function CyclingCard({ items, interval = 3000, className = "" }: { items: React.ReactNode[], interval?: number, className?: string }) {
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % items.length);
        }, interval);
        return () => clearInterval(timer);
    }, [items.length, interval]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex items-center justify-center w-full h-full"
                >
                    {items[index]}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function HTMLContent() {
    // --- CONTENT DEFINITIONS ---
    const logoItems = [
        <div className="flex items-center gap-3" key="1">
            <div className="bg-black text-white p-2 rounded-lg"><Zap size={24} fill="white" /></div>
            <span className="text-xl font-black tracking-widest text-black/80">FUY</span>
        </div>,
        <div className="flex items-center gap-3" key="2">
            <div className="bg-accent text-white p-2 rounded-lg" style={{ backgroundColor: ACCENT_COLOR }}><Globe size={24} /></div>
            <span className="text-lg font-bold tracking-tight text-black">Find Yourself</span>
        </div>
    ];

    const centerItems = [
        <p key="1" className="text-sm md:text-base font-semibold text-gray-900 tracking-wide">
            The best place to <span style={{ color: ACCENT_COLOR }}>connect</span> & bond.
        </p>,
        <p key="2" className="text-sm md:text-base font-semibold text-gray-900 tracking-wide flex items-center gap-2">
            <Rocket size={18} color={ACCENT_COLOR} /> Explore 1M+ Infinite Realities
        </p>,
        <p key="3" className="text-sm md:text-base font-semibold text-gray-900 tracking-wide flex items-center gap-2">
            <ShoppingBag size={18} color={ACCENT_COLOR} /> Trade Goods Across Stars
        </p>,
        <p key="4" className="text-sm md:text-base font-semibold text-gray-900 tracking-wide">
            <span style={{ color: ACCENT_COLOR }}>Everything</span> you need in one place.
        </p>
    ];

    const signupItems = [
        <div className="flex items-center gap-2" key="1">
            <span className="font-bold text-base">Sign Up</span> <ArrowRight size={16} />
        </div>,
        <div className="flex items-center gap-2" key="2">
            <span className="font-bold text-base text-accent" style={{ color: ACCENT_COLOR }}>Explore</span> <Star size={16} fill={ACCENT_COLOR} color={ACCENT_COLOR} />
        </div>
    ];

    return (
        <Scroll html style={{ width: '100vw' }}>

            {/* --- FIXED MODULAR HEADER (EXTREME TOP) --- */}
            <div className="fixed top-0 left-0 w-screen px-6 py-6 z-50 flex justify-between items-start pointer-events-none">

                {/* 1. LOGO CARD (Left) */}
                <div className="bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/30 shadow-2xl pointer-events-auto cursor-pointer group hover:scale-105 transition-transform w-[220px] h-[72px] flex items-center justify-center">
                    <CyclingCard items={logoItems} interval={4000} className="w-full h-full" />
                </div>

                {/* 2. CENTER CARD (Middle) */}
                <div className="bg-white/10 backdrop-blur-xl px-1 rounded-full border border-white/30 shadow-xl hidden md:flex items-center justify-center min-w-[400px] h-[64px] hover:bg-white/20 transition-colors pointer-events-auto">
                    <CyclingCard items={centerItems} interval={3000} className="w-full h-full" />
                </div>

                {/* 3. SIGNUP CARD (Right) */}
                <Link href="/signup">
                    <div className="bg-black text-white px-1 rounded-2xl border border-gray-800 shadow-2xl hover:scale-105 transition-transform cursor-pointer pointer-events-auto w-[160px] h-[64px] flex items-center justify-center overflow-hidden">
                        <CyclingCard items={signupItems} interval={3500} className="w-full h-full" />
                    </div>
                </Link>
            </div>

            {/* PAGE 1: HERO */}
            <Section align="left">
                {/* MAIN HERO CONTENT */}
                <h1 className="text-7xl md:text-[8rem] font-black tracking-tighter mb-8 text-black leading-[0.9] mt-20 md:mt-0">
                    ENTER THE <br />
                    <span style={{ color: ACCENT_COLOR }}>FUY GALAXY</span>
                </h1>
                <p className="text-2xl md:text-3xl text-gray-800 mb-10 max-w-2xl font-light border-l-8 border-black pl-8">
                    Make friends, find people, bond, and make meaningful connections.
                    Drift through the noise and find your authentic orbit.
                </p>
                <div className="flex gap-4">
                    <Link href="/explore">
                        <button className="px-10 py-5 bg-black text-white text-xl font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-3 shadow-2xl">
                            Explore <ArrowRight size={24} />
                        </button>
                    </Link>
                </div>
            </Section>

            {/* PAGE 2: INFINITE REALITIES (Centered) */}
            <Section align="center">
                <h2 className="text-6xl md:text-8xl font-black mb-6 text-black tracking-tight leading-none">
                    INFINITE <br />
                    <span style={{ color: ACCENT_COLOR }}>REALITIES</span>
                </h2>
                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-t-8 border-black max-w-2xl mx-auto mb-8 shadow-lg">
                    <h3 className="text-3xl font-bold mb-3 flex items-center gap-3 justify-center">
                        Hopin <Rocket size={32} color={ACCENT_COLOR} />
                    </h3>
                    <p className="text-xl text-gray-800 text-center leading-relaxed font-medium">
                        Jump into the cosmic multiverse of spontaneous events.
                        From underground meetups to global live streams.
                    </p>
                </div>
                {/* Feature Grid - Centered (mx-auto) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <FeatureCard icon={Radio} title="Live Broadcasts" desc="Stream your reality to the entire galaxy in real-time." />
                    <FeatureCard icon={MapPin} title="Local Meetups" desc="Discover spontaneous gatherings happening near you." />
                    <FeatureCard icon={Globe} title="Global Events" desc="Tickets to massive virtual concerts and conferences." />
                    <FeatureCard icon={Zap} title="Instant Hops" desc="Jump between portals with zero latency." />
                </div>
            </Section>

            {/* PAGE 3: TRADE ACROSS STARS (Text RIGHT) */}
            <Section align="right">
                <h2 className="text-6xl md:text-8xl font-black mb-6 text-black tracking-tight leading-none">
                    TRADE <br />
                    <span style={{ color: ACCENT_COLOR }}>ACROSS STARS</span>
                </h2>
                {/* Right Aligned Border */}
                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-r-8 border-black max-w-2xl ml-auto mb-8 shadow-lg">
                    <h3 className="text-3xl font-bold mb-3 flex items-center gap-3">
                        <ShoppingBag size={32} color="black" /> Universal Market
                    </h3>
                    <p className="text-xl text-gray-800 leading-relaxed font-medium">
                        A decentralized marketplace. Sell your digital assets and physical goods
                        across the solar system. Accessible from anywhere in the verse.
                    </p>
                </div>
                {/* Feature Grid - Centered (mx-auto) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <FeatureCard icon={Box} title="Physical Goods" desc="Global shipping integrations for real-world items." />
                    <FeatureCard icon={ImageIcon} title="Digital Assets" desc="Mint and trade NFTs, art, and music instantly." />
                    <FeatureCard icon={CreditCard} title="Secure Pay" desc="Encrypted transactions across all planetary borders." />
                    <FeatureCard icon={Star} title="Creator Tools" desc="Powerful shops for brands and artists." />
                </div>
            </Section>

            {/* PAGE 4: CHRONICLE YOUR WORLD (Text Left) */}
            <Section align="left">
                <h2 className="text-6xl md:text-8xl font-black mb-6 text-black tracking-tight leading-none">
                    CHRONICLE <br />
                    <span style={{ color: ACCENT_COLOR }}>YOUR WORLD</span>
                </h2>
                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-l-8 border-black max-w-2xl mb-8 shadow-lg">
                    <h3 className="text-3xl font-bold mb-3 flex items-center gap-3">
                        <Palette size={32} color="black" /> Journal
                    </h3>
                    <p className="text-xl text-gray-800 leading-relaxed font-medium">
                        Every planet has a history. Document yours.
                        Write and create without boundaries.
                    </p>
                </div>
                {/* Feature Grid - Centered (mx-auto) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <FeatureCard icon={ImageIcon} title="Rich Media" desc="Embed video, audio, and holograms in your posts." />
                    <FeatureCard icon={Lock} title="Private Orbit" desc="Control exactly who sees your chronicles." />
                    <FeatureCard icon={Palette} title="Custom Themes" desc="Style your journal to match your vibe." />
                    <FeatureCard icon={Book} title="Story Mode" desc="Link chapters to tell a long-form saga." />
                </div>
            </Section>

            {/* PAGE 5: CTA (Center) */}
            <Section align="center">
                <div className="relative mb-8">
                    <h2 className="text-9xl md:text-[14rem] font-black text-black opacity-90 leading-none tracking-tighter">
                        F U Y
                    </h2>
                </div>
                <p className="text-3xl text-gray-800 mb-12 max-w-3xl mx-auto font-medium">
                    The universe is vast. Don't drift alone. <br />
                    Join thousands of explorers today.
                </p>
                <Link href="/signup">
                    <button
                        className="px-20 py-8 text-3xl font-bold rounded-full text-white hover:scale-110 transition-transform shadow-2xl flex items-center gap-4 mx-auto"
                        style={{ backgroundColor: ACCENT_COLOR }}
                    >
                        <Zap fill="white" size={32} /> LAUNCH NOW
                    </button>
                </Link>
            </Section>

            {/* PAGE 6: SPACER FOR EXPLOSION */}
            <section className="h-screen w-screen" />

            {/* PAGE 7: EXTRA SPACER (Added) */}
            <section className="h-screen w-screen" />

            {/* PAGE 8: FINAL MESSAGE (Black Void - Post Big Bang) */}
            <section className="h-screen w-screen flex flex-col justify-center items-center text-center p-0 relative bg-black">
                {/* White Underline (border-white) */}
                <h1 className="text-4xl md:text-[6rem] font-black text-white tracking-[0.2em] leading-snug break-words max-w-[90vw]">
                    <span style={{ color: '#FF6060' }}>F</span>IND<span style={{ color: '#D00000' }} className="border-b-[0.5rem] md:border-b-[1rem] border-white pb-2 md:pb-4 inline-block leading-[0.8]">U</span>O<span style={{ color: '#D00000' }} className="border-b-[0.5rem] md:border-b-[1rem] border-white pb-2 md:pb-4 inline-block leading-[0.8]">Y</span>RSELF
                </h1>
            </section>
        </Scroll>
    );
}

// --- MAIN COMPONENT ---

export default function Scene3D() {
    return (
        <div className="w-full h-screen bg-[#E0E0E0]">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ antialias: true }}
                dpr={[1, 2]}
            >
                <color attach="background" args={[BG_COLOR]} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 10, 5]} intensity={1.2} />

                {/* Increased to 8 Pages for Extra Space */}
                <ScrollControls pages={8} damping={0.5} distance={1}>

                    <AbstractGalaxy />
                    <AbstractMilkyWayScribble />
                    <HeroSubtleEffect /> {/* Added Hero Effect */}
                    <AbstractCosmicEffect /> {/* Added Effect */}
                    <AbstractSolarSystem />
                    <AbstractScribbles />
                    <AbstractBigBang />

                    {/* Rig Component for Parallax */}
                    <Rig />

                    <HTMLContent />

                </ScrollControls>

                <fog attach="fog" args={[BG_COLOR, 5, 25]} />
            </Canvas>
        </div>
    );
}

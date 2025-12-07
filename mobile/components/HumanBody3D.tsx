import React, { useRef, useState } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber/native';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';

interface BodyPartProps {
    position: [number, number, number];
    args: [number, number, number]; // [width, height, depth]
    color: string;
    opacity?: number;
    name: string;
    onPartClick?: (name: string) => void;
    selected?: boolean;
    hitboxScale?: [number, number, number]; // Scale multiplier for the clickable area
}

function BodyPart({ position, args, color, opacity = 1, name, onPartClick, selected, hitboxScale = [1.2, 1.0, 1.2] }: BodyPartProps) {
    const [hovered, setHovered] = useState(false);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (onPartClick) onPartClick(name);
    };

    const isHighlighted = selected || hovered;

    // Calculate hitbox dimensions based on visual dimensions * scale factor
    const hitArgs: [number, number, number] = [
        args[0] * hitboxScale[0],
        args[1] * hitboxScale[1],
        args[2] * hitboxScale[2]
    ];

    return (
        <group position={position}>
            {/* 1. VISUAL MESH (Non-Interactive "Ghost") */}
            <mesh pointerEvents="none">
                <boxGeometry args={args} />
                <meshStandardMaterial
                    color={isHighlighted ? '#ff8800' : color}
                    emissive={isHighlighted ? '#ff4400' : '#000000'}
                    emissiveIntensity={isHighlighted ? 0.6 : 0}
                    transparent
                    opacity={opacity}
                />
                <lineSegments>
                    <edgesGeometry args={[new THREE.BoxGeometry(...args)]} />
                    <lineBasicMaterial color={isHighlighted ? 'white' : 'cyan'} transparent opacity={0.3} />
                </lineSegments>
            </mesh>

            {/* 2. HITBOX MESH (Invisible, Interactive "Collider") */}
            {/* This mesh determines the click area. It is larger than the visual mesh. */}
            <mesh onClick={handleClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} visible={false}>
                <boxGeometry args={hitArgs} />
                <meshBasicMaterial color="red" wireframe />
            </mesh>
        </group>
    );
}

function HumanFigure({ onPartClick, selectedPart }: { onPartClick?: (name: string) => void, selectedPart?: string | null }) {
    const group = useRef<THREE.Group>(null);
    return (
        <group ref={group}>
            {/* Head Area */}
            <BodyPart name="Head" position={[0, 1.75, 0]} args={[0.25, 0.3, 0.25]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Head"} hitboxScale={[1.5, 1.2, 1.5]} />
            <BodyPart name="Neck" position={[0, 1.5, 0]} args={[0.1, 0.15, 0.1]} color="#333" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Neck"} />

            {/* Torso Area - Visuals are thin, Hitboxes match Core */}
            <BodyPart name="Chest" position={[0, 1.25, 0]} args={[0.35, 0.35, 0.2]} color="#111" opacity={0.9} onPartClick={onPartClick} selected={selectedPart === "Chest"} hitboxScale={[1.1, 1, 1.5]} />
            <BodyPart name="Abs" position={[0, 0.9, 0]} args={[0.32, 0.4, 0.2]} color="#111" opacity={0.9} onPartClick={onPartClick} selected={selectedPart === "Abs"} />
            <BodyPart name="Hips" position={[0, 0.6, 0]} args={[0.35, 0.25, 0.2]} color="#111" opacity={0.9} onPartClick={onPartClick} selected={selectedPart === "Hips"} />

            {/* Left Arm (Wide Stance: +/- 0.8) */}
            <BodyPart name="Left Shoulder" position={[-0.8, 1.35, 0]} args={[0.16, 0.16, 0.16]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Shoulder"} hitboxScale={[2, 2, 2]} />
            <BodyPart name="Left Arm" position={[-0.8, 1.05, 0]} args={[0.13, 0.4, 0.13]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Arm"} hitboxScale={[2, 1, 2]} />
            <BodyPart name="Left Elbow" position={[-0.8, 0.8, 0]} args={[0.12, 0.13, 0.12]} color="#333" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Elbow"} hitboxScale={[2, 2, 2]} />
            <BodyPart name="Left Forearm" position={[-0.8, 0.55, 0]} args={[0.12, 0.35, 0.12]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Forearm"} hitboxScale={[2, 1, 2]} />
            <BodyPart name="Left Hand" position={[-0.8, 0.3, 0]} args={[0.11, 0.18, 0.09]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Hand"} hitboxScale={[2.5, 1.5, 2.5]} />

            {/* Right Arm (Wide Stance: +/- 0.8) */}
            <BodyPart name="Right Shoulder" position={[0.8, 1.35, 0]} args={[0.16, 0.16, 0.16]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Shoulder"} hitboxScale={[2, 2, 2]} />
            <BodyPart name="Right Arm" position={[0.8, 1.05, 0]} args={[0.13, 0.4, 0.13]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Arm"} hitboxScale={[2, 1, 2]} />
            <BodyPart name="Right Elbow" position={[0.8, 0.8, 0]} args={[0.12, 0.13, 0.12]} color="#333" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Elbow"} hitboxScale={[2, 2, 2]} />
            <BodyPart name="Right Forearm" position={[0.8, 0.55, 0]} args={[0.12, 0.35, 0.12]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Forearm"} hitboxScale={[2, 1, 2]} />
            <BodyPart name="Right Hand" position={[0.8, 0.3, 0]} args={[0.11, 0.18, 0.09]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Hand"} hitboxScale={[2.5, 1.5, 2.5]} />

            {/* Left Leg */}
            <BodyPart name="Left Thigh" position={[-0.25, 0.25, 0]} args={[0.17, 0.45, 0.17]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Thigh"} />
            <BodyPart name="Left Knee" position={[-0.25, -0.05, 0]} args={[0.16, 0.17, 0.16]} color="#333" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Knee"} hitboxScale={[1.5, 1.5, 1.5]} />
            <BodyPart name="Left Calf" position={[-0.25, -0.4, 0]} args={[0.15, 0.45, 0.15]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Calf"} />
            <BodyPart name="Left Ankle" position={[-0.25, -0.7, 0]} args={[0.14, 0.15, 0.14]} color="#333" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Ankle"} hitboxScale={[1.5, 1.5, 1.5]} />
            <BodyPart name="Left Foot" position={[-0.25, -0.85, 0.1]} args={[0.15, 0.12, 0.35]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Left Foot"} hitboxScale={[2, 1.5, 2]} />

            {/* Right Leg */}
            <BodyPart name="Right Thigh" position={[0.25, 0.25, 0]} args={[0.17, 0.45, 0.17]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Thigh"} />
            <BodyPart name="Right Knee" position={[0.25, -0.05, 0]} args={[0.16, 0.17, 0.16]} color="#333" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Knee"} hitboxScale={[1.5, 1.5, 1.5]} />
            <BodyPart name="Right Calf" position={[0.25, -0.4, 0]} args={[0.15, 0.45, 0.15]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Calf"} />
            <BodyPart name="Right Ankle" position={[0.25, -0.7, 0]} args={[0.14, 0.15, 0.14]} color="#333" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Ankle"} hitboxScale={[1.5, 1.5, 1.5]} />
            <BodyPart name="Right Foot" position={[0.25, -0.85, 0.1]} args={[0.15, 0.12, 0.35]} color="#222" opacity={0.8} onPartClick={onPartClick} selected={selectedPart === "Right Foot"} hitboxScale={[2, 1.5, 2]} />
        </group>
    );
}

export default function HumanBody3D({ onPartClick, selectedPart }: { onPartClick?: (name: string) => void, selectedPart?: string | null }) {
    return (
        <Canvas style={{ width: '100%', height: 400 }} camera={{ position: [0, 1, 4.5], fov: 45 }}>
            {/* Perspective Camera for natural look, but narrow FOV to limit distortion */}
            <ambientLight intensity={0.5} color="cyan" />
            <pointLight position={[10, 10, 10]} intensity={1} color="blue" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="purple" />

            <HumanFigure onPartClick={onPartClick} selectedPart={selectedPart} />

            <OrbitControls
                makeDefault
                enableZoom={true}
                enablePan={false}
                minDistance={3.0} // Limit how close you can get (keeps scene stable)
                maxDistance={7.0} // Limit how far (prevents losing model)
                target={[0, 0.5, 0]}
            />

            {/* Floor Grid for perspective */}
            <gridHelper args={[10, 10, 0x444444, 0x222222]} position={[0, -1.5, 0]} />
        </Canvas>
    );
}

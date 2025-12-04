import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { PostNode } from './PostNode';

interface GlobeContentProps {
    position: [number, number, number];
    posts: any[];
    onPostClick: (post: any) => void;
    showLines: boolean;
    label: string;
    scale?: number;
    color?: string;
    hasRing?: boolean;
    onGlobeClick?: () => void;
    isFocused?: boolean;
}

function PostsSphere({ posts, onPostClick, radius, isFocused }: { posts: any[], onPostClick: (post: any) => void, radius: number, isFocused?: boolean }) {
    // Determine visible posts based on focus state
    // Initial: 28 posts. Focused: Show all (or more).
    const visiblePosts = useMemo(() => {
        if (isFocused) return posts;
        return posts.slice(0, 28);
    }, [posts, isFocused]);

    // Calculate positions - Distribute INSIDE the sphere
    const postPositions = useMemo(() => {
        return visiblePosts.map((post, i) => {
            // Random point inside sphere
            // u, v are random 0..1
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);

            // Random radius between 0.3 * R and 0.9 * R to keep them inside but not too close to center
            const r = radius * (0.3 + 0.6 * Math.cbrt(Math.random()));

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            return { post, position: [x, y, z] as [number, number, number] };
        });
    }, [visiblePosts, radius]);

    return (
        <group>
            {postPositions.map(({ post, position }, i) => (
                <PostNode
                    key={post.id || i}
                    post={post}
                    position={position}
                    onClick={onPostClick}
                />
            ))}
        </group>
    );
}

export function GlobeContent({
    position,
    posts,
    onPostClick,
    showLines,
    label,
    scale = 1,
    color = "#ffffff",
    hasRing = true,
    onGlobeClick,
    isFocused = false
}: GlobeContentProps) {
    const groupRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    // Rotate the ring slowly
    useFrame((state, delta) => {
        if (ringRef.current) {
            ringRef.current.rotation.z += delta * 0.1;
            ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
        if (groupRef.current) {
            // Self-rotation of the globe group
            groupRef.current.rotation.y += delta * 0.05;
        }
    });

    const radius = 7.8 * scale;

    return (
        <group position={position} onClick={(e) => {
            if (onGlobeClick) {
                e.stopPropagation();
                onGlobeClick();
            }
        }}>
            {/* Label */}
            <Html
                position={[0, radius + 4, 0]}
                center
                style={{ pointerEvents: 'none' }}
            >
                <div
                    className="text-white font-bold whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                    style={{ fontSize: `${2 * scale}rem`, fontFamily: 'Inter, sans-serif' }}
                >
                    {label}
                </div>
            </Html>

            <group ref={groupRef}>
                {/* Wireframe Sphere */}
                <mesh>
                    <sphereGeometry args={[radius, 32, 32]} />
                    <meshBasicMaterial color={color} wireframe={showLines} transparent opacity={showLines ? 0.1 : 0} />
                </mesh>

                {/* Posts */}
                <PostsSphere posts={posts} onPostClick={onPostClick} radius={radius} isFocused={isFocused} />
            </group>

            {/* Circular Disk (Ring) */}
            {hasRing && showLines && (
                <>
                    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[radius * 1.2, radius * 1.6, 64]} />
                        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
                    </mesh>

                    {/* Inner glowing ring */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[radius * 1.15, radius * 1.18, 64]} />
                        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
                    </mesh>
                </>
            )}
        </group>
    );
}

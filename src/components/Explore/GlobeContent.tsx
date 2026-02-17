import React, { useMemo, useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
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

// Seeded random number generator for stable positions
function seededRandom(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Memoized PostsSphere with stable positions
const PostsSphere = React.memo(function PostsSphere({
    posts,
    onPostClick,
    radius,
    isFocused
}: {
    posts: any[],
    onPostClick: (post: any) => void,
    radius: number,
    isFocused?: boolean
}) {
    // Limit visible posts for performance
    const MAX_VISIBLE = 20;
    const visiblePosts = useMemo(() => {
        if (isFocused) return posts.slice(0, MAX_VISIBLE);
        return posts.slice(0, Math.min(15, posts.length));
    }, [posts, isFocused]);

    // Calculate stable positions using post IDs as seeds
    const postPositions = useMemo(() => {
        return visiblePosts.map((post, i) => {
            // Use post ID hash as seed for stable positions
            const seed = post.id ?
                post.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) :
                i * 1000;

            const u = seededRandom(seed);
            const v = seededRandom(seed + 1);
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);

            // Random radius between 0.4 * R and 0.85 * R
            const r = radius * (0.4 + 0.45 * seededRandom(seed + 2));

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
});

export const GlobeContent = React.memo(function GlobeContent({
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
    const { invalidate } = useThree();
    const lastRotation = useRef(0);

    // Throttled rotation - only update every 50ms
    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const now = state.clock.elapsedTime;
        if (now - lastRotation.current > 0.05) {
            groupRef.current.rotation.y += delta * 0.03; // Slower rotation
            lastRotation.current = now;
            invalidate(); // Request new frame
        }
    });

    const radius = 7.8 * scale;

    // Memoized click handler
    const handleClick = useCallback((e: any) => {
        if (onGlobeClick) {
            e.stopPropagation();
            onGlobeClick();
        }
    }, [onGlobeClick]);

    // Memoized sphere geometry
    const sphereArgs = useMemo(() => [radius, 24, 24] as [number, number, number], [radius]);

    return (
        <group position={position} onClick={handleClick}>
            {/* Label */}
            {label && (
                <Html
                    position={[0, radius + 3, 0]}
                    center
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        className="text-white font-bold whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                        style={{ fontSize: `${1.5 * scale}rem`, fontFamily: 'Inter, sans-serif' }}
                    >
                        {label}
                    </div>
                </Html>
            )}

            <group ref={groupRef}>
                {/* Wireframe Sphere - lower polygon count */}
                <mesh>
                    <sphereGeometry args={sphereArgs} />
                    <meshBasicMaterial
                        color={color}
                        wireframe={showLines}
                        transparent
                        opacity={showLines ? 0.08 : 0}
                    />
                </mesh>

                {/* Posts */}
                <PostsSphere
                    posts={posts}
                    onPostClick={onPostClick}
                    radius={radius}
                    isFocused={isFocused}
                />
            </group>
        </group>
    );
});

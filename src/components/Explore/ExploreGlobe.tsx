import React, { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { PostNode } from './PostNode';
import * as THREE from 'three';

interface ExploreGlobeProps {
    posts: any[];
    onPostClick: (post: any) => void;
    showLines: boolean;
}

function PostsSphere({ posts, onPostClick }: { posts: any[], onPostClick: (post: any) => void }) {
    const radius = 8; // Radius of the sphere

    // Calculate positions using Fibonacci sphere algorithm
    const postPositions = useMemo(() => {
        return posts.map((post, i) => {
            const phi = Math.acos(1 - 2 * (i + 0.5) / posts.length);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

            const x = radius * Math.cos(theta) * Math.sin(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(phi);

            return { post, position: [x, y, z] as [number, number, number] };
        });
    }, [posts]);

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

const SceneThrottler = () => {
    useFrame((state) => {
        if (document.visibilityState === 'hidden') {
            state.gl.setAnimationLoop(null);
        }
    });
    return null;
};

export default function ExploreGlobe({ posts, onPostClick, showLines }: ExploreGlobeProps) {
    return (
        <div className="w-full h-screen absolute inset-0 z-0">
            <Canvas
                camera={{ position: [0, 0, 18], fov: 60 }}
                gl={{
                    powerPreference: 'low-power',
                    antialias: false,
                    failIfMajorPerformanceCaveat: true
                }}
                onCreated={({ gl }) => {
                    const canvas = gl.domElement;
                    canvas.addEventListener('webglcontextlost', (event) => {
                        event.preventDefault();
                        console.warn('WebGL context lost on ExploreGlobe.');
                    });
                    canvas.addEventListener('webglcontextrestored', () => {
                        console.log('WebGL context restored on ExploreGlobe.');
                    });
                }}
            >
                <SceneThrottler />
                <fog attach="fog" args={['#000', 15, 25]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />

                {/* Central Sphere for reference */}
                {showLines && (
                    <mesh>
                        <sphereGeometry args={[7.8, 32, 32]} />
                        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.05} />
                    </mesh>
                )}

                <PostsSphere posts={posts} onPostClick={onPostClick} />

                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    minDistance={5}
                    maxDistance={40}
                    autoRotate
                    autoRotateSpeed={0.5}
                    rotateSpeed={0.5}
                    zoomSpeed={0.8}
                />
            </Canvas>
        </div>
    );
}

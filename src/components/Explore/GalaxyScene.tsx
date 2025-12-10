import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { GlobeContent } from './GlobeContent';

interface GalaxySceneProps {
    posts: any[];
    chans: any[];
    lils: any[];
    fills: any[];
    auds: any[];
    chaptes: any[];
    xrays: any[];
    puds: any[];
    onPostClick: (post: any) => void;
    showLines: boolean;
}

export default function GalaxyScene({
    posts,
    chans,
    lils,
    fills,
    auds,
    chaptes,
    xrays,
    puds,
    onPostClick,
    showLines
}: GalaxySceneProps) {
    const [focusedGlobe, setFocusedGlobe] = React.useState<string | null>(null);

    // Configuration for satellite globes
    const satelliteRadius = 35; // Distance from center
    const satellites = [
        { data: chans, label: "Chans", color: "#FF5733" },   // Red-Orange
        { data: lils, label: "Lils", color: "#33FF57" },     // Green
        { data: fills, label: "Fills", color: "#3357FF" },   // Blue
        { data: auds, label: "Auds", color: "#F333FF" },     // Magenta
        { data: chaptes, label: "Chaptes", color: "#FF33A8" }, // Pink
        { data: xrays, label: "X Rays", color: "#33FFF5" },  // Cyan
        { data: puds, label: "Puds", color: "#FFFF00" },     // Yellow
    ];

    const handleGlobeClick = (label: string) => {
        // Only set focus if it's different. Don't toggle off.
        if (focusedGlobe !== label) {
            setFocusedGlobe(label);
        }
    };

    return (
        <div className="w-full h-screen absolute inset-0 z-0 bg-black">
            {/* Back Button for Focus Mode */}
            {focusedGlobe && (
                <div className="absolute top-24 left-8 z-30">
                    <button
                        onClick={() => setFocusedGlobe(null)}
                        className="px-4 py-2 rounded-full backdrop-blur-md border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 transition-all"
                    >
                        ← Back to Galaxy
                    </button>
                </div>
            )}

            <Canvas camera={{ position: [0, 20, 60], fov: 45 }}>
                <fog attach="fog" args={['#000', 40, 120]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Stars radius={200} depth={50} count={7000} factor={4} saturation={0} fade speed={0.5} />

                {/* Central Globe (Posts) */}
                {(!focusedGlobe || focusedGlobe === "Posts") && (
                    <GlobeContent
                        position={focusedGlobe === "Posts" ? [0, 0, 0] : [0, 0, 0]}
                        posts={posts}
                        onPostClick={onPostClick}
                        showLines={showLines}
                        label="Posts"
                        scale={focusedGlobe === "Posts" ? 1.2 : 1}
                        color="#ffffff"
                        hasRing={false} // No ring for central globe
                        onGlobeClick={() => handleGlobeClick("Posts")}
                        isFocused={focusedGlobe === "Posts"}
                    />
                )}

                {/* Satellite Globes */}
                {satellites.map((sat, index) => {
                    const angle = (index / satellites.length) * Math.PI * 2;
                    const x = Math.cos(angle) * satelliteRadius;
                    const z = Math.sin(angle) * satelliteRadius;

                    // If focused, only show the focused one at center.
                    // If not focused, show all in orbit.
                    if (focusedGlobe && focusedGlobe !== sat.label) return null;

                    const isFocused = focusedGlobe === sat.label;
                    const position: [number, number, number] = isFocused ? [0, 0, 0] : [x, 0, z];
                    const scale = isFocused ? 1.2 : 0.6;

                    return (
                        <GlobeContent
                            key={sat.label}
                            position={position}
                            posts={sat.data}
                            onPostClick={onPostClick}
                            showLines={showLines}
                            label={sat.label}
                            scale={scale}
                            color={sat.color}
                            hasRing={true}
                            onGlobeClick={() => handleGlobeClick(sat.label)}
                            isFocused={isFocused}
                        />
                    );
                })}

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    minDistance={2}
                    maxDistance={100}
                    autoRotate={!focusedGlobe} // Stop rotation when focused
                    autoRotateSpeed={0.2}
                    zoomSpeed={0.8}
                />
            </Canvas>
        </div>
    );
}

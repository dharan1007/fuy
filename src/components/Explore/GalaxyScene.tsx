import React, { useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useSession } from '@/hooks/use-session';
import { GlobeContent } from './GlobeContent';
import PudGrid from './PudGrid';
import ChanCarousel from './ChanCarousel';

interface GalaxySceneProps {
    posts: any[];
    chans: any[];
    lils: any[];
    fills: any[];
    auds: any[];
    chaptes: any[];
    xrays: any[];
    puds: any[];
    texts: any[];
    onPostClick: (post: any) => void;
    showLines: boolean;
    activeGlobe: string;
    autoRotate: boolean;
}

const SceneEvents = () => {
    const { gl } = useThree();
    useEffect(() => {
        const canvas = gl.domElement;
        const handleContextLost = (event: any) => {
            event.preventDefault();
            console.warn('WebGL context lost on GalaxyScene. Attempting to restore...');
        };
        const handleContextRestored = () => {
            console.log('WebGL context restored on GalaxyScene.');
        };

        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);

        return () => {
            canvas.removeEventListener('webglcontextlost', handleContextLost);
            canvas.removeEventListener('webglcontextrestored', handleContextRestored);
            // Explicitly dispose the renderer to prevent stale blob references
            gl.dispose();
        };
    }, [gl]);
    return null;
};

export default function GalaxyScene({
    posts,
    chans,
    lils,
    fills,
    auds,
    chaptes,
    xrays,
    puds,
    texts,
    onPostClick,
    showLines,
    activeGlobe,
    autoRotate
}: GalaxySceneProps) {

    const { data: session } = useSession();

    // Determine which dataset to show based on activeGlobe
    const getActiveData = () => {
        switch (activeGlobe) {
            case 'Chans': return chans;
            case 'Lils': return lils;
            case 'Fills': return fills;
            case 'Auds': return auds;
            case 'Chaptes': return chaptes;
            case 'X Rays': return xrays;
            case 'Puds': return puds;
            case 'Simple Texts': return texts;
            default: return posts;
        }
    };

    const activeData = getActiveData();

    const is2DOverlay = activeGlobe === 'Puds' || activeGlobe === 'Chans';

    return (
        <div className="w-full h-screen absolute inset-0 z-0 bg-black">
            {/* Canvas only renders when 3D content is visible */}
            {!is2DOverlay && (
                <Canvas
                    camera={{ position: [0, 0, 15], fov: 60 }}
                    gl={{
                        powerPreference: 'low-power',
                        antialias: false,
                        preserveDrawingBuffer: false
                    }}
                    frameloop="demand"
                >
                    <SceneEvents />
                    <fog attach="fog" args={['#000', 20, 50]} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <Stars radius={200} depth={50} count={300} factor={4} saturation={0} fade speed={0.5} />

                    <GlobeContent
                        position={[0, 0, 0]}
                        posts={activeData}
                        onPostClick={onPostClick}
                        showLines={showLines}
                        label={activeGlobe === 'Posts' ? '' : activeGlobe}
                        scale={1.5}
                        color="#ffffff"
                        hasRing={false}
                        isFocused={true}
                    />

                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        minDistance={5}
                        maxDistance={40}
                        autoRotate={autoRotate}
                        autoRotateSpeed={0.5}
                        zoomSpeed={0.8}
                    />
                </Canvas>
            )}

            {/* PUDs Overlay - 2D Grid */}
            {activeGlobe === 'Puds' && (
                <PudGrid puds={puds} isAuthenticated={!!session} />
            )}

            {/* Chans Overlay - Carousel */}
            {activeGlobe === 'Chans' && (
                <ChanCarousel chans={chans} onPostClick={onPostClick} />
            )}
        </div>
    );
}

import React, { useMemo, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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

export default React.memo(function GalaxyScene({
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

    // Memoize data lookup
    const activeData = useMemo(() => {
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
    }, [activeGlobe, posts, chans, lils, fills, auds, chaptes, xrays, puds, texts]);

    const is2DOverlay = activeGlobe === 'Puds' || activeGlobe === 'Chans';

    // Memoize handlers
    const handlePostClick = useCallback((post: any) => {
        onPostClick(post);
    }, [onPostClick]);

    // Memoize canvas config
    const glConfig = useMemo(() => ({
        powerPreference: 'low-power' as const,
        antialias: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: true
    }), []);

    // Inner component to handle scene events and cleanup
    const SceneEvents = () => {
        const { gl } = useThree();
        useEffect(() => {
            if (!gl) return;
            const canvas = gl.domElement;
            const handleContextLost = (event: any) => {
                event.preventDefault();
                console.warn('WebGL context lost on GalaxyScene.');
            };
            const handleContextRestored = () => {
                console.log('WebGL context restored on GalaxyScene.');
            };

            canvas.addEventListener('webglcontextlost', handleContextLost);
            canvas.addEventListener('webglcontextrestored', handleContextRestored);

            return () => {
                canvas.removeEventListener('webglcontextlost', handleContextLost);
                canvas.removeEventListener('webglcontextrestored', handleContextRestored);
                if (gl) gl.dispose();
            };
        }, [gl]);
        return null;
    };

    return (
        <div className="w-full h-screen absolute inset-0 z-0 bg-black">
            {/* Canvas only renders when 3D content is visible */}
            {!is2DOverlay && (
                <Canvas
                    camera={{ position: [0, 0, 15], fov: 60 }}
                    gl={glConfig}
                    frameloop="demand"
                    dpr={[1, 1.5]} // Limit pixel ratio for performance
                    performance={{ min: 0.5 }}
                >
                    <SceneEvents />
                    <fog attach="fog" args={['#000', 25, 60]} />
                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={0.8} />

                    {/* Reduced star count for performance */}
                    <Stars
                        radius={200}
                        depth={50}
                        count={150}
                        factor={3}
                        saturation={0}
                        fade
                        speed={0.3}
                    />

                    <GlobeContent
                        position={[0, 0, 0]}
                        posts={activeData}
                        onPostClick={handlePostClick}
                        showLines={showLines}
                        label={activeGlobe === 'Posts' ? '' : activeGlobe}
                        scale={1.5}
                        color="#ffffff"
                        hasRing={false}
                        isFocused={true}
                    />

                    <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        minDistance={8}
                        maxDistance={30}
                        autoRotate={autoRotate}
                        autoRotateSpeed={0.3}
                        zoomSpeed={0.6}
                        enableDamping={true}
                        dampingFactor={0.05}
                    />
                </Canvas>
            )}

            {/* PUDs Overlay - 2D Grid */}
            {activeGlobe === 'Puds' && (
                <PudGrid puds={puds} isAuthenticated={!!session} />
            )}

            {/* Chans Overlay - Carousel */}
            {activeGlobe === 'Chans' && (
                <ChanCarousel chans={chans} onPostClick={handlePostClick} />
            )}
        </div>
    );
});

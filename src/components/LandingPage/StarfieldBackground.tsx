import React, { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

export default function StarfieldBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) {
        return <div className="fixed inset-0 z-0 bg-black" />;
    }

    return (
        <div className="fixed inset-0 z-0">
            <Suspense fallback={<div className="w-full h-full bg-black" />}>
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 30 }}
                    gl={{
                        powerPreference: "low-power",
                        failIfMajorPerformanceCaveat: true,
                        antialias: false,
                        stencil: false,
                        depth: false,
                        alpha: true,
                    }}
                >
                    <SceneEvents />
                    <color attach="background" args={['#000000']} />
                    <Stars
                        radius={100}
                        depth={50}
                        count={800} // Further reduced for stability
                        factor={4}
                        saturation={0}
                        fade
                        speed={0.5}
                    />
                </Canvas>
            </Suspense>
        </div>
    );
}

function SceneEvents() {
    const { gl } = useThree();

    useEffect(() => {
        const canvas = gl.domElement;

        const handleContextLost = (event: any) => {
            event.preventDefault();
            console.warn('WebGL context lost on Starfield.');
        };

        const handleContextRestored = () => {
            console.log('WebGL context restored on Starfield.');
        };

        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);

        return () => {
            canvas.removeEventListener('webglcontextlost', handleContextLost);
            canvas.removeEventListener('webglcontextrestored', handleContextRestored);

            // Critical: Dispose of the renderer and its resources
            if (gl) {
                gl.dispose();
                // If it's a WebGL2Renderer, some additional cleanup might be needed 
                // but dispose() is the standard Three.js way to release resources.
            }
        };
    }, [gl]);

    return null;
}

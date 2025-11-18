'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  shakeX?: number;
  shakeY?: number;
}

export default function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const blastStateRef = useRef({ active: false, progress: 0, centerX: 0, centerY: 0 });
  const clusterCounterRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full window size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize particles with larger, more visible size
    const initializeParticles = () => {
      particlesRef.current = [];
      const particleCount = 150;

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          radius: Math.random() * 1.8 + 2
        });
      }
    };

    // Animation loop
    const animate = () => {
      // Clear with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const blastState = blastStateRef.current;

      // Calculate center of mass and clustering
      let centerX = 0, centerY = 0;
      particles.forEach((p) => {
        centerX += p.x;
        centerY += p.y;
      });
      centerX /= particles.length;
      centerY /= particles.length;

      // Detect clustering - count particles near center
      let clusteredCount = 0;
      particles.forEach((p) => {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        if (distToCenter < 300) {
          clusteredCount++;
        }
      });

      // Trigger blast if 80% of particles are clustered
      if (clusteredCount > particles.length * 0.8 && !blastState.active) {
        blastState.active = true;
        blastState.progress = 0;
        blastState.centerX = centerX;
        blastState.centerY = centerY;
      }

      // Update blast
      if (blastState.active) {
        blastState.progress += 0.03;
        if (blastState.progress >= 1) {
          blastState.active = false;
          blastState.progress = 0;
        }
      }

      // Update and draw particles
      particles.forEach((particle, idx) => {
        // Shake effect during blast
        if (blastState.active) {
          particle.shakeX = (Math.random() - 0.5) * 8;
          particle.shakeY = (Math.random() - 0.5) * 8;
        } else {
          particle.shakeX = 0;
          particle.shakeY = 0;
        }

        // Ambient flowing motion (constant movement even without pointer)
        const time = frameCountRef.current * 0.01;
        const ambientX = Math.sin(time + idx * 0.1) * 0.3;
        const ambientY = Math.cos(time * 0.7 + idx * 0.15) * 0.3;

        // Add swirling wind effect
        const windStrength = 0.2;
        const windX = Math.sin(time * 0.5 + particle.y * 0.005) * windStrength;
        const windY = Math.cos(time * 0.7 + particle.x * 0.005) * windStrength;

        particle.vx += ambientX + windX;
        particle.vy += ambientY + windY;

        // Blast wave repulsion
        if (blastState.active) {
          const dx = particle.x - blastState.centerX;
          const dy = particle.y - blastState.centerY;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const blastForce = (1 - blastState.progress) * 8;
          particle.vx += (dx / distance) * blastForce * 0.2;
          particle.vy += (dy / distance) * blastForce * 0.2;
        }

        // Update position
        particle.x += particle.vx + (particle.shakeX || 0);
        particle.y += particle.vy + (particle.shakeY || 0);

        // Bounce off walls
        if (particle.x - particle.radius < 0 || particle.x + particle.radius > canvas.width) {
          particle.vx *= -1;
          particle.x = Math.max(particle.radius, Math.min(canvas.width - particle.radius, particle.x));
        }
        if (particle.y - particle.radius < 0 || particle.y + particle.radius > canvas.height) {
          particle.vy *= -1;
          particle.y = Math.max(particle.radius, Math.min(canvas.height - particle.radius, particle.y));
        }

        // Mouse attraction
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 250) {
          const force = (1 - distance / 250) * 0.4;
          if (distance > 0) {
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
          }
        }

        // Friction (higher = smoother motion)
        particle.vx *= 0.995;
        particle.vy *= 0.995;

        // Limit speed
        const speed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);
        if (speed > 2.5) {
          particle.vx = (particle.vx / speed) * 2.5;
          particle.vy = (particle.vy / speed) * 2.5;
        }

        // Draw particle core (white)
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Draw glow (blue halo) - brighter during blast
        const glowOpacity = blastState.active ? 0.8 : 0.4;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100, 150, 255, ${glowOpacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw blast wave ring effect
      if (blastState.active && blastState.progress < 1) {
        const waveRadius = blastState.progress * 600;
        const waveOpacity = (1 - blastState.progress) * 0.8;
        ctx.beginPath();
        ctx.arc(blastState.centerX, blastState.centerY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150, 200, 255, ${waveOpacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 240) {
            const opacity = (1 - distance / 240) * 0.3;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 80, 100, ${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Increment frame counter for ambient animation
      frameCountRef.current++;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Event handlers
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -5000, y: -5000 };
    };

    const handleResize = () => {
      setCanvasSize();
      initializeParticles();
    };

    // Setup
    setCanvasSize();
    initializeParticles();
    animate();

    // Event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1,
        display: 'block'
      }}
    />
  );
}

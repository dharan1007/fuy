"use client";

import { useEffect, useRef } from "react";

const CONFIG = {
    starCount: 600,
    nebulaCount: 8,
    cometChance: 0.005,
    baseSpeed: 0.05,
    starColors: ["#ffffff", "#e0f2fe", "#f0f9ff", "#bfdbfe"],
    nebulaColors: [
        "rgba(29, 78, 216, 0.03)",
        "rgba(30, 41, 59, 0.02)",
        "rgba(59, 130, 246, 0.02)",
    ],
};

class Star {
    x: number; y: number; z: number; size: number; opacity: number; twinkleSpeed: number; color: string;
    constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 2 + 0.5;
        this.size = Math.random() * 1.5;
        this.opacity = Math.random();
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.color = CONFIG.starColors[Math.floor(Math.random() * CONFIG.starColors.length)];
    }
    update(width: number, height: number, speed: number) {
        this.y -= speed * this.z;
        this.opacity += this.twinkleSpeed;
        if (this.opacity > 1 || this.opacity < 0.3) this.twinkleSpeed = -this.twinkleSpeed;
        if (this.y < 0) { this.y = height; this.x = Math.random() * width; }
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.z * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity));
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Nebula {
    x: number; y: number; radius: number; color: string; vx: number; vy: number;
    constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 400 + 200;
        this.color = CONFIG.nebulaColors[Math.floor(Math.random() * CONFIG.nebulaColors.length)];
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
    }
    update(width: number, height: number) {
        this.x += this.vx; this.y += this.vy;
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
    }
    draw(ctx: CanvasRenderingContext2D) {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    }
}

class Comet {
    x: number; y: number; length: number; speed: number; angle: number; opacity: number; dead: boolean = false;
    constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.5;
        this.length = Math.random() * 100 + 50;
        this.speed = Math.random() * 5 + 8;
        this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
        this.opacity = 0;
    }
    update(width: number, height: number) {
        if (this.opacity < 1 && !this.dead) this.opacity += 0.05;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x > width + 100 || this.y > height + 100) this.dead = true;
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (this.dead) return;
        const tailX = this.x - Math.cos(this.angle) * this.length;
        const tailY = this.y - Math.sin(this.angle) * this.length;
        const gradient = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.globalAlpha = this.opacity;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

export const SpaceBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        let width = window.innerWidth; let height = window.innerHeight;
        canvas.width = width; canvas.height = height;
        const stars = Array.from({ length: CONFIG.starCount }).map(() => new Star(width, height));
        const nebulas = Array.from({ length: CONFIG.nebulaCount }).map(() => new Nebula(width, height));
        let comets: Comet[] = [];
        const onResize = () => { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; };
        window.addEventListener("resize", onResize);
        let animationFrameId: number;
        const render = () => {
            ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, width, height);
            nebulas.forEach(n => { n.update(width, height); n.draw(ctx); });
            stars.forEach(s => { s.update(width, height, CONFIG.baseSpeed); s.draw(ctx); });
            if (Math.random() < CONFIG.cometChance) comets.push(new Comet(width, height));
            comets.forEach(c => { c.update(width, height); c.draw(ctx); });
            comets = comets.filter(c => !c.dead);
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(animationFrameId); };
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 z-0 w-full h-full pointer-events-none" />;
};

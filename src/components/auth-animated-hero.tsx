'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const HERO_IMAGE_SRC = '/hero/auth-background/login-hero.jpeg';
const BACKGROUND_VERTICAL_SHIFT = 0.035;
const BACKGROUND_HORIZONTAL_COMPOSITION = 0.12;

export function AuthAnimatedHero() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const viewportRef = useRef({ width: 0, height: 0, dpr: 1 });
    const [isReady, setIsReady] = useState(false);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        viewportRef.current = { width, height, dpr };
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, []);

    const drawBackground = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const { width, height } = viewportRef.current;
        if (!width || !height) {
            return;
        }

        ctx.clearRect(0, 0, width, height);

        const coverScale = Math.max(width / image.width, height / image.height);
        const drawWidth = image.width * coverScale;
        const drawHeight = image.height * coverScale;
        const overflowX = Math.max(0, drawWidth - width);
        const drawX = -overflowX * BACKGROUND_HORIZONTAL_COMPOSITION;
        const drawY = (height - drawHeight) / 2 + height * BACKGROUND_VERTICAL_SHIFT;

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }, []);

    useEffect(() => {
        resizeCanvas();
        const handleResize = () => {
            resizeCanvas();
            drawBackground();
        };
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [drawBackground, resizeCanvas]);

    useEffect(() => {
        let isMounted = true;
        const image = new window.Image();
        image.decoding = 'async';
        image.src = HERO_IMAGE_SRC;

        const onComplete = () => {
            if (!isMounted) {
                return;
            }

            imageRef.current = image;
            setIsReady(true);
            drawBackground();
        };

        if (image.complete) {
            onComplete();
        } else {
            image.onload = onComplete;
            image.onerror = onComplete;
        }

        return () => {
            isMounted = false;
        };
    }, [drawBackground]);

    return (
        <>
            <div className="absolute inset-0 bg-[#030712]" />

            <canvas
                aria-hidden
                ref={canvasRef}
                className={`auth-hero-canvas absolute inset-0 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_14%,rgba(2,6,23,0.10),transparent_42%),radial-gradient(circle_at_86%_88%,rgba(2,6,23,0.22),transparent_52%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/35 to-slate-950/55" />
            <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-full w-[54vw] bg-[radial-gradient(ellipse_at_74%_46%,rgba(34,211,238,0.08),transparent_72%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-full w-[54vw] [mask-image:linear-gradient(to_left,black_0%,black_74%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,black_0%,black_74%,transparent_100%)] bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.07)_1px,transparent_1px)] [background-size:22px_22px] opacity-18"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-full w-[54vw] [mask-image:linear-gradient(to_left,black_0%,black_68%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,black_0%,black_68%,transparent_100%)] bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.04)_1px,transparent_1px)] [background-size:44px_44px] [background-position:11px_11px] opacity-14"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-3 right-0 h-24 w-44 bg-[radial-gradient(120%_120%_at_100%_100%,rgba(1,9,30,0.99)_0%,rgba(1,9,30,0.94)_38%,rgba(1,9,30,0.58)_72%,rgba(1,9,30,0)_100%)] md:h-28 md:w-52"
            />
        </>
    );
}

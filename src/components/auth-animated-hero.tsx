'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const FRAME_COUNT = 80;
const FRAME_DURATION_MS = 84;
const PING_PONG_FRAME_COUNT = FRAME_COUNT * 2 - 2;
const BACKGROUND_VERTICAL_SHIFT = 0.035;
const BACKGROUND_HORIZONTAL_COMPOSITION = 0.12;

const HERO_FRAMES = Array.from({ length: FRAME_COUNT }, (_, index) => {
    const frame = index.toString().padStart(3, '0');
    return `/hero/auth-sequence/frame-${frame}.jpg`;
});

export function AuthAnimatedHero() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const viewportRef = useRef({ width: 0, height: 0, dpr: 1 });
    const animationRef = useRef<number>();
    const animationStartRef = useRef<number | null>(null);

    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
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

    const drawFrame = useCallback((frameIndex: number) => {
        const canvas = canvasRef.current;
        const image = imagesRef.current[frameIndex];
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
        window.addEventListener('resize', resizeCanvas);

        return () => window.removeEventListener('resize', resizeCanvas);
    }, [resizeCanvas]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

        updatePreference();
        mediaQuery.addEventListener?.('change', updatePreference);
        mediaQuery.addListener?.(updatePreference);

        return () => {
            mediaQuery.removeEventListener?.('change', updatePreference);
            mediaQuery.removeListener?.(updatePreference);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const preloadTasks = HERO_FRAMES.map(frameSrc => {
            return new Promise<HTMLImageElement>(resolve => {
                const image = new window.Image();
                image.decoding = 'async';
                image.src = frameSrc;

                const onComplete = () => resolve(image);

                if (image.complete) {
                    resolve(image);
                    return;
                }

                image.onload = onComplete;
                image.onerror = onComplete;
            });
        });

        Promise.all(preloadTasks).then(images => {
            if (!isMounted) {
                return;
            }

            imagesRef.current = images;
            setIsReady(true);
            drawFrame(0);
        });

        return () => {
            isMounted = false;
        };
    }, [drawFrame]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (prefersReducedMotion) {
            drawFrame(0);
            return;
        }

        const animate = (timestamp: number) => {
            if (animationStartRef.current === null) {
                animationStartRef.current = timestamp;
            }

            const elapsedMs = timestamp - animationStartRef.current;
            const cycleFrame = Math.floor(elapsedMs / FRAME_DURATION_MS) % PING_PONG_FRAME_COUNT;
            const frameIndex =
                cycleFrame < FRAME_COUNT ? cycleFrame : PING_PONG_FRAME_COUNT - cycleFrame;

            drawFrame(frameIndex);
            animationRef.current = window.requestAnimationFrame(animate);
        };

        animationStartRef.current = null;
        animationRef.current = window.requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                window.cancelAnimationFrame(animationRef.current);
            }
        };
    }, [drawFrame, isReady, prefersReducedMotion]);

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
                className="pointer-events-none absolute -bottom-3 right-0 h-24 w-44 bg-[radial-gradient(120%_120%_at_100%_100%,rgba(1,9,30,0.99)_0%,rgba(1,9,30,0.94)_38%,rgba(1,9,30,0.58)_72%,rgba(1,9,30,0)_100%)] md:h-28 md:w-52"
            />
        </>
    );
}

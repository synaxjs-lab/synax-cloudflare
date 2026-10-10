import React, { useEffect, useRef } from 'react';

interface CosmicBackgroundProps {
  theme?: 'celestial' | 'cyberpunk' | 'twilight' | 'aurora';
  activeSide?: 'left' | 'right' | 'both' | null;
  showPetals?: boolean;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  theme = 'celestial',
  activeSide = 'both',
  showPetals = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let isPageVisible = document.visibilityState === 'visible';
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const lowPower = width < 700 || reducedMotion;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Starfield particles (layered depths for parallax)
    const starCount = lowPower ? 38 : Math.min(width > 768 ? 110 : 65, 120);
    const stars = Array.from({ length: starCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.85),
      size: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.006,
      phase: Math.random() * Math.PI * 2,
      isConstellationNode: Math.random() > 0.85,
    }));

    // Distant city light bokeh clusters along the lower horizon (Makoto Shinkai night cityscape feel)
    const cityBokehCount = lowPower ? 12 : (width > 768 ? 45 : 25);
    const cityBokeh = Array.from({ length: cityBokehCount }).map(() => ({
      x: Math.random() * width,
      y: height - (Math.random() * 80 + 10),
      radius: Math.random() * 3 + 1.5,
      alpha: Math.random() * 0.4 + 0.2,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? '#fef08a' : Math.random() > 0.5 ? '#93c5fd' : '#f472b6',
    }));

    // Soft drifting clouds (drawn as large smooth soft gradient circles)
    const clouds = Array.from({ length: lowPower ? 2 : 5 }).map((_, i) => ({
      x: (i / 5) * width + Math.random() * 100,
      y: height * 0.35 + (i % 3) * 60,
      radius: width > 768 ? 260 + Math.random() * 100 : 160 + Math.random() * 60,
      speed: (Math.random() * 0.08 + 0.04) * (i % 2 === 0 ? 1 : 0.8),
      alpha: 0.045 + Math.random() * 0.03,
    }));

    // Floating cherry blossom petals / celestial glowing motes
    const petalCount = showPetals ? (lowPower ? 6 : (width > 768 ? 28 : 16)) : 0;
    const petals = Array.from({ length: petalCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 6 + 4,
      speedY: Math.random() * 0.6 + 0.3,
      speedX: Math.random() * 0.5 + 0.2,
      swaySpeed: Math.random() * 0.02 + 0.01,
      swayAmount: Math.random() * 35 + 15,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? 'rgba(244, 114, 182, ' : 'rgba(192, 132, 252, ',
    }));

    let t = 0;

    const render = () => {
      t += 0.01;
      ctx.clearRect(0, 0, width, height);

      // 1. Base Sky Gradient: Deep night cosmos to luminous twilight horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (theme === 'twilight') {
        skyGrad.addColorStop(0, '#04030a');
        skyGrad.addColorStop(0.5, '#0b0818');
        skyGrad.addColorStop(0.85, '#17102b');
        skyGrad.addColorStop(1, '#201235');
      } else if (theme === 'aurora') {
        skyGrad.addColorStop(0, '#02070a');
        skyGrad.addColorStop(0.5, '#051319');
        skyGrad.addColorStop(0.85, '#082024');
        skyGrad.addColorStop(1, '#0b2b2b');
      } else if (theme === 'cyberpunk') {
        skyGrad.addColorStop(0, '#05020c');
        skyGrad.addColorStop(0.5, '#0d061c');
        skyGrad.addColorStop(0.85, '#1b092b');
        skyGrad.addColorStop(1, '#2c0d38');
      } else {
        // Celestial anime night sky (default)
        skyGrad.addColorStop(0, '#03050b');
        skyGrad.addColorStop(0.45, '#070c1a');
        skyGrad.addColorStop(0.8, '#0e1832');
        skyGrad.addColorStop(1, '#141e3d');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Twin Realm Atmospheric Auras (Left: Person 1's cooler aura, Right: Person 2's warmer aura)
      const leftAlpha = activeSide === 'right' ? 0.08 : activeSide === 'left' ? 0.35 : 0.22;
      const rightAlpha = activeSide === 'left' ? 0.08 : activeSide === 'right' ? 0.35 : 0.22;

      // Left Realm: Sapphire / Cobalt celestial nebula
      const leftGrad = ctx.createRadialGradient(
        width * 0.18 + Math.sin(t * 0.4) * 30,
        height * 0.38 + Math.cos(t * 0.3) * 25,
        20,
        width * 0.25,
        height * 0.45,
        Math.max(width, height) * 0.55
      );
      leftGrad.addColorStop(0, `rgba(79, 110, 247, ${leftAlpha})`);
      leftGrad.addColorStop(0.5, `rgba(59, 130, 246, ${leftAlpha * 0.5})`);
      leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, width, height);

      // Right Realm: Amethyst / Rose twilight nebula
      const rightGrad = ctx.createRadialGradient(
        width * 0.82 + Math.cos(t * 0.35) * 30,
        height * 0.42 + Math.sin(t * 0.4) * 25,
        20,
        width * 0.75,
        height * 0.45,
        Math.max(width, height) * 0.55
      );
      rightGrad.addColorStop(0, `rgba(217, 70, 239, ${rightAlpha})`);
      rightGrad.addColorStop(0.5, `rgba(236, 72, 153, ${rightAlpha * 0.45})`);
      rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(0, 0, width, height);

      // Central Harmonic Bridge / Connection Glow
      const centerGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.48,
        10,
        width * 0.5,
        height * 0.5,
        width * 0.38
      );
      centerGrad.addColorStop(0, 'rgba(167, 139, 250, 0.12)');
      centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Moon & Moonlight Glow (Top-Right / Central Horizon)
      const moonX = width * 0.78;
      const moonY = height * 0.18;
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 140);
      moonGlow.addColorStop(0, 'rgba(254, 243, 199, 0.18)');
      moonGlow.addColorStop(0.4, 'rgba(219, 234, 254, 0.07)');
      moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 140, 0, Math.PI * 2);
      ctx.fill();

      // Delicate Crescent Moon silhouette
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 14, 0, Math.PI * 2);
      ctx.fill();
      // Cutout to form crescent
      ctx.fillStyle = '#060a16';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(moonX - 5, moonY - 4, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Soft Billowing Clouds (Makoto Shinkai aesthetic)
      clouds.forEach((c) => {
        c.x += c.speed;
        if (c.x - c.radius > width) c.x = -c.radius;

        const cloudGrad = ctx.createRadialGradient(c.x, c.y, c.radius * 0.1, c.x, c.y, c.radius);
        cloudGrad.addColorStop(0, `rgba(147, 197, 253, ${c.alpha})`);
        cloudGrad.addColorStop(0.6, `rgba(167, 139, 250, ${c.alpha * 0.5})`);
        cloudGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Starfield & Constellation Link Lines
      let prevConstNode: { x: number; y: number } | null = null;
      stars.forEach((star) => {
        star.phase += star.twinkleSpeed;
        const currentAlpha = Math.max(0.12, star.alpha * (0.6 + 0.4 * Math.sin(star.phase)));
        ctx.fillStyle = `rgba(241, 245, 249, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect a few nodes with fine faint constellation threads
        if (star.isConstellationNode) {
          if (prevConstNode && Math.hypot(star.x - prevConstNode.x, star.y - prevConstNode.y) < 180) {
            ctx.strokeStyle = `rgba(199, 210, 254, ${currentAlpha * 0.18})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(prevConstNode.x, prevConstNode.y);
            ctx.lineTo(star.x, star.y);
            ctx.stroke();
          }
          prevConstNode = star;
        }
      });

      // 6. Horizon Distant City Bokeh Lights
      cityBokeh.forEach((b) => {
        b.phase += b.twinkleSpeed;
        const alpha = Math.max(0.08, b.alpha * (0.7 + 0.3 * Math.sin(b.phase)));
        ctx.fillStyle = b.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 7. Floating Sakura Petals / Luminous Drifting Motes
      if (showPetals) {
        petals.forEach((p) => {
          p.y += p.speedY;
          p.phase += p.swaySpeed;
          p.angle += p.rotationSpeed;
          const currentX = p.x + Math.sin(p.phase) * p.swayAmount;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (currentX > width + 20) p.x = -20;
          if (currentX < -20) p.x = width + 20;

          ctx.save();
          ctx.translate(currentX, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = `${p.color}0.65)`;
          ctx.shadowColor = 'rgba(244, 114, 182, 0.4)';
          ctx.shadowBlur = 6;

          // Draw delicate petal teardrop curve
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(p.size * 0.7, -p.size * 0.4, p.size, 0);
          ctx.quadraticCurveTo(p.size * 0.7, p.size * 0.4, 0, 0);
          ctx.fill();
          ctx.restore();
        });
      }

      // On phones, render one polished frame instead of running a full-screen
      // gradient/particle RAF loop. The chat itself has its own lightweight
      // background, so continuous animation here only wastes battery/GPU.
      if (isPageVisible && !reducedMotion && !lowPower) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        animationFrameId = null;
      }
    };

    const handleVisibility = () => {
      isPageVisible = document.visibilityState === 'visible';
      if (isPageVisible && !reducedMotion && !lowPower && animationFrameId === null) {
        render();
      }
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        render();
      } else if (isPageVisible && animationFrameId === null) {
        render();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener?.('change', handleMotionPreference);

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener?.('change', handleMotionPreference);
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    };
  }, [theme, activeSide, showPetals]);

  return (
    <canvas
      id="synax-anime-canvas"
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
    />
  );
};

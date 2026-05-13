"use client";

import { useEffect, useRef, useState } from "react";

import { TimerApp } from "@/components/timer-app";

const INTRO_VIDEOS = ["/video/M IS HERE.mp4", "/video/M IS HERE 2.mp4"];
const INTRO_POSTER = "/images/slutbild.jpeg";
const FANFARE_SRC = "/audio/fanfare.mp3";

export function IntroExperience() {
  const [introVideo] = useState(() => {
    const randomIndex = Math.floor(Math.random() * INTRO_VIDEOS.length);
    return INTRO_VIDEOS[randomIndex];
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fanfareStartedRef = useRef(false);

  useEffect(() => {
    let fadeTimeout: number | null = null;
    let fadeInterval: number | null = null;

    const startFanfare = async () => {
      if (fanfareStartedRef.current) {
        return;
      }

      fanfareStartedRef.current = true;

      const audio = audioRef.current ?? new Audio(FANFARE_SRC);
      audioRef.current = audio;
      audio.preload = "auto";
      audio.currentTime = 0;
      audio.volume = 0.9;

      try {
        await audio.play();

        fadeTimeout = window.setTimeout(() => {
          const fadeSteps = 16;
          const fadeDurationMs = 2500;
          const volumeStep = audio.volume / fadeSteps;
          let stepsRemaining = fadeSteps;

          fadeInterval = window.setInterval(() => {
            stepsRemaining -= 1;
            audio.volume = Math.max(0, audio.volume - volumeStep);

            if (stepsRemaining <= 0) {
              if (fadeInterval) {
                window.clearInterval(fadeInterval);
              }
              audio.pause();
              audio.currentTime = 0;
              audio.volume = 0.9;
            }
          }, fadeDurationMs / fadeSteps);
        }, 5500);
      } catch {
        fanfareStartedRef.current = false;
      }
    };

    void startFanfare();

    const unlockAndStart = () => {
      void startFanfare();
      window.removeEventListener("pointerdown", unlockAndStart);
      window.removeEventListener("touchstart", unlockAndStart);
      window.removeEventListener("keydown", unlockAndStart);
    };

    window.addEventListener("pointerdown", unlockAndStart, { once: true });
    window.addEventListener("touchstart", unlockAndStart, { once: true });
    window.addEventListener("keydown", unlockAndStart, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAndStart);
      window.removeEventListener("touchstart", unlockAndStart);
      window.removeEventListener("keydown", unlockAndStart);

      if (fadeTimeout) {
        window.clearTimeout(fadeTimeout);
      }
      if (fadeInterval) {
        window.clearInterval(fadeInterval);
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.9;
      }
    };
  }, []);

  return (
    <main className="relative overflow-hidden py-8 md:py-12">
      <div className="floating-heart left-[8%] top-16 text-3xl">o</div>
      <div className="floating-heart right-[10%] top-32 text-5xl [animation-delay:1.4s]">
        o
      </div>

      <section className="page-shell mb-6">
        <div className="glass-panel romance-gradient fade-up overflow-hidden rounded-[2rem] p-4 sm:p-6">
          <div className="mb-4">
            <h1 className="section-title text-4xl text-[var(--berry)] sm:text-5xl">
              Märtzor Exercise Timer
            </h1>
          </div>

          <video
            key={introVideo}
            className="h-full min-h-[240px] w-full rounded-[1.6rem] bg-[#2a1822] object-cover soft-ring"
            src={introVideo}
            poster={INTRO_POSTER}
            controls
            playsInline
            preload="metadata"
          />
        </div>
      </section>

      <TimerApp embeddedIntro />
    </main>
  );
}

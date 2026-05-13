"use client";

import { useState } from "react";

import { TimerApp } from "@/components/timer-app";

const INTRO_VIDEOS = ["/video/M IS HERE.mp4", "/video/M IS HERE 2.mp4"];

export function IntroExperience() {
  const [introVideo] = useState(() => {
    const randomIndex = Math.floor(Math.random() * INTRO_VIDEOS.length);
    return INTRO_VIDEOS[randomIndex];
  });

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
            poster="/images/intro-poster.svg"
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

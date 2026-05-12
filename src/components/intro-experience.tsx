"use client";

import { TimerApp } from "@/components/timer-app";

export function IntroExperience() {
  return (
    <main className="relative overflow-hidden py-8 md:py-12">
      <div className="floating-heart left-[8%] top-16 text-3xl">o</div>
      <div className="floating-heart right-[10%] top-32 text-5xl [animation-delay:1.4s]">
        o
      </div>

      <section className="page-shell mb-6">
        <div className="glass-panel romance-gradient fade-up overflow-hidden rounded-[2rem] p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                Intro video
              </p>
              <h1 className="section-title mt-2 text-4xl text-[var(--berry)] sm:text-5xl">
                Märtzor Exercise Timer
              </h1>
            </div>
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--berry)]">
              Press start when you&apos;re ready
            </div>
          </div>

          <video
            className="h-full min-h-[240px] w-full rounded-[1.6rem] bg-[#2a1822] object-cover soft-ring"
            src="/video/intro.mp4"
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

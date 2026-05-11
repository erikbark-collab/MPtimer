"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const tools = [
  {
    name: "CapCut",
    description: "Fast editing, text, and music without much setup.",
  },
  {
    name: "Canva Free",
    description: "Great for romantic intro sequences with photos, text, and simple motion.",
  },
  {
    name: "DaVinci Resolve",
    description: "Powerful and free if you want a more cinematic look.",
  },
];

export function IntroExperience() {
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);

  const buttonLabel = useMemo(() => {
    if (videoCompleted) {
      return "Start our workout";
    }

    if (videoMissing) {
      return "Intro file missing";
    }

    return "Wait until the video ends";
  }, [videoCompleted, videoMissing]);

  return (
    <main className="relative overflow-hidden py-8 md:py-12">
      <div className="floating-heart left-[8%] top-16 text-3xl">o</div>
      <div className="floating-heart right-[10%] top-32 text-5xl [animation-delay:1.4s]">
        o
      </div>
      <div className="page-shell grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel romance-gradient fade-up relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-6 inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--berry)]">
            A little love letter in workout form
          </div>
          <h1 className="section-title max-w-2xl text-5xl leading-none text-[var(--berry)] sm:text-6xl">
            For the woman who makes every day feel lighter.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[rgba(49,31,40,0.82)]">
            A private little workout world, built as a gift. It starts with a
            soft film moment, continues with your own voice clips, and ends with
            a smile.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-[0.86fr_1.14fr]">
            <div className="soft-ring overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/70">
              <Image
                src="/images/girlfriend-placeholder.svg"
                alt="Replace with a favorite portrait"
                width={900}
                height={1200}
                priority
                className="h-full w-full object-cover"
              />
            </div>

            <div className="glass-panel rounded-[1.8rem] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[var(--berry)]">
                <span>Intro video</span>
                <span className="rounded-full bg-white/80 px-3 py-1">
                  Must finish playing
                </span>
              </div>
              <video
                className="h-full min-h-[260px] w-full rounded-[1.4rem] bg-[#2a1822] object-cover"
                src="/video/intro.mp4"
                poster="/images/intro-poster.svg"
                controls
                playsInline
                preload="metadata"
                onEnded={() => setVideoCompleted(true)}
                onError={() => setVideoMissing(true)}
              />
              <p className="mt-3 text-sm leading-6 text-[rgba(49,31,40,0.72)]">
                Drop your own clip into <code>public/video/intro.mp4</code>. If
                the file is missing you can still preview the app, but the real
                flow unlocks only after the video finishes.
              </p>
            </div>
          </div>
        </section>

        <aside className="fade-up flex flex-col gap-6 [animation-delay:120ms]">
          <section className="glass-panel rounded-[2rem] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Before the sweat
            </p>
            <h2 className="section-title mt-3 text-3xl text-[var(--berry)]">
              A tiny ritual before the countdown starts
            </h2>
            <p className="mt-4 text-base leading-7 text-[rgba(49,31,40,0.78)]">
              The app remembers the last workout on each device, plays a warning
              sound with two seconds left, and can surprise her with your own
              cheer clips during the session.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {videoCompleted ? (
                <Link href="/timer" className="primary-button text-center">
                  {buttonLabel}
                </Link>
              ) : (
                <button type="button" className="primary-button" disabled>
                  {buttonLabel}
                </button>
              )}
            </div>
            {!videoCompleted && !videoMissing ? (
              <p className="mt-3 text-sm text-[rgba(49,31,40,0.65)]">
                Watch the full intro to unlock the workout view.
              </p>
            ) : null}
            {videoMissing ? (
              <p className="mt-3 text-sm text-[rgba(49,31,40,0.65)]">
                No intro file was found yet. Add your video later to replace the
                placeholder.
              </p>
            ) : null}
          </section>

          <section className="glass-panel rounded-[2rem] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Free video tools
            </p>
            <div className="mt-4 grid gap-3">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-[1.3rem] border border-white/70 bg-white/65 p-4"
                >
                  <div className="font-semibold text-[var(--berry)]">
                    {tool.name}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[rgba(49,31,40,0.72)]">
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

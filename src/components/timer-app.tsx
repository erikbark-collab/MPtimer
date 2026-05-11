"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  DEFAULT_PROGRAM,
  LAST_USED_PROGRAM_KEY,
  buildWorkoutPhases,
  clampProgram,
  formatClock,
  type WorkoutPhase,
  type WorkoutProgram,
} from "@/lib/workout";

type TimerAppProps = {
  embeddedIntro?: boolean;
};

type ProgramsResponse = {
  programs: WorkoutProgram[];
  persistence: "enabled" | "disabled";
  message?: string;
};

const CHEER_TRACKS = [
  "/audio/cheer-1.mp3",
  "/audio/cheer-2.mp3",
  "/audio/cheer-3.mp3",
];

const CUSTOM_CUE_FILES = {
  threeSetsLeft: "/audio/Come on three sets left.m4a",
  warmupCheer: "/audio/Warm up cheer.m4a",
  lastSet: "/audio/Last set.m4a",
  randomCheer: "/audio/Random cheer.m4a",
  goodJob: "/audio/Good job.m4a",
} as const;

type ProgramDraft = {
  id?: string;
  name: string;
  warmupSeconds: number;
  workSeconds: number;
  restSeconds: number;
  sets: number;
  cooldownSeconds: number;
};

function toDraft(program: WorkoutProgram): ProgramDraft {
  return {
    id: program.id,
    name: program.name,
    warmupSeconds: program.warmupSeconds,
    workSeconds: program.workSeconds,
    restSeconds: program.restSeconds,
    sets: program.sets,
    cooldownSeconds: program.cooldownSeconds,
  };
}

function createAudioEngine() {
  let audioContext: AudioContext | null = null;

  const getContext = async () => {
    const Context =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!Context) {
      return null;
    }

    audioContext ??= new Context();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return audioContext;
  };

  const playFallbackBeep = async () => {
    const context = await getContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);

    const now = context.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.start(now);
    oscillator.stop(now + 0.25);
  };

  const playFallbackPhaseComplete = async () => {
    const context = await getContext();
    if (!context) {
      return;
    }

    const output = context.createGain();
    output.gain.value = 0.18;
    output.connect(context.destination);

    const now = context.currentTime;
    const voices = [
      { frequency: 1046.5, delay: 0 },
      { frequency: 1318.5, delay: 0.06 },
      { frequency: 1567.98, delay: 0.12 },
    ];

    voices.forEach(({ frequency, delay }, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + delay);
      filter.type = "lowpass";
      filter.frequency.value = 3200;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.12 / (index + 1), now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.8);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      oscillator.start(now + delay);
      oscillator.stop(now + delay + 0.82);

      const echoGain = context.createGain();
      echoGain.gain.setValueAtTime(0.0001, now + delay + 0.18);
      echoGain.gain.exponentialRampToValueAtTime(
        0.045 / (index + 1),
        now + delay + 0.22,
      );
      echoGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.2);
      filter.connect(echoGain);
      echoGain.connect(output);
    });
  };

  const playFile = async (src: string, fallback?: () => Promise<void>) => {
    try {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = 0.9;
      await audio.play();
    } catch (error) {
      if (fallback) {
        await fallback();
      }
      console.warn(`Could not play audio source ${src}.`, error);
    }
  };

  const playCueWithPlaceholder = async (src: string) => {
    await playFile(src, async () =>
      playFile("/audio/go.wav", playFallbackPhaseComplete),
    );
  };

  return {
    playWarning: async () => playFile("/audio/warning-beep.mp3", playFallbackBeep),
    playStart: async () => playFile("/audio/start-voice.mp3"),
    playPhaseComplete: async () =>
      playFile("/audio/go.wav", playFallbackPhaseComplete),
    playCustomCue: async (src: string) => playCueWithPlaceholder(src),
    playCheer: async () => {
      const randomTrack =
        CHEER_TRACKS[Math.floor(Math.random() * CHEER_TRACKS.length)];
      await playFile(randomTrack);
    },
  };
}

function programHasEnoughTimeForCheers(program: WorkoutProgram) {
  const totalTime =
    program.warmupSeconds +
    program.workSeconds * program.sets +
    program.restSeconds * Math.max(program.sets - 1, 0) +
    program.cooldownSeconds;

  return totalTime >= 40;
}

function getPhaseCardClass(phase: WorkoutPhase["kind"]) {
  switch (phase) {
    case "warmup":
      return "phase-warmup";
    case "work":
      return "phase-work";
    case "rest":
      return "phase-rest";
    case "cooldown":
      return "phase-cooldown";
    default:
      return "phase-done";
  }
}

export function TimerApp({ embeddedIntro = false }: TimerAppProps) {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([DEFAULT_PROGRAM]);
  const [selectedProgramId, setSelectedProgramId] = useState(DEFAULT_PROGRAM.id);
  const [draft, setDraft] = useState<ProgramDraft>(toDraft(DEFAULT_PROGRAM));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_PROGRAM.warmupSeconds,
  );
  const [activeProgram, setActiveProgram] = useState<WorkoutProgram | null>(null);
  const [focusTimerView, setFocusTimerView] = useState(false);

  const audioEngineRef = useRef<ReturnType<typeof createAudioEngine> | null>(null);
  const phasesRef = useRef<WorkoutPhase[]>(buildWorkoutPhases(DEFAULT_PROGRAM));
  const warnedCountdownsRef = useRef<Set<string>>(new Set());
  const cueEventsRef = useRef<Set<string>>(new Set());
  const randomCueSetsRef = useRef<Set<number>>(new Set());
  const cheerDeadlineRef = useRef<number | null>(null);
  const nextPhaseStartedAtRef = useRef<number>(0);
  const endTimeRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const timerPanelRef = useRef<HTMLElement | null>(null);

  const buildRandomCueSets = (setCount: number) => {
    const targets = new Set<number>();
    const fullBlocks = Math.floor(setCount / 10);

    for (let block = 0; block < fullBlocks; block += 1) {
      const blockStart = block * 10 + 1;
      const randomOffset = Math.floor(Math.random() * 10);
      targets.add(blockStart + randomOffset);
    }

    return targets;
  };

  const selectedProgram = useMemo(() => {
    return (
      programs.find((program) => program.id === selectedProgramId) ?? DEFAULT_PROGRAM
    );
  }, [programs, selectedProgramId]);

  const previewProgram = useMemo(
    () =>
      clampProgram({
        id: draft.id ?? selectedProgram.id,
        name: draft.name,
        warmupSeconds: draft.warmupSeconds,
        workSeconds: draft.workSeconds,
        restSeconds: draft.restSeconds,
        sets: draft.sets,
        cooldownSeconds: draft.cooldownSeconds,
        createdAt: selectedProgram.createdAt,
        updatedAt: new Date().toISOString(),
      }),
    [draft, selectedProgram],
  );

  const workoutProgram = activeProgram ?? previewProgram;
  const phases = useMemo(() => buildWorkoutPhases(workoutProgram), [workoutProgram]);
  const currentPhase = phases[currentPhaseIndex] ?? phases[phases.length - 1];
  const currentSetLabel =
    currentPhase.kind === "work" || currentPhase.kind === "rest"
      ? `Set ${currentPhase.set} of ${workoutProgram.sets}`
      : currentPhase.kind === "done"
        ? "Done"
        : "Getting ready";

  useEffect(() => {
    phasesRef.current = phases;
  }, [phases]);

  useEffect(() => {
    audioEngineRef.current = createAudioEngine();

    const loadPrograms = async () => {
      try {
        const response = await fetch("/api/programs", { cache: "no-store" });
        const data = (await response.json()) as ProgramsResponse;
        const nextPrograms = data.programs?.length ? data.programs : [DEFAULT_PROGRAM];

        setPrograms(nextPrograms);
        setPersistenceEnabled(data.persistence === "enabled");
        if (data.message) {
          setStatusMessage(data.message);
        }

        const rememberedId =
          window.localStorage.getItem(LAST_USED_PROGRAM_KEY) ?? nextPrograms[0].id;
        const rememberedProgram =
          nextPrograms.find((program) => program.id === rememberedId) ?? nextPrograms[0];

        setSelectedProgramId(rememberedProgram.id);
        setDraft(toDraft(rememberedProgram));
        setCurrentPhaseIndex(0);
        setRemainingSeconds(buildWorkoutPhases(rememberedProgram)[0]?.duration ?? 0);
      } catch (error) {
        setStatusMessage("Could not load saved workouts. The default workout was loaded.");
        console.error(error);
      } finally {
        setLoadingPrograms(false);
      }
    };

    void loadPrograms();

    return () => {
      if (syncTimerRef.current) {
        window.clearInterval(syncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      window.localStorage.setItem(LAST_USED_PROGRAM_KEY, selectedProgramId);
    }
  }, [selectedProgramId]);

  useEffect(() => {
    if (focusTimerView && embeddedIntro) {
      timerPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [embeddedIntro, focusTimerView]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    syncTimerRef.current = window.setInterval(() => {
      const phaseList = phasesRef.current;
      const phase = phaseList[currentPhaseIndex];
      const endTime = endTimeRef.current;

      if (!phase || !endTime) {
        return;
      }

      const secondsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      if ((secondsLeft === 2 || secondsLeft === 1) && phase.kind !== "done") {
        const warningKey = `${currentPhaseIndex}-${secondsLeft}`;
        if (!warnedCountdownsRef.current.has(warningKey)) {
          warnedCountdownsRef.current.add(warningKey);
          void audioEngineRef.current?.playWarning();
        }
      }

      const timeSincePhaseStart = Date.now() - nextPhaseStartedAtRef.current;
      const safeWindow = secondsLeft > 4 && timeSincePhaseStart > 4000;
      const cheerDue =
        cheerDeadlineRef.current !== null && Date.now() >= cheerDeadlineRef.current;

      if (
        cheerDue &&
        safeWindow &&
        phase.kind !== "rest" &&
        programHasEnoughTimeForCheers(workoutProgram)
      ) {
        void audioEngineRef.current?.playCheer();
        cheerDeadlineRef.current = Date.now() + (10000 + Math.random() * 12000);
      }

      if (
        phase.kind === "warmup" &&
        secondsLeft === 10 &&
        !cueEventsRef.current.has("warmup-cheer")
      ) {
        cueEventsRef.current.add("warmup-cheer");
        void audioEngineRef.current?.playCustomCue(CUSTOM_CUE_FILES.warmupCheer);
      }

      if (
        phase.kind === "rest" &&
        phase.set === workoutProgram.sets - 3 &&
        secondsLeft === phase.duration &&
        !cueEventsRef.current.has("three-sets-left")
      ) {
        cueEventsRef.current.add("three-sets-left");
        void audioEngineRef.current?.playCustomCue(CUSTOM_CUE_FILES.threeSetsLeft);
      }

      if (
        phase.kind === "rest" &&
        workoutProgram.sets > 1 &&
        phase.set === workoutProgram.sets - 1 &&
        secondsLeft === Math.min(10, phase.duration) &&
        !cueEventsRef.current.has("last-set")
      ) {
        cueEventsRef.current.add("last-set");
        void audioEngineRef.current?.playCustomCue(CUSTOM_CUE_FILES.lastSet);
      }

      if (
        phase.kind === "cooldown" &&
        secondsLeft === phase.duration &&
        !cueEventsRef.current.has("good-job")
      ) {
        cueEventsRef.current.add("good-job");
        void audioEngineRef.current?.playCustomCue(CUSTOM_CUE_FILES.goodJob);
      }

      if (
        phase.kind === "work" &&
        typeof phase.set === "number" &&
        randomCueSetsRef.current.has(phase.set) &&
        !cueEventsRef.current.has(`random-cheer-${phase.set}`) &&
        timeSincePhaseStart > 2000 &&
        secondsLeft > 3
      ) {
        cueEventsRef.current.add(`random-cheer-${phase.set}`);
        void audioEngineRef.current?.playCustomCue(CUSTOM_CUE_FILES.randomCheer);
      }

      if (secondsLeft <= 0) {
        if (phase.kind !== "done") {
          void audioEngineRef.current?.playPhaseComplete();
        }

        const nextIndex = currentPhaseIndex + 1;
        const nextPhase = phaseList[nextIndex];

        if (!nextPhase) {
          setIsRunning(false);
          setIsPaused(false);
          setIsComplete(true);
          setRemainingSeconds(0);
          setActiveProgram(null);
          return;
        }

        setCurrentPhaseIndex(nextIndex);
        setRemainingSeconds(nextPhase.duration);
        warnedCountdownsRef.current.clear();
        nextPhaseStartedAtRef.current = Date.now();
        endTimeRef.current = Date.now() + nextPhase.duration * 1000;
      }
    }, 250);

    return () => {
      if (syncTimerRef.current) {
        window.clearInterval(syncTimerRef.current);
      }
    };
  }, [currentPhaseIndex, isRunning, workoutProgram]);

  const handleProgramPick = (programId: string) => {
    const nextProgram =
      programs.find((program) => program.id === programId) ?? DEFAULT_PROGRAM;
    const nextPhases = buildWorkoutPhases(nextProgram);
    setSelectedProgramId(nextProgram.id);
    setDraft(toDraft(nextProgram));
    setStatusMessage(null);
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setActiveProgram(null);
    setCurrentPhaseIndex(0);
    setRemainingSeconds(nextPhases[0]?.duration ?? 0);
  };

  const handleDraftChange = (
    key: keyof ProgramDraft,
    value: string,
    numeric = false,
  ) => {
    const nextDraft = {
      ...draft,
      [key]: numeric ? Number(value) : value,
    };

    setDraft(nextDraft);

    if (!isRunning && !isPaused) {
      setActiveProgram(null);
      setIsComplete(false);
      setCurrentPhaseIndex(0);
      setRemainingSeconds(
        buildWorkoutPhases(
          clampProgram({
            id: nextDraft.id ?? selectedProgram.id,
            name: nextDraft.name,
            warmupSeconds: nextDraft.warmupSeconds,
            workSeconds: nextDraft.workSeconds,
            restSeconds: nextDraft.restSeconds,
            sets: nextDraft.sets,
            cooldownSeconds: nextDraft.cooldownSeconds,
            createdAt: selectedProgram.createdAt,
            updatedAt: new Date().toISOString(),
          }),
        )[0]?.duration ?? 0,
      );
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setActiveProgram(null);
    setFocusTimerView(false);
    setCurrentPhaseIndex(0);
    setRemainingSeconds(phases[0]?.duration ?? 0);
    warnedCountdownsRef.current.clear();
    cueEventsRef.current.clear();
    randomCueSetsRef.current.clear();
    cheerDeadlineRef.current = null;
    endTimeRef.current = null;
  };

  const startWorkout = async () => {
    const cleanProgram = clampProgram(previewProgram);
    const nextPhases = buildWorkoutPhases(cleanProgram);

    phasesRef.current = nextPhases;
    setActiveProgram(cleanProgram);

    if (programs.some((program) => program.id === cleanProgram.id)) {
      setSelectedProgramId(cleanProgram.id);
      setPrograms((current) =>
        current.map((program) =>
          program.id === cleanProgram.id ? cleanProgram : program,
        ),
      );
    }

    setCurrentPhaseIndex(0);
    setRemainingSeconds(nextPhases[0]?.duration ?? 0);
    setIsComplete(false);
    setIsRunning(true);
    setIsPaused(false);
    setFocusTimerView(embeddedIntro);
    warnedCountdownsRef.current.clear();
    cueEventsRef.current.clear();
    randomCueSetsRef.current = buildRandomCueSets(cleanProgram.sets);
    nextPhaseStartedAtRef.current = Date.now();
    endTimeRef.current = Date.now() + (nextPhases[0]?.duration ?? 0) * 1000;
    cheerDeadlineRef.current = Date.now() + (12000 + Math.random() * 9000);

    await audioEngineRef.current?.playStart();
  };

  const pauseWorkout = () => {
    setIsRunning(false);
    setIsPaused(true);
    if (syncTimerRef.current) {
      window.clearInterval(syncTimerRef.current);
    }
    endTimeRef.current = null;
  };

  const resumeWorkout = () => {
    if (currentPhase.kind === "done") {
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setFocusTimerView(embeddedIntro);
    nextPhaseStartedAtRef.current = Date.now();
    endTimeRef.current = Date.now() + remainingSeconds * 1000;
  };

  const saveProgram = () => {
    const cleanProgram = clampProgram({
      id: draft.id ?? crypto.randomUUID(),
      name: draft.name,
      warmupSeconds: draft.warmupSeconds,
      workSeconds: draft.workSeconds,
      restSeconds: draft.restSeconds,
      sets: draft.sets,
      cooldownSeconds: draft.cooldownSeconds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    startSavingTransition(() => {
      void (async () => {
        try {
          const method = draft.id ? "PUT" : "POST";
          const url = draft.id ? `/api/programs/${draft.id}` : "/api/programs";
          const response = await fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(cleanProgram),
          });

          const data = (await response.json()) as {
            error?: string;
            program?: WorkoutProgram;
          };

          if (!response.ok || !data.program) {
            throw new Error(data.error ?? "Save failed");
          }

          const savedProgram = data.program;

          setPrograms((current) => {
            const exists = current.some((program) => program.id === savedProgram.id);
            if (exists) {
              return current.map((program) =>
                program.id === savedProgram.id ? savedProgram : program,
              );
            }

            return [savedProgram, ...current];
          });
          setSelectedProgramId(savedProgram.id);
          setDraft(toDraft(savedProgram));
          setStatusMessage("Workout saved.");
        } catch (error) {
          setStatusMessage(
            error instanceof Error
              ? error.message
              : "Could not save the workout right now.",
          );
        }
      })();
    });
  };

  const startNewProgram = () => {
    const nextDraft = {
      name: "New Workout",
      warmupSeconds: 60,
      workSeconds: 20,
      restSeconds: 10,
      sets: 8,
      cooldownSeconds: 60,
    };
    setDraft(nextDraft);
    setStatusMessage(null);
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setActiveProgram(null);
    setCurrentPhaseIndex(0);
    setRemainingSeconds(
      buildWorkoutPhases(
        clampProgram({
          id: selectedProgram.id,
          name: nextDraft.name,
          warmupSeconds: nextDraft.warmupSeconds,
          workSeconds: nextDraft.workSeconds,
          restSeconds: nextDraft.restSeconds,
          sets: nextDraft.sets,
          cooldownSeconds: nextDraft.cooldownSeconds,
          createdAt: selectedProgram.createdAt,
          updatedAt: new Date().toISOString(),
        }),
      )[0]?.duration ?? 0,
    );
  };

  return (
    <main className="py-8 md:py-10">
      <div
        className={`page-shell grid gap-6 ${
          embeddedIntro && focusTimerView
            ? "max-w-4xl"
            : "lg:grid-cols-[0.98fr_1.02fr]"
        }`}
      >
        {!(embeddedIntro && focusTimerView) ? (
          <section className="glass-panel fade-up rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                Workout Studio
              </p>
              <h1 className="section-title mt-2 text-4xl text-[var(--berry)] sm:text-5xl">
                Build tonight&apos;s perfect interval
              </h1>
            </div>
            {embeddedIntro ? null : (
              <Link href="/" className="secondary-button">
                Back to intro
              </Link>
            )}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-white/70 bg-white/60 p-4">
            <label className="mb-2 block text-sm font-semibold text-[var(--berry)]">
              Saved workouts
            </label>
            <select
              className="field"
              value={selectedProgramId}
              onChange={(event) => handleProgramPick(event.target.value)}
              disabled={loadingPrograms}
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" className="secondary-button" onClick={startNewProgram}>
                New workout
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={saveProgram}
                disabled={isSaving || !persistenceEnabled}
              >
                {draft.id ? "Update workout" : "Save new workout"}
              </button>
            </div>
            {!persistenceEnabled ? (
              <p className="mt-3 text-sm text-[rgba(49,31,40,0.66)]">
                Supabase is not configured yet, so cloud saving is temporarily
                disabled. The timer still works with the default workout.
              </p>
            ) : null}
            {statusMessage ? (
              <p className="mt-3 text-sm text-[rgba(49,31,40,0.74)]">
                {statusMessage}
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--berry)]">
                Name
              </span>
              <input
                className="field"
                value={draft.name}
                onChange={(event) => handleDraftChange("name", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--berry)]">
                Sets
              </span>
              <input
                className="field"
                type="number"
                min={1}
                max={30}
                value={draft.sets}
                onChange={(event) => handleDraftChange("sets", event.target.value, true)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--berry)]">
                Warmup (sec)
              </span>
              <input
                className="field"
                type="number"
                min={0}
                max={1800}
                value={draft.warmupSeconds}
                onChange={(event) =>
                  handleDraftChange("warmupSeconds", event.target.value, true)
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--berry)]">
                Work (sec)
              </span>
              <input
                className="field"
                type="number"
                min={1}
                max={1800}
                value={draft.workSeconds}
                onChange={(event) =>
                  handleDraftChange("workSeconds", event.target.value, true)
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--berry)]">
                Rest (sec)
              </span>
              <input
                className="field"
                type="number"
                min={0}
                max={1800}
                value={draft.restSeconds}
                onChange={(event) =>
                  handleDraftChange("restSeconds", event.target.value, true)
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--berry)]">
                Cooldown (sec)
              </span>
              <input
                className="field"
                type="number"
                min={0}
                max={1800}
                value={draft.cooldownSeconds}
                onChange={(event) =>
                  handleDraftChange("cooldownSeconds", event.target.value, true)
                }
              />
            </label>
          </div>
          </section>
        ) : null}

        <section
          ref={timerPanelRef}
          className={`fade-up [animation-delay:120ms] ${
            embeddedIntro && focusTimerView ? "mx-auto w-full max-w-3xl" : ""
          }`}
        >
          <div
            className={`glass-panel timer-gradient rounded-[2rem] p-6 sm:p-8 ${getPhaseCardClass(
              currentPhase.kind,
            )}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                  Active timer
                </p>
                <h2 className="section-title mt-2 text-4xl text-[var(--berry)] sm:text-5xl">
                  {workoutProgram.name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {embeddedIntro && focusTimerView ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setFocusTimerView(false)}
                  >
                    Edit workout
                  </button>
                ) : null}
                <div className="rounded-full border border-white/75 bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--berry)]">
                  {currentSetLabel}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/80 bg-white/70 px-6 py-8 text-center soft-ring">
              <p className="text-base font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                {currentPhase.label}
              </p>
              <div className="section-title mt-4 text-7xl leading-none text-[var(--berry)] sm:text-[7.8rem]">
                {formatClock(remainingSeconds)}
              </div>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[rgba(49,31,40,0.72)]">
                A warning sound plays automatically at both two seconds and one
                second left in each phase. Your own voice clips and cheer
                tracks belong in{" "}
                <code>public/audio</code>.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button type="button" className="primary-button" onClick={startWorkout}>
                {isRunning || isPaused ? "Restart workout" : "Start workout"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={isRunning ? pauseWorkout : resumeWorkout}
                disabled={!isRunning && !isPaused}
              >
                {isRunning ? "Pause" : "Resume"}
              </button>
              <button type="button" className="secondary-button" onClick={resetTimer}>
                Reset
              </button>
            </div>

            {isComplete ? (
              <p className="mt-4 rounded-[1.25rem] border border-white/75 bg-white/65 px-4 py-3 text-sm font-semibold text-[var(--berry)]">
                Workout complete. Time for water, a high five, and maybe one
                extra hug.
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {phases
                .filter((phase) => phase.kind !== "done")
                .map((phase, index) => (
                  <div
                    key={`${phase.kind}-${phase.set ?? "phase"}-${index}`}
                    className={`rounded-[1.35rem] border px-4 py-3 ${
                      index < currentPhaseIndex
                        ? "phase-complete"
                        : index === currentPhaseIndex
                          ? "border-[rgba(208,94,124,0.5)] bg-white/85"
                          : "border-white/70 bg-white/55"
                    }`}
                  >
                    <div className="phase-label font-semibold text-[var(--berry)]">
                      {phase.label}
                    </div>
                    <div className="phase-time mt-1 text-sm text-[rgba(49,31,40,0.7)]">
                      {formatClock(phase.duration)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

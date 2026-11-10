export type WorkoutProgram = {
  id: string;
  name: string;
  warmupSeconds: number;
  workSeconds: number;
  restSeconds: number;
  sets: number;
  cooldownSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutPhase = {
  kind: "warmup" | "work" | "rest" | "cooldown" | "done";
  label: string;
  duration: number;
  set?: number;
};

export const LAST_USED_PROGRAM_KEY = "tabata-timer:last-used-program";

const now = "2026-11-10T00:00:00.000Z";

export const DEFAULT_PROGRAM: WorkoutProgram = {
  id: "preset-drompasset",
  name: "Drömpasset",
  warmupSeconds: 120,
  workSeconds: 40,
  restSeconds: 20,
  sets: 18,
  cooldownSeconds: 0,
  createdAt: now,
  updatedAt: now,
};

export const STANDARD_PROGRAMS: WorkoutProgram[] = [
  DEFAULT_PROGRAM,
  { ...DEFAULT_PROGRAM, id: "preset-30-40-20", name: "Drömpasset 30 min · 40/20", warmupSeconds: 140, sets: 28 },
  { ...DEFAULT_PROGRAM, id: "preset-30-30-30", name: "Drömpasset 30 min · 30/30", warmupSeconds: 150, workSeconds: 30, restSeconds: 30, sets: 28 },
  { ...DEFAULT_PROGRAM, id: "preset-40-40-20", name: "Drömpasset 40 min · 40/20", warmupSeconds: 140, sets: 38 },
];

export function isStandardProgram(id: string) {
  return STANDARD_PROGRAMS.some((program) => program.id === id);
}

export function withStandardPrograms(programs: WorkoutProgram[]) {
  return [...STANDARD_PROGRAMS, ...programs.filter((program) => !isStandardProgram(program.id))];
}

export function clampProgram(program: WorkoutProgram): WorkoutProgram {
  return {
    ...program,
    name: program.name.trim() || "MP's Exercise Timer",
    warmupSeconds: Math.max(0, Math.min(1800, Math.round(program.warmupSeconds))),
    workSeconds: Math.max(1, Math.min(1800, Math.round(program.workSeconds))),
    restSeconds: Math.max(0, Math.min(1800, Math.round(program.restSeconds))),
    sets: Math.max(1, Math.min(60, Math.round(program.sets))),
    cooldownSeconds: Math.max(0, Math.min(1800, Math.round(program.cooldownSeconds))),
  };
}

export function buildWorkoutPhases(program: WorkoutProgram): WorkoutPhase[] {
  const cleanProgram = clampProgram(program);
  const phases: WorkoutPhase[] = [];

  if (cleanProgram.warmupSeconds > 0) {
    phases.push({
      kind: "warmup",
      label: "Warmup",
      duration: cleanProgram.warmupSeconds,
    });
  }

  for (let set = 1; set <= cleanProgram.sets; set += 1) {
    phases.push({
      kind: "work",
      label: `Work ${set}/${cleanProgram.sets}`,
      duration: cleanProgram.workSeconds,
      set,
    });

    if (set < cleanProgram.sets && cleanProgram.restSeconds > 0) {
      phases.push({
        kind: "rest",
        label: `Rest ${set}/${cleanProgram.sets - 1}`,
        duration: cleanProgram.restSeconds,
        set,
      });
    }
  }

  if (cleanProgram.cooldownSeconds > 0) {
    phases.push({
      kind: "cooldown",
      label: "Cooldown",
      duration: cleanProgram.cooldownSeconds,
    });
  }

  phases.push({
    kind: "done",
    label: "Workout complete",
    duration: 0,
  });

  return phases;
}

export function formatClock(totalSeconds: number) {
  const safeTotal = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeTotal / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeTotal % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

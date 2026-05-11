import { NextResponse } from "next/server";

import { DEFAULT_PROGRAM, type WorkoutProgram } from "@/lib/workout";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type DatabaseProgram = {
  id: string;
  name: string;
  warmup_seconds: number;
  work_seconds: number;
  rest_seconds: number;
  sets: number;
  cooldown_seconds: number;
  created_at: string;
  updated_at: string;
};

function mapProgram(program: DatabaseProgram): WorkoutProgram {
  return {
    id: program.id,
    name: program.name,
    warmupSeconds: program.warmup_seconds,
    workSeconds: program.work_seconds,
    restSeconds: program.rest_seconds,
    sets: program.sets,
    cooldownSeconds: program.cooldown_seconds,
    createdAt: program.created_at,
    updatedAt: program.updated_at,
  };
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({
      programs: [DEFAULT_PROGRAM],
      persistence: "disabled",
      message: "Supabase is not configured yet. Add env vars to enable saved programs.",
    });
  }

  const { data, error } = await supabase
    .from("workout_programs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Could not load programs from Supabase." },
      { status: 500 },
    );
  }

  const programs = (data ?? []).map(mapProgram);

  return NextResponse.json({
    programs: programs.length > 0 ? programs : [DEFAULT_PROGRAM],
    persistence: "enabled",
  });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as Partial<WorkoutProgram>;

  const payload = {
    name: body.name?.trim() || "Unnamed Session",
    warmup_seconds: body.warmupSeconds ?? 60,
    work_seconds: body.workSeconds ?? 20,
    rest_seconds: body.restSeconds ?? 10,
    sets: body.sets ?? 8,
    cooldown_seconds: body.cooldownSeconds ?? 60,
  };

  const { data, error } = await supabase
    .from("workout_programs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not save the new program." },
      { status: 500 },
    );
  }

  return NextResponse.json({ program: mapProgram(data as DatabaseProgram) });
}

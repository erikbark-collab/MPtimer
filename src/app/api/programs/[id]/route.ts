import { NextResponse } from "next/server";

import type { WorkoutProgram } from "@/lib/workout";
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<WorkoutProgram>;

  const payload = {
    name: body.name?.trim() || "Unnamed Session",
    warmup_seconds: body.warmupSeconds ?? 60,
    work_seconds: body.workSeconds ?? 20,
    rest_seconds: body.restSeconds ?? 10,
    sets: body.sets ?? 8,
    cooldown_seconds: body.cooldownSeconds ?? 60,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("workout_programs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update the selected program." },
      { status: 500 },
    );
  }

  return NextResponse.json({ program: mapProgram(data as DatabaseProgram) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  const { error } = await supabase.from("workout_programs").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Could not delete the selected workout." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

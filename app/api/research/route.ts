import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;
import { getApplication } from "@/lib/db";
import { researchApplication } from "@/lib/research";
import { Application } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { application_id } = await req.json();
    if (!application_id) return NextResponse.json({ error: "application_id required" }, { status: 400 });

    const app = getApplication(application_id) as Application | undefined;
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const result = await researchApplication(app);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

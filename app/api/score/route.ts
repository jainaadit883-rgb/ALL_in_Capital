import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 60;
import { getApplication, getResearchForApplication } from "@/lib/db";
import { scoreApplication } from "@/lib/scoring";
import { Application, ResearchResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { application_id } = await req.json();
    if (!application_id) return NextResponse.json({ error: "application_id required" }, { status: 400 });

    const app = getApplication(application_id) as Application | undefined;
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const research = getResearchForApplication(application_id) as ResearchResult | null;
    const result = await scoreApplication(app, research);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

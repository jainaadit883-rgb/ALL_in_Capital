import { NextRequest, NextResponse } from "next/server";
import { getApplication, getScoresForApplication, getResearchForApplication } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const application = getApplication(id);
    if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const scores = getScoresForApplication(id);
    const research = getResearchForApplication(id);

    return NextResponse.json({ application, scores, research });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
  }
}

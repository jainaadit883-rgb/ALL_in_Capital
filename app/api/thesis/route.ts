import { NextRequest, NextResponse } from "next/server";
import { getOrInitThesis, reconstructThesis } from "@/lib/thesis";
import { upsertThesisCriterion, getThesisCriteria } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const thesis = await getOrInitThesis();
    return NextResponse.json({ thesis });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load thesis" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "reconstruct") {
      const thesis = await reconstructThesis();
      return NextResponse.json({ thesis });
    }

    if (action === "upsert") {
      const { criterion } = body;
      upsertThesisCriterion({ id: criterion.id || uuidv4(), ...criterion });
      return NextResponse.json({ thesis: getThesisCriteria() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update thesis" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { insertCorrection } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { score_id, application_id, criterion_name, original_score, corrected_score, reason } = await req.json();

    if (!score_id || !application_id || !criterion_name || corrected_score === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    insertCorrection({
      id: uuidv4(),
      score_id,
      application_id,
      criterion_name,
      original_score,
      corrected_score,
      reason: reason || "",
    });

    return NextResponse.json({ success: true, message: "Correction saved. Future similar companies will reflect this." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAllApplications, insertApplication, getDashboardStats } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("stats") === "true") {
      return NextResponse.json(getDashboardStats());
    }
    const applications = getAllApplications();
    return NextResponse.json({ applications });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_name, sector, stage, founder_names, website, deck_text, form_responses } = body;

    if (!company_name || !deck_text) {
      return NextResponse.json({ error: "company_name and deck_text are required" }, { status: 400 });
    }

    const id = uuidv4();
    insertApplication({ id, company_name, sector: sector || "", stage: stage || "", founder_names: founder_names || "", website: website || "", deck_text, form_responses: form_responses || "" });

    return NextResponse.json({ id, status: "pending" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}

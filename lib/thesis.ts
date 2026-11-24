import { v4 as uuidv4 } from "uuid";
import { askJson } from "./claude";
import { upsertThesisCriterion, getThesisCriteria } from "./db";
import { ThesisCriterion } from "./types";

interface RawCriterion {
  name: string;
  description: string;
  weight: number;
  is_anti_thesis: boolean;
  source: string;
}

// All In Capital's thesis reconstructed from public sources.
// This is the seed - the system can update/refine via the UI.
const SEED_THESIS: RawCriterion[] = [
  {
    name: "Pre-seed Stage",
    description: "Company must be at pre-seed stage — typically idea to early MVP, before significant revenue or institutional funding. Post-seed or Series A companies are out of scope.",
    weight: 9,
    is_anti_thesis: false,
    source: "All In Capital website / fund positioning",
  },
  {
    name: "India-focused or India-origin",
    description: "Company is building for India, or the founding team is India-based. The fund is Mumbai-based and focuses primarily on Indian startups.",
    weight: 8,
    is_anti_thesis: false,
    source: "Fund positioning and portfolio pattern",
  },
  {
    name: "Sector Fit: Fintech / Deeptech / Consumer Tech / Consumer Brands",
    description: "Company operates in fintech, deeptech, consumer tech, or consumer brands. B2B SaaS or climate-only plays are likely out of core thesis.",
    weight: 9,
    is_anti_thesis: false,
    source: "All In Capital public thesis statement",
  },
  {
    name: "Founder Quality",
    description: "Founders have relevant domain expertise, prior founder experience, or exceptional insight into the problem. Second-time founders or those with deep sector backgrounds are preferred.",
    weight: 10,
    is_anti_thesis: false,
    source: "Kushal Bhagia interviews and Fund I portfolio pattern",
  },
  {
    name: "Unfair Advantage",
    description: "Team has a defensible edge — distribution, proprietary data, regulatory access, unique technology, or network that competitors cannot easily replicate.",
    weight: 9,
    is_anti_thesis: false,
    source: "Partner interview quotes",
  },
  {
    name: "Market Size",
    description: "Addressable market is large enough for a venture-scale outcome (typically $500M+ TAM in India or global). Niche plays with low ceiling are unlikely to pass.",
    weight: 8,
    is_anti_thesis: false,
    source: "Standard pre-seed fund thesis",
  },
  {
    name: "Problem Clarity",
    description: "Founders articulate a clear, specific problem they have deep insight into. Vague or generic problem statements are a signal to pass.",
    weight: 7,
    is_anti_thesis: false,
    source: "Partner comments in public media",
  },
  {
    name: "Early Traction or Insight Signal",
    description: "Some form of early validation — paying customers, waitlist, strong qualitative insight, or unique data proving the problem. Pure idea-stage with no signal is higher risk.",
    weight: 7,
    is_anti_thesis: false,
    source: "Fund I portfolio pattern",
  },
  {
    name: "Anti-thesis: Capital-intensive Hardware",
    description: "Pure hardware plays requiring heavy capex before software/platform layer are out of thesis. Deeptech is in scope only when it has a software or IP moat.",
    weight: 8,
    is_anti_thesis: true,
    source: "Inferred from portfolio — no pure hardware plays",
  },
  {
    name: "Anti-thesis: Regulated Services requiring heavy NBFC/Insurance license",
    description: "Companies whose model is blocked without a full NBFC, insurance, or banking license before launch are higher friction than thesis supports at pre-seed.",
    weight: 7,
    is_anti_thesis: true,
    source: "Fintech sector pattern inference",
  },
];

export async function reconstructThesis(): Promise<ThesisCriterion[]> {
  // Seed the database with the known criteria
  for (const criterion of SEED_THESIS) {
    upsertThesisCriterion({ id: uuidv4(), ...criterion });
  }

  // Ask Claude to refine/expand based on its knowledge of All In Capital
  const refinement = await askJson<{ additions: RawCriterion[]; notes: string }>(
    `You are reconstructing the investment thesis of All In Capital, a Mumbai-based pre-seed fund founded by Aditya Singh and Kushal Bhagia.

    Based on your knowledge of:
    - Their Fund I portfolio companies
    - Public statements from Kushal Bhagia and Aditya Singh
    - The fund's focus areas: fintech, deeptech, consumer tech, consumer brands
    - Typical pre-seed fund patterns in India

    Current criteria already captured:
    ${SEED_THESIS.map((c) => `- ${c.name}: ${c.description}`).join("\n")}

    Identify any important criteria MISSING from the above list that All In Capital likely uses.
    Return JSON: { "additions": [ { "name": string, "description": string, "weight": 1-10, "is_anti_thesis": boolean, "source": string } ], "notes": string }
    Weight 10 = most important. Limit to 5 additions maximum.`,
    "You are an expert on Indian venture capital and early-stage investing."
  );

  for (const addition of refinement.additions) {
    upsertThesisCriterion({ id: uuidv4(), ...addition });
  }

  return getThesisCriteria() as ThesisCriterion[];
}

export async function getOrInitThesis(): Promise<ThesisCriterion[]> {
  const existing = getThesisCriteria() as ThesisCriterion[];
  if (existing.length > 0) return existing;
  return reconstructThesis();
}

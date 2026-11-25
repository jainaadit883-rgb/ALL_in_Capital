import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : process.env.VERCEL
  ? "/tmp/allin.db"
  : path.resolve("./data/allin.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS thesis_criteria (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 5,
      is_anti_thesis INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      sector TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT '',
      founder_names TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      deck_text TEXT NOT NULL DEFAULT '',
      form_responses TEXT NOT NULL DEFAULT '',
      submitted_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS criterion_scores (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id),
      criterion_id TEXT NOT NULL,
      criterion_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      reasoning TEXT NOT NULL,
      sources TEXT NOT NULL DEFAULT '[]',
      is_gap INTEGER NOT NULL DEFAULT 0,
      gap_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS overall_scores (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id),
      total_score REAL NOT NULL,
      recommendation TEXT NOT NULL,
      memo_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS corrections (
      id TEXT PRIMARY KEY,
      score_id TEXT NOT NULL,
      application_id TEXT NOT NULL,
      criterion_name TEXT NOT NULL,
      original_score INTEGER NOT NULL,
      corrected_score INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS research_results (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id),
      company_findings TEXT NOT NULL DEFAULT '',
      founder_findings TEXT NOT NULL DEFAULT '',
      market_findings TEXT NOT NULL DEFAULT '',
      sources TEXT NOT NULL DEFAULT '[]',
      gaps TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS historical_deals (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      sector TEXT NOT NULL DEFAULT '',
      deck_text TEXT NOT NULL DEFAULT '',
      actual_decision TEXT NOT NULL,
      actual_reasoning TEXT NOT NULL DEFAULT '',
      system_score REAL,
      system_recommendation TEXT,
      system_reasoning TEXT,
      agreed INTEGER,
      backtested_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_criterion_scores_app ON criterion_scores(application_id);
    CREATE INDEX IF NOT EXISTS idx_overall_scores_app ON overall_scores(application_id);
    CREATE INDEX IF NOT EXISTS idx_corrections_criterion ON corrections(criterion_name);
    CREATE INDEX IF NOT EXISTS idx_research_app ON research_results(application_id);
  `);
}

export function getAllApplications() {
  const db = getDb();
  return db.prepare("SELECT * FROM applications ORDER BY submitted_at DESC").all();
}

export function getApplication(id: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
}

export function insertApplication(app: {
  id: string; company_name: string; sector: string; stage: string;
  founder_names: string; website: string; deck_text: string; form_responses: string;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO applications (id, company_name, sector, stage, founder_names, website, deck_text, form_responses, submitted_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(app.id, app.company_name, app.sector, app.stage, app.founder_names, app.website, app.deck_text, app.form_responses, new Date().toISOString());
}

export function updateApplicationStatus(id: string, status: string) {
  const db = getDb();
  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, id);
}

export function getThesisCriteria() {
  const db = getDb();
  return db.prepare("SELECT * FROM thesis_criteria ORDER BY weight DESC").all();
}

export function upsertThesisCriterion(criterion: {
  id: string; name: string; description: string; weight: number;
  is_anti_thesis: boolean; source: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO thesis_criteria (id, name, description, weight, is_anti_thesis, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
    weight=excluded.weight, is_anti_thesis=excluded.is_anti_thesis, source=excluded.source, updated_at=excluded.updated_at
  `).run(criterion.id, criterion.name, criterion.description, criterion.weight, criterion.is_anti_thesis ? 1 : 0, criterion.source, now, now);
}

export function insertCriterionScores(scores: Array<{
  id: string; application_id: string; criterion_id: string; criterion_name: string;
  score: number; reasoning: string; sources: unknown[]; is_gap: boolean; gap_description: string;
}>) {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO criterion_scores (id, application_id, criterion_id, criterion_name, score, reasoning, sources, is_gap, gap_description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((scores) => {
    for (const s of scores) {
      insert.run(s.id, s.application_id, s.criterion_id, s.criterion_name, s.score, s.reasoning, JSON.stringify(s.sources), s.is_gap ? 1 : 0, s.gap_description, new Date().toISOString());
    }
  });
  insertMany(scores);
}

export function insertOverallScore(score: {
  id: string; application_id: string; total_score: number; recommendation: string; memo_text: string;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO overall_scores (id, application_id, total_score, recommendation, memo_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(score.id, score.application_id, score.total_score, score.recommendation, score.memo_text, new Date().toISOString());
}

export function getScoresForApplication(applicationId: string) {
  const db = getDb();
  const overall = db.prepare("SELECT * FROM overall_scores WHERE application_id = ? ORDER BY created_at DESC LIMIT 1").get(applicationId) as { memo_text?: string } | undefined;
  const criteria = db.prepare("SELECT * FROM criterion_scores WHERE application_id = ? ORDER BY score DESC").all(applicationId);
  return { overall, criteria };
}

export function insertResearchResult(r: {
  id: string; application_id: string; company_findings: string; founder_findings: string;
  market_findings: string; sources: unknown[]; gaps: string[];
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO research_results (id, application_id, company_findings, founder_findings, market_findings, sources, gaps, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(r.id, r.application_id, r.company_findings, r.founder_findings, r.market_findings, JSON.stringify(r.sources), JSON.stringify(r.gaps), new Date().toISOString());
}

export function getResearchForApplication(applicationId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM research_results WHERE application_id = ? ORDER BY created_at DESC LIMIT 1").get(applicationId);
}

export function insertCorrection(correction: {
  id: string; score_id: string; application_id: string; criterion_name: string;
  original_score: number; corrected_score: number; reason: string;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO corrections (id, score_id, application_id, criterion_name, original_score, corrected_score, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(correction.id, correction.score_id, correction.application_id, correction.criterion_name, correction.original_score, correction.corrected_score, correction.reason, new Date().toISOString());
}

export function getCorrectionsForCriterion(criterionName: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM corrections WHERE criterion_name = ? ORDER BY created_at DESC LIMIT 20").all(criterionName);
}

export function getAllHistoricalDeals() {
  const db = getDb();
  return db.prepare("SELECT * FROM historical_deals ORDER BY company_name ASC").all();
}

export function insertHistoricalDeal(deal: {
  id: string; company_name: string; sector: string; deck_text: string;
  actual_decision: string; actual_reasoning: string;
}) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO historical_deals (id, company_name, sector, deck_text, actual_decision, actual_reasoning)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(deal.id, deal.company_name, deal.sector, deal.deck_text, deal.actual_decision, deal.actual_reasoning);
}

export function updateHistoricalDealBacktest(id: string, result: {
  system_score: number; system_recommendation: string; system_reasoning: string; agreed: boolean;
}) {
  const db = getDb();
  db.prepare(`
    UPDATE historical_deals SET system_score=?, system_recommendation=?, system_reasoning=?, agreed=?, backtested_at=?
    WHERE id=?
  `).run(result.system_score, result.system_recommendation, result.system_reasoning, result.agreed ? 1 : 0, new Date().toISOString(), id);
}

export function getDashboardStats() {
  const db = getDb();
  const counts = db.prepare(`
    SELECT status, COUNT(*) as count FROM applications GROUP BY status
  `).all() as Array<{ status: string; count: number }>;

  const avgScore = db.prepare(`
    SELECT AVG(total_score) as avg FROM overall_scores
  `).get() as { avg: number | null };

  const stats: Record<string, number> = {};
  for (const row of counts) stats[row.status] = row.count;

  return {
    total_applications: counts.reduce((s, r) => s + r.count, 0),
    pending: stats["pending"] || 0,
    scored: stats["scored"] || 0,
    calls_booked: stats["call_booked"] || 0,
    passed: stats["passed"] || 0,
    funded: stats["funded"] || 0,
    avg_score: avgScore.avg ? Math.round(avgScore.avg * 10) / 10 : 0,
  };
}

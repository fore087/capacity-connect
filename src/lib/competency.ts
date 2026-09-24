/**
 * Competency Matching Engine — a transparent, rule-based scoring method.
 *
 * Levels: 1 Beginner, 2 Intermediate, 3 Advanced, 4 Expert.
 * For each required competency:
 *   - "match" when the trainer's level >= required level
 *   - its score = min(trainerLevel / requiredLevel, 1)   (0 if trainer lacks the competency)
 * Overall match % = average of the scores × 100.
 */
export const LEVELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"] as const;
export const levelName = (n: number | null | undefined) => (n ? LEVELS[n] : "None");

export interface Requirement {
  competency_id: string;
  competency: string;
  required_level: number;
}
export interface MatchRow {
  competency: string;
  required_level: number;
  trainer_level: number;
  match: boolean;
  score: number;
}

export function computeMatch(reqs: Requirement[], trainerLevels: Map<string, number>) {
  const rows: MatchRow[] = reqs.map((r) => {
    const t = trainerLevels.get(r.competency_id) ?? 0;
    return {
      competency: r.competency,
      required_level: r.required_level,
      trainer_level: t,
      match: t >= r.required_level,
      score: Math.min(t / r.required_level, 1),
    };
  });
  const percent = rows.length ? Math.round((rows.reduce((a, b) => a + b.score, 0) / rows.length) * 100) : 0;
  return { rows, percent, matched: rows.filter((r) => r.match).length };
}

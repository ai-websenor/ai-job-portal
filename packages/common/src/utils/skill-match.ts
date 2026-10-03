/**
 * Skill spelling normalisation, shared by every feature that compares skills.
 *
 * Employers type job skills by hand, so the stored spelling rarely equals the
 * candidate's: "React" vs "ReactJS" vs "react.js" vs "React JS". Salary
 * comparables and applicant scoring both compare skill lists, and a mismatch
 * does not throw — it silently matches nothing and reports an honest-looking
 * zero, which is the worst kind of bug to find later.
 *
 * A direct port of `jobboard-ai-engine/app/common/skills.py`, kept
 * behaviour-identical so a job priced by the Python engine and the same job
 * priced here agree.
 */

/** Suffixes employers add to the same technology: "React" stored as "ReactJS". */
const SKILL_SUFFIXES = ['js', '.js', ' js', 'js developer', ' development'];

/**
 * Expand each skill into the spellings employers commonly type.
 *
 * Expansion happens here rather than in SQL so the query keeps using the cheap
 * array-overlap operator instead of normalising every job row.
 */
export function expandSkillVariants(skills: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (value: string) => {
    const trimmed = value.trim();
    // Exact dedupe only: the DB compares with `&&`, which is case-sensitive,
    // so "react" and "React" are both worth sending.
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  };

  for (const skill of skills || []) {
    const raw = String(skill ?? '').trim();
    if (!raw) continue;

    add(raw);
    add(raw.toLowerCase());
    add(titleCase(raw));

    // Strip a trailing variant suffix so "ReactJS" also matches "React".
    const low = raw.toLowerCase();
    let base = raw;
    for (const suffix of SKILL_SUFFIXES) {
      if (low.endsWith(suffix) && low.length > suffix.length + 1) {
        base = trimEdges(raw.slice(0, raw.length - suffix.length));
        add(base);
        add(base.toLowerCase());
        break;
      }
    }

    // ...and the suffixed spellings of the base form. Only for single
    // alphabetic tokens — "Machine LearningJS" and "C++JS" are noise that
    // would never match anything.
    if (base.length >= 3 && /^[a-z]+$/i.test(base)) {
      for (const suffix of ['JS', 'js', '.js', ' JS']) {
        add(`${base}${suffix}`);
        add(`${base.toLowerCase()}${suffix.toLowerCase()}`);
      }
    }

    // Punctuation variants: "Node.js" <-> "Nodejs". "C++"/"CPP" stay as-is.
    if (raw.includes('.')) add(raw.split('.').join(''));
    if (raw.includes(' ')) {
      add(raw.split(' ').join(''));
      add(raw.split(' ').join('-'));
    }
    if (raw.includes('-')) {
      add(raw.split('-').join(' '));
      add(raw.split('-').join(''));
    }
  }

  // Guard the query size — a huge ANY() array is its own performance problem.
  return out.slice(0, 200);
}

/**
 * Reduce a skill to one comparable key.
 *
 * `expandSkillVariants` widens a list for a SQL overlap. This does the
 * opposite: it collapses a spelling to a single token so two lists can be
 * compared in code without counting "React" and "ReactJS" as two skills.
 */
export function canonicalSkill(skill: string): string {
  let raw = String(skill ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return '';

  for (const suffix of SKILL_SUFFIXES) {
    if (raw.endsWith(suffix) && raw.length > suffix.length + 1) {
      raw = trimEdges(raw.slice(0, raw.length - suffix.length));
      break;
    }
  }

  // Punctuation and spacing carry no meaning here: "node.js", "node js" and
  // "nodejs" are one skill. "c++" keeps its plus signs — dropping them would
  // collapse it into "c".
  for (const ch of ['.', ' ', '-', '_', '/']) {
    raw = raw.split(ch).join('');
  }

  return raw;
}

/**
 * Split `required` into matched and missing against `owned`.
 *
 * Comparison is on canonical form, but the returned strings keep the original
 * spelling from `required` — a job asks for "Node.js", not "nodejs".
 */
export function skillOverlap(
  required: string[],
  owned: string[],
): { matched: string[]; missing: string[] } {
  const ownedKeys = new Set<string>();
  for (const skill of owned || []) {
    const key = canonicalSkill(skill);
    if (key) ownedKeys.add(key);
  }

  const matched: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const skill of required || []) {
    const key = canonicalSkill(skill);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    (ownedKeys.has(key) ? matched : missing).push(String(skill).trim());
  }

  return { matched, missing };
}

function titleCase(value: string): string {
  return value.replace(
    /\w\S*/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

/** Python's `strip(" .-")` — trims those characters from both ends. */
function trimEdges(value: string): string {
  return value.replace(/^[\s.-]+/, '').replace(/[\s.-]+$/, '');
}

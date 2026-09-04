/**
 * Structural validation of a generated problem.
 *
 * The important design point: this does NOT return a boolean. Every failure
 * is a sentence written to be pasted straight into a repair prompt, because
 * the repair loop is only as good as what it can tell the model. The edge
 * function's original validatePayload returned true/false and logged the
 * detail to stdout, which threw away exactly the information the agent needs.
 */

/**
 * The 21 values of the problem_category Postgres enum, read from the live
 * database. Note 'Array', singular — the model reliably writes 'Arrays', and
 * repo seed data does too, which fails at INSERT after the tokens are paid
 * for. Checking it here turns that into a repair instead.
 */
export const PROBLEM_CATEGORIES = [
  'Array', 'String', 'Hash Table', 'Linked List', 'Stack', 'Queue', 'Tree',
  'Graph', 'Dynamic Programming', 'Greedy', 'Backtracking', 'Binary Search',
  'Two Pointers', 'Sliding Window', 'Sorting', 'Heap', 'Union Find', 'Trie',
  'Segment Tree', 'Math', 'Geometry',
] as const;

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];
export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export interface ApproachPayload {
  name: string;
  type: 'brute-force' | 'intermediate' | 'optimal';
  when_to_use: string;
  core_intuition: string;
  steps: string[];
  time_complexity: string;
  space_complexity: string;
  pitfalls?: string;
}

export interface ReferencePayload {
  type: 'video' | 'article';
  title: string;
  /**
   * What to search for, NOT a URL.
   *
   * The model cannot know a real YouTube video id, and asking for one gets
   * plausible-looking inventions like `watch?v=oBt53YbR9Kc` that resolve to
   * nothing. The URL is built from this by `youtubeSearchUrl`, which always
   * lands somewhere useful.
   */
  search_query: string;
  /** Legacy: rows generated before the switch to search queries. */
  url?: string;
  author?: string;
}

/** Builds a YouTube search URL that is guaranteed to resolve. */
export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export interface TestCasePayload {
  input: string;
  expectedOutput: string;
  isVisible: boolean;
}

export interface ProblemPayload {
  title: string;
  category: ProblemCategory;
  difficulty: Difficulty;
  description: string;
  quick_refresh: string[];
  pattern_name: string;
  approaches: ApproachPayload[];
  visual_breakdown: string;
  references: ReferencePayload[];
  solutions: { python: string } & Record<string, string>;
  test_cases: TestCasePayload[];
  methods: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  payload?: ProblemPayload;
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function validateProblem(raw: string | unknown): ValidationResult {
  let p: Record<string, unknown>;

  if (typeof raw === 'string') {
    try {
      p = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      return { ok: false, errors: [`output is not valid JSON: ${(e as Error).message}`] };
    }
  } else if (raw && typeof raw === 'object') {
    p = raw as Record<string, unknown>;
  } else {
    return { ok: false, errors: ['output is not a JSON object'] };
  }

  const errors: string[] = [];
  const need = (ok: boolean, msg: string) => {
    if (!ok) errors.push(msg);
  };

  need(isStr(p.title) && p.title.trim().length > 0, 'title must be a non-empty string');

  need(
    isStr(p.category) && (PROBLEM_CATEGORIES as readonly string[]).includes(p.category),
    `category must be exactly one of: ${PROBLEM_CATEGORIES.join(', ')} (got ${JSON.stringify(p.category)})`
  );

  need(
    isStr(p.difficulty) && (DIFFICULTIES as readonly string[]).includes(p.difficulty),
    `difficulty must be exactly one of: Easy, Medium, Hard (got ${JSON.stringify(p.difficulty)})`
  );

  need(
    isStr(p.description) && p.description.trim().length > 100,
    `description must be a problem statement over 100 characters (got ${isStr(p.description) ? p.description.trim().length : 0})`
  );

  const qr = arr(p.quick_refresh);
  need(
    qr.length >= 4 && qr.length <= 6 && qr.every((b) => isStr(b) && b.trim().length > 0),
    `quick_refresh must be 4-6 non-empty bullet strings (got ${qr.length})`
  );

  need(isStr(p.pattern_name) && p.pattern_name.trim().length > 0, 'pattern_name must be a non-empty string');

  const approaches = arr(p.approaches) as ApproachPayload[];
  need(
    approaches.length >= 2 && approaches.length <= 3,
    `approaches must contain 2-3 entries (got ${approaches.length})`
  );
  need(
    approaches.every((a) => ['brute-force', 'intermediate', 'optimal'].includes(a?.type)),
    'every approach needs type set to one of: brute-force, intermediate, optimal'
  );
  need(
    approaches.some((a) => a?.type === 'optimal'),
    'at least one approach must have type "optimal"'
  );
  need(
    new Set(approaches.map((a) => a?.name)).size === approaches.length,
    'approach names must all be different from one another'
  );
  need(
    approaches.every((a) => arr(a?.steps).length >= 4),
    'every approach needs at least 4 entries in steps'
  );
  need(
    approaches.every(
      (a) => isStr(a?.when_to_use) && isStr(a?.core_intuition) && isStr(a?.time_complexity) && isStr(a?.space_complexity)
    ),
    'every approach needs when_to_use, core_intuition, time_complexity and space_complexity as strings'
  );

  need(
    isStr(p.visual_breakdown) && p.visual_breakdown.trim().length >= 50,
    `visual_breakdown must be at least 50 characters of ASCII diagram (got ${isStr(p.visual_breakdown) ? p.visual_breakdown.trim().length : 0})`
  );

  const refs = arr(p.references) as ReferencePayload[];
  need(refs.length >= 2, `references must contain at least 2 entries (got ${refs.length})`);
  need(
    refs.every((r) => r?.type === 'video'),
    'every reference must have type "video"'
  );
  need(
    refs.every((r) => isStr(r?.search_query) && r.search_query.trim().length >= 5),
    'every reference needs a "search_query" of at least 5 characters, not a url — an invented video id resolves to a dead link'
  );
  need(
    refs.every((r) => isStr(r?.title) && r.title.trim().length > 0),
    'every reference needs a non-empty title'
  );

  const python = (p.solutions as Record<string, unknown> | undefined)?.python;
  need(
    isStr(python) && python.trim().length > 50,
    `solutions.python must be a real working solution over 50 characters (got ${isStr(python) ? python.trim().length : 0})`
  );
  // A def with its body on the same line is not valid Python. The model
  // collapses solutions onto one line unless told not to, and length alone
  // does not catch it.
  need(
    isStr(python) && python.includes('\n'),
    'solutions.python must contain real line breaks (\\n) — a function body on the same line as its "def" is not valid Python'
  );
  need(
    !isStr(python) || !python.includes('\n') || /\n[ \t]+\S/.test(python),
    'solutions.python must indent its body — use 4 spaces after each "def", "if" and "for"'
  );

  const tc = arr(p.test_cases) as TestCasePayload[];
  need(tc.length === 5, `test_cases must contain exactly 5 entries (got ${tc.length})`);
  need(
    tc.every((t) => isStr(t?.input) && isStr(t?.expectedOutput) && typeof t?.isVisible === 'boolean'),
    'every test case needs input and expectedOutput as strings and isVisible as a boolean'
  );

  need(arr(p.methods).length > 0, 'methods must be a non-empty array of short technique names');

  return errors.length === 0
    ? { ok: true, errors: [], payload: p as unknown as ProblemPayload }
    : { ok: false, errors };
}

/**
 * Formats validator output as the correction instruction appended to the next
 * generate attempt. This string is the entire mechanism of the repair loop.
 */
export function buildRepairNote(errors: string[]): string {
  return [
    'Your previous JSON output failed validation with these errors:',
    ...errors.map((e, i) => `${i + 1}. ${e}`),
    '',
    'Return the COMPLETE corrected JSON object. Fix every listed error.',
    'Do not change fields that were already valid.',
  ].join('\n');
}

/**
 * The generation prompt.
 *
 * Derived from the SYSTEM_PROMPT in supabase/functions/generate-problem, with
 * one substantive change: the 21 category values are enumerated verbatim.
 * The original said only "one of the standard DSA categories", so the model
 * would emit "Arrays" or "DP" and the insert would fail against the
 * problem_category enum — after the tokens had been paid for.
 */
import { PROBLEM_CATEGORIES, DIFFICULTIES } from './validate';

export const SYSTEM_PROMPT = `You are an expert competitive programming instructor building spaced-repetition review material for a DSA learner.

Return ONE JSON object. No prose, no markdown fences.

REQUIRED SHAPE
{
  "title": string,
  "category": one of exactly: ${PROBLEM_CATEGORIES.map((c) => `"${c}"`).join(', ')},
  "difficulty": one of exactly: ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')},
  "description": string, over 100 characters, a full problem statement with input/output format and constraints,
  "quick_refresh": array of 4-6 short strings, the things to recall before solving,
  "pattern_name": string, the named technique (e.g. "Two Pointers - opposite ends"),
  "approaches": array of 2-3 objects [
    {
      "name": string, unique within the array,
      "type": "brute-force" | "intermediate" | "optimal",
      "when_to_use": string,
      "core_intuition": string,
      "steps": array of AT LEAST 4 strings,
      "time_complexity": string,
      "space_complexity": string,
      "pitfalls": string (optional)
    }
  ],
  "visual_breakdown": string, at least 50 characters of ASCII diagram showing the mechanism,
  "references": array of at least 2 objects [
    { "type": "video", "title": string, "search_query": string, "author": string }
  ],
  "solutions": { "python": string, a complete working solution },
  "test_cases": array of EXACTLY 5 objects [
    { "input": string, "expectedOutput": string, "isVisible": boolean }
  ],
  "methods": non-empty array of short technique names
}

HARD RULES
- "category" MUST be copied character for character from the list above. "Arrays" is wrong; "Array" is correct.
- At least one approach MUST have "type": "optimal".
- Exactly 5 test cases: 3 with isVisible true, 2 with isVisible false.
- The problem must be solvable and the Python solution must actually pass the test cases you write.
- Write a NEW problem. Do not restate a well-known problem verbatim under a new name.

SOLUTION FORMATTING — this is checked and rejected
- "solutions.python" MUST be real, runnable Python with REAL LINE BREAKS.
  In JSON that means the string contains \\n escapes between statements.
- Indent bodies with 4 spaces. A function whose body is on the same line as
  its "def" is invalid Python and will be rejected.
- Do NOT collapse the solution onto one line. This is wrong:
    "def f(x): n = len(x) if n == 0: return 0"
  This is right:
    "def f(x):\\n    n = len(x)\\n    if n == 0:\\n        return 0\\n    return n"

REFERENCES — do not invent URLs
- Give "search_query", NOT a url. You cannot know a real video ID, and an
  invented one produces a dead link. The application builds a YouTube search
  URL from your query.
- Make the query something that finds good explanations of the technique,
  e.g. "two pointers technique explained" or "sliding window maximum tutorial".`;

export interface PromptInput {
  category?: string | null;
  difficulty?: string | null;
  existingTitles: string[];
  creativeHint: string;
  repairNote?: string;
}

export function buildUserPrompt(input: PromptInput): string {
  const parts: string[] = [];

  if (input.category) parts.push(`Category: ${input.category}`);
  if (input.difficulty) parts.push(`Difficulty: ${input.difficulty}`);
  parts.push(`Angle to explore: ${input.creativeHint}`);

  if (input.existingTitles.length > 0) {
    parts.push(
      `Avoid anything close to these existing problems:\n${input.existingTitles.map((t) => `- ${t}`).join('\n')}`
    );
  }

  parts.push('Generate the complete JSON object now.');

  // The repair note goes last so it is the most recent instruction in context.
  if (input.repairNote) {
    parts.push('', input.repairNote);
  }

  return parts.join('\n\n');
}

/**
 * Rotated to keep generations from collapsing onto the same few problems.
 * Chosen by the workflow (not the activity) so it is recorded in history and
 * a replay reproduces the same prompt.
 */
export const CREATIVE_HINTS = [
  'a real-world scheduling or logistics framing',
  'an inventory or resource allocation framing',
  'a text or log parsing framing',
  'a game state or simulation framing',
  'a graph of dependencies between tasks',
  'a streaming or online-algorithm framing where input arrives one item at a time',
  'a geometry or grid traversal framing',
  'a financial or time-series framing',
  'a biology or sequence-matching framing',
  'a networking or routing framing',
] as const;

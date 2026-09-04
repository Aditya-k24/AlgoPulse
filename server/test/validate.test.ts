/**
 * Validator behaviour.
 *
 * This is the contract the repair loop depends on, so the assertions are as
 * much about the CONTENT of each error string as about the pass/fail bit — a
 * message the model cannot act on is a bug even when the boolean is right.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProblem,
  buildRepairNote,
  youtubeSearchUrl,
  PROBLEM_CATEGORIES,
} from '../src/validate';

/** Minimal payload that satisfies every predicate. Tests mutate a clone. */
function valid(): Record<string, unknown> {
  return {
    title: 'Warehouse Pair Packing',
    category: 'Two Pointers',
    difficulty: 'Easy',
    description: 'x'.repeat(140),
    quick_refresh: ['a', 'b', 'c', 'd', 'e'],
    pattern_name: 'Two Pointers - opposite ends',
    approaches: [
      {
        name: 'Brute force',
        type: 'brute-force',
        when_to_use: 'small inputs',
        core_intuition: 'try all pairs',
        steps: ['s1', 's2', 's3', 's4'],
        time_complexity: 'O(n^2)',
        space_complexity: 'O(1)',
      },
      {
        name: 'Converging pointers',
        type: 'optimal',
        when_to_use: 'sorted input',
        core_intuition: 'sortedness makes the sum monotone',
        steps: ['s1', 's2', 's3', 's4'],
        time_complexity: 'O(n)',
        space_complexity: 'O(1)',
      },
    ],
    visual_breakdown: 'y'.repeat(60),
    references: [
      { type: 'video', title: 'A', search_query: 'two pointers explained' },
      { type: 'video', title: 'B', search_query: 'sliding window tutorial' },
    ],
    solutions: { python: 'def solve():\n    ' + 'p'.repeat(60) },
    test_cases: [1, 2, 3, 4, 5].map((n) => ({
      input: String(n),
      expectedOutput: String(n),
      isVisible: n <= 3,
    })),
    methods: ['two pointers'],
  };
}

/** Asserts the payload fails, and returns the errors for further checks. */
function errorsFor(mutate: (p: Record<string, unknown>) => void): string[] {
  const p = valid();
  mutate(p);
  const result = validateProblem(p);
  assert.equal(result.ok, false, 'expected this payload to be rejected');
  return result.errors;
}

describe('validateProblem', () => {
  it('accepts a well-formed payload', () => {
    const result = validateProblem(valid());
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.equal(result.payload?.title, 'Warehouse Pair Packing');
  });

  it('accepts the same payload as a JSON string', () => {
    assert.equal(validateProblem(JSON.stringify(valid())).ok, true);
  });

  it('reports unparseable JSON rather than throwing', () => {
    const result = validateProblem('{not json');
    assert.equal(result.ok, false);
    assert.match(result.errors[0]!, /not valid JSON/);
  });

  it('rejects a non-object payload', () => {
    assert.equal(validateProblem(42 as unknown).ok, false);
  });

  // The single most valuable case: this is the failure that would otherwise
  // surface as a Postgres enum error at INSERT, after the tokens are paid for.
  it('rejects the plural "Arrays" and names every legal category', () => {
    const errors = errorsFor((p) => {
      p.category = 'Arrays';
    });
    const categoryError = errors.find((e) => e.startsWith('category'))!;
    assert.ok(categoryError, 'a category error must be reported');
    assert.match(categoryError, /"Arrays"/, 'must quote what the model actually sent');
    // The message has to be actionable on its own, since it goes straight
    // into the repair prompt with no other context.
    for (const c of PROBLEM_CATEGORIES) {
      assert.ok(categoryError.includes(c), `repair prompt omits the legal value ${c}`);
    }
  });

  it('accepts every legal category value', () => {
    for (const category of PROBLEM_CATEGORIES) {
      const p = valid();
      p.category = category;
      assert.equal(validateProblem(p).ok, true, `${category} should be accepted`);
    }
  });

  it('rejects a bad difficulty', () => {
    const errors = errorsFor((p) => {
      p.difficulty = 'Beginner';
    });
    assert.ok(errors.some((e) => /difficulty must be exactly one of/.test(e)));
  });

  it('rejects a description that is too short, and says how short', () => {
    const errors = errorsFor((p) => {
      p.description = 'too short';
    });
    assert.ok(errors.some((e) => /description/.test(e) && /got 9/.test(e)));
  });

  it('rejects quick_refresh outside 4-6 bullets', () => {
    assert.ok(errorsFor((p) => { p.quick_refresh = ['a', 'b']; }).some((e) => /quick_refresh/.test(e)));
    assert.ok(
      errorsFor((p) => { p.quick_refresh = ['a', 'b', 'c', 'd', 'e', 'f', 'g']; }).some((e) => /quick_refresh/.test(e))
    );
  });

  it('requires 2-3 approaches with at least one optimal', () => {
    const tooFew = errorsFor((p) => {
      p.approaches = [(p.approaches as unknown[])[0]];
    });
    assert.ok(tooFew.some((e) => /approaches must contain 2-3 entries \(got 1\)/.test(e)));
    assert.ok(tooFew.some((e) => /at least one approach must have type "optimal"/.test(e)));
  });

  it('rejects duplicate approach names', () => {
    const errors = errorsFor((p) => {
      const a = p.approaches as Record<string, unknown>[];
      a[1]!.name = a[0]!.name;
    });
    assert.ok(errors.some((e) => /approach names must all be different/.test(e)));
  });

  it('requires at least 4 steps in every approach', () => {
    const errors = errorsFor((p) => {
      (p.approaches as Record<string, unknown>[])[0]!.steps = ['only', 'two'];
    });
    assert.ok(errors.some((e) => /at least 4 entries in steps/.test(e)));
  });

  it('requires a substantial visual_breakdown', () => {
    assert.ok(errorsFor((p) => { p.visual_breakdown = 'tiny'; }).some((e) => /visual_breakdown/.test(e)));
  });

  it('requires at least two video references', () => {
    assert.ok(errorsFor((p) => { p.references = []; }).some((e) => /at least 2 entries/.test(e)));
  });

  // The model cannot know a real YouTube video id. Asking for one produced
  // plausible inventions like watch?v=oBt53YbR9Kc that resolve to nothing, so
  // every generated problem shipped with dead links.
  it('rejects a reference that supplies a url instead of a search query', () => {
    const errors = errorsFor((p) => {
      const refs = p.references as Record<string, unknown>[];
      delete refs[0]!.search_query;
      refs[0]!.url = 'https://www.youtube.com/watch?v=oBt53YbR9Kc';
    });
    const err = errors.find((e) => /search_query/.test(e))!;
    assert.ok(err, 'must reject a reference with no search_query');
    assert.match(err, /dead link/, 'the repair prompt should say why a url is wrong');
  });

  it('rejects a search query too short to find anything', () => {
    assert.ok(
      errorsFor((p) => {
        (p.references as Record<string, unknown>[])[0]!.search_query = 'dp';
      }).some((e) => /search_query/.test(e))
    );
  });

  it('requires a real python solution', () => {
    assert.ok(errorsFor((p) => { p.solutions = { python: 'pass' }; }).some((e) => /solutions\.python/.test(e)));
  });

  // Observed in production: the model collapsed an entire function onto one
  // line, which is long enough to pass a length check and is not valid Python.
  it('rejects a python solution collapsed onto a single line', () => {
    const errors = errorsFor((p) => {
      p.solutions = {
        python:
          'def max_points(points): n = len(points) if n == 0: return 0 if n == 1: return points[0] dp = [0] * n',
      };
    });
    const err = errors.find((e) => /line breaks/.test(e))!;
    assert.ok(err, 'a single-line solution must be rejected');
    assert.match(err, /def/, 'the message should explain what is invalid about it');
  });

  it('rejects a multi-line solution with no indentation', () => {
    assert.ok(
      errorsFor((p) => {
        p.solutions = { python: 'def solve(xs):\nreturn sum(xs)\n' + 'x'.repeat(60) };
      }).some((e) => /indent/.test(e))
    );
  });

  it('accepts properly formatted multi-line python', () => {
    const p = valid();
    p.solutions = {
      python: 'def solve(nums, target):\n    left = 0\n    right = len(nums) - 1\n    return [left, right]',
    };
    assert.equal(validateProblem(p).ok, true);
  });

  it('requires exactly five test cases', () => {
    const errors = errorsFor((p) => {
      p.test_cases = (p.test_cases as unknown[]).slice(0, 3);
    });
    assert.ok(errors.some((e) => /exactly 5 entries \(got 3\)/.test(e)));
  });

  it('reports every problem at once, not just the first', () => {
    const errors = errorsFor((p) => {
      p.category = 'Arrays';
      p.difficulty = 'Trivial';
      p.test_cases = [];
    });
    // One round trip per error would triple the LLM spend on a bad generation.
    assert.ok(errors.length >= 3, `expected several errors, got ${errors.length}`);
  });
});

describe('youtubeSearchUrl', () => {
  it('builds a search URL that always resolves', () => {
    const url = youtubeSearchUrl('two pointers technique explained');
    assert.equal(url, 'https://www.youtube.com/results?search_query=two%20pointers%20technique%20explained');
  });

  it('escapes characters that would break the query string', () => {
    const url = youtubeSearchUrl('big-o & "amortised" cost?');
    assert.ok(!/[ "]/.test(url.split('search_query=')[1]!), 'spaces and quotes must be encoded');
    assert.match(url, /^https:\/\/www\.youtube\.com\/results\?search_query=/);
  });
});

describe('buildRepairNote', () => {
  it('numbers the errors and instructs a complete rewrite', () => {
    const note = buildRepairNote(['category must be "Array"', 'test_cases must contain exactly 5']);
    assert.match(note, /failed validation/);
    assert.match(note, /1\. category must be "Array"/);
    assert.match(note, /2\. test_cases must contain exactly 5/);
    assert.match(note, /COMPLETE corrected JSON object/);
    // Without this the model tends to "fix" fields that were already fine.
    assert.match(note, /Do not change fields that were already valid/);
  });
});

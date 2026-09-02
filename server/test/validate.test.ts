/**
 * Validator behaviour.
 *
 * This is the contract the repair loop depends on, so the assertions are as
 * much about the CONTENT of each error string as about the pass/fail bit — a
 * message the model cannot act on is a bug even when the boolean is right.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateProblem, buildRepairNote, PROBLEM_CATEGORIES } from '../src/validate';

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
      { type: 'video', title: 'A', url: 'https://www.youtube.com/watch?v=1' },
      { type: 'video', title: 'B', url: 'https://www.youtube.com/watch?v=2' },
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

  it('requires at least two youtube video references', () => {
    assert.ok(errorsFor((p) => { p.references = []; }).some((e) => /at least 2 entries/.test(e)));
    assert.ok(
      errorsFor((p) => {
        (p.references as Record<string, unknown>[])[0]!.url = 'https://example.com/x';
      }).some((e) => /youtube\.com/.test(e))
    );
  });

  it('requires a real python solution', () => {
    assert.ok(errorsFor((p) => { p.solutions = { python: 'pass' }; }).some((e) => /solutions\.python/.test(e)));
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

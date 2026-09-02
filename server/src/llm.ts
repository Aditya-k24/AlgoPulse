/**
 * LLM access, with a stub mode.
 *
 * The stub is not a testing nicety — it is what makes the throughput
 * benchmarks meaningful and free. Measuring end-to-end with a real model
 * measures OpenAI's queue, not this pipeline, and costs money per run.
 */
import OpenAI from 'openai';
import { config } from './config';

export interface StreamArgs {
  system: string;
  user: string;
  signal?: AbortSignal;
}

/** Yields coalesced text deltas as the model produces them. */
export type TextStream = AsyncIterable<string>;

export function streamCompletion(args: StreamArgs): TextStream {
  if (config.llmMode === 'stub') return stubStream();
  return liveStream(args);
}

async function* liveStream({ system, user, signal }: StreamArgs): TextStream {
  const client = new OpenAI({ apiKey: config.openaiApiKey });

  const stream = await client.chat.completions.create(
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 3000,
      stream: true,
    },
    // Wired to Temporal's cancellation signal, so a cancelled workflow or a
    // shutting-down worker aborts the HTTP request rather than leaking it.
    { signal }
  );

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * A payload that satisfies every predicate in validate.ts, streamed in small
 * pieces so the coalescing and event path are exercised exactly as they are
 * in live mode.
 *
 * With CHAOS_INVALID_PAYLOAD=1 the first emission is deliberately invalid —
 * wrong category casing and a single approach — to demo the repair loop.
 */
async function* stubStream(): TextStream {
  const body = config.chaosInvalidPayload && !chaosAlreadyFired
    ? invalidPayload()
    : validPayload();

  // One-shot: the repair attempt must succeed, otherwise the demo just fails.
  if (config.chaosInvalidPayload) chaosAlreadyFired = true;

  const text = JSON.stringify(body);
  const CHUNK = 64;
  for (let i = 0; i < text.length; i += CHUNK) {
    yield text.slice(i, i + CHUNK);
  }
}

let chaosAlreadyFired = false;

/** Exposed so tests can reset the one-shot chaos flag between cases. */
export function resetChaos(): void {
  chaosAlreadyFired = false;
}

const PY_SOLUTION = `def solve(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1
        else:
            right -= 1
    return []`;

function validPayload(): Record<string, unknown> {
  return {
    title: 'Warehouse Pair Packing',
    category: 'Two Pointers',
    difficulty: 'Easy',
    description:
      'A warehouse stores items on a single shelf, sorted by weight in non-decreasing order. ' +
      'A courier can carry exactly two items per trip, and the combined weight must equal the ' +
      'van capacity exactly. Given the sorted weights and the capacity, return the indices of ' +
      'the two items that fill the van exactly, or an empty list if no such pair exists.',
    quick_refresh: [
      'The array is already sorted, so no hashing is needed.',
      'Two pointers from opposite ends converge in one pass.',
      'Moving the left pointer only ever increases the sum.',
      'Moving the right pointer only ever decreases the sum.',
      'Stop as soon as the pointers meet.',
    ],
    pattern_name: 'Two Pointers - opposite ends',
    approaches: [
      {
        name: 'Check every pair',
        type: 'brute-force',
        when_to_use: 'When the input is tiny or not sorted and you need a correctness baseline.',
        core_intuition: 'Every pair is a candidate, so try them all.',
        steps: [
          'Loop i over every index.',
          'Loop j over every index after i.',
          'Compare nums[i] + nums[j] against the target.',
          'Return the pair on the first exact match.',
        ],
        time_complexity: 'O(n^2)',
        space_complexity: 'O(1)',
        pitfalls: 'Times out once n passes a few thousand.',
      },
      {
        name: 'Converging pointers',
        type: 'optimal',
        when_to_use: 'When the input is sorted and you need a single pass in constant space.',
        core_intuition:
          'Sortedness means the sum moves predictably: advancing left raises it, retreating right lowers it.',
        steps: [
          'Place left at index 0 and right at the last index.',
          'Compute the sum of the two pointed values.',
          'Return both indices if the sum equals the target.',
          'Advance left when the sum is too small, retreat right when too large.',
          'Return an empty list once the pointers meet.',
        ],
        time_complexity: 'O(n)',
        space_complexity: 'O(1)',
        pitfalls: 'Only valid on sorted input; sorting first would cost O(n log n).',
      },
    ],
    visual_breakdown: [
      'weights: [1, 3, 4, 6, 9]   capacity = 10',
      '',
      '          L           R      1 + 9 = 10  -> match, return [0, 4]',
      '          v           v',
      '        [ 1, 3, 4, 6, 9 ]',
      '',
      'too small -> L moves right      too large -> R moves left',
    ].join('\n'),
    references: [
      {
        type: 'video',
        title: 'Two Pointers Technique, explained',
        url: 'https://www.youtube.com/watch?v=On03HWe2tZM',
        author: 'NeetCode',
      },
      {
        type: 'video',
        title: 'Two Sum II with two pointers',
        url: 'https://www.youtube.com/watch?v=cQ1Oz4ckceM',
        author: 'NeetCode',
      },
    ],
    solutions: { python: PY_SOLUTION },
    test_cases: [
      { input: '[1, 3, 4, 6, 9]\n10', expectedOutput: '[0, 4]', isVisible: true },
      { input: '[2, 3, 4]\n6', expectedOutput: '[0, 2]', isVisible: true },
      { input: '[1, 2]\n3', expectedOutput: '[0, 1]', isVisible: true },
      { input: '[1, 2, 5]\n100', expectedOutput: '[]', isVisible: false },
      { input: '[5, 5]\n10', expectedOutput: '[0, 1]', isVisible: false },
    ],
    methods: ['two pointers', 'sorted scan'],
  };
}

/** Trips the category enum check and the approach-count check. */
function invalidPayload(): Record<string, unknown> {
  const p = validPayload();
  p.category = 'Arrays'; // plural — not a member of problem_category
  p.approaches = [(p.approaches as unknown[])[0]]; // only one, and not optimal
  return p;
}

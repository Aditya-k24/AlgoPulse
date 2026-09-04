/**
 * Incremental Server-Sent Events parser.
 *
 * Follows the WHATWG event-stream spec closely enough for our transport:
 * LF / CRLF / CR line endings, comment lines (our heartbeats), multi-line
 * `data`, and `id` tracking so a dropped connection can resume with
 * Last-Event-ID.
 *
 * Deliberately pure and stream-free: the parser takes strings and returns
 * frames, so every edge case is testable under `node --test` with no native
 * fetch and no device. `readSSE` below is the thin adapter over expo/fetch's
 * ReadableStream.
 */

export interface SSEFrame {
  /** The `event:` field, or 'message' when the stream omits it. */
  event: string;
  /** The `data:` field. Multiple data lines are joined with '\n'. */
  data: string;
  /** Most recent `id:` seen — this frame's, or an earlier one's. */
  id?: string;
  /** `retry:` reconnection hint in ms, if this frame carried one. */
  retry?: number;
}

export interface SSEParser {
  /** Feed a decoded chunk; returns whatever complete frames it completed. */
  push(chunk: string): SSEFrame[];
  /**
   * Signal end of stream. Resolves the trailing-'\r' ambiguity that `push`
   * must leave open, so a frame terminated by a bare CR at the very end of
   * the body is not lost. An unterminated frame is discarded, per spec.
   */
  flush(): SSEFrame[];
  /** Last `id:` seen, for the Last-Event-ID header on reconnect. */
  lastEventId(): string | undefined;
  /** Most recent `retry:` hint in ms, if the server sent one. */
  retryHint(): number | undefined;
}

export function createSSEParser(initialLastEventId?: string): SSEParser {
  let buffer = '';
  let dataLines: string[] = [];
  let eventType = '';
  let lastId: string | undefined = initialLastEventId;
  let frameRetry: number | undefined;
  let lastRetry: number | undefined;

  /** Returns a frame when the line completes one, else null. */
  function handleLine(line: string): SSEFrame | null {
    // Blank line dispatches whatever has accumulated.
    if (line === '') {
      // Spec: an empty data buffer dispatches nothing, but any `id` seen
      // still counts. This is what makes bare heartbeats free.
      if (dataLines.length === 0) {
        eventType = '';
        frameRetry = undefined;
        return null;
      }
      const frame: SSEFrame = {
        event: eventType || 'message',
        data: dataLines.join('\n'),
        id: lastId,
        ...(frameRetry !== undefined ? { retry: frameRetry } : {}),
      };
      dataLines = [];
      eventType = '';
      frameRetry = undefined;
      return frame;
    }

    // Comment line — used for our keep-alive pings.
    if (line.startsWith(':')) return null;

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    // Exactly one leading space after the colon is part of the framing.
    if (value.startsWith(' ')) value = value.slice(1);

    switch (field) {
      case 'event':
        eventType = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        // Spec: ignore an id containing a NUL.
        if (!value.includes('\0')) lastId = value;
        break;
      case 'retry': {
        // Spec: ignore unless the value is all ASCII digits.
        if (/^\d+$/.test(value)) {
          frameRetry = Number(value);
          lastRetry = frameRetry;
        }
        break;
      }
      default:
        // Unknown fields are ignored, per spec.
        break;
    }
    return null;
  }

  return {
    push(chunk: string): SSEFrame[] {
      buffer += chunk;
      const frames: SSEFrame[] = [];
      let start = 0;
      let i = 0;

      while (i < buffer.length) {
        const c = buffer[i];
        if (c !== '\n' && c !== '\r') {
          i++;
          continue;
        }
        // A trailing lone '\r' may be the first half of a '\r\n' split
        // across chunks — leave it buffered rather than guess.
        if (c === '\r' && i === buffer.length - 1) break;

        const line = buffer.slice(start, i);
        i += c === '\r' && buffer[i + 1] === '\n' ? 2 : 1;
        start = i;

        const frame = handleLine(line);
        if (frame) frames.push(frame);
      }

      buffer = buffer.slice(start);
      return frames;
    },

    flush(): SSEFrame[] {
      if (buffer.length === 0) return [];
      // No further bytes can arrive, so a trailing '\r' is unambiguously a
      // line terminator rather than the first half of a '\r\n'.
      const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
      buffer = '';
      const frame = handleLine(line);
      return frame ? [frame] : [];
    },

    lastEventId: () => lastId,
    retryHint: () => lastRetry,
  };
}

/**
 * Adapts a ReadableStream of bytes into an async iterable of SSE frames.
 *
 * Pair with expo/fetch, whose Response actually exposes `body` — React
 * Native's built-in fetch is an XMLHttpRequest polyfill with no body stream,
 * so this will not work over it.
 */
export async function* readSSE(
  body: ReadableStream<Uint8Array>,
  parser: SSEParser = createSSEParser()
): AsyncGenerator<SSEFrame, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // stream: true keeps multi-byte characters intact across chunks.
      for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
        yield frame;
      }
    }
    // Flush anything the decoder held back, then resolve a trailing CR.
    for (const frame of parser.push(decoder.decode())) yield frame;
    for (const frame of parser.flush()) yield frame;
  } finally {
    reader.releaseLock();
  }
}

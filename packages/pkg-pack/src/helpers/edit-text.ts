export type TextSpan = {
  readonly start: number;
  readonly length: number;
};

export type TextChange = {
  readonly span: TextSpan;
  readonly newText: string;
};

export function editText(text: string, changes: readonly TextChange[]) {
  if (changes.length === 0) return text;

  const originalIndexes = new Map<object, number>();

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]!;
    if (change.span.start < 0) {
      throw new Error(`Change start is negative (${change.span.start})`);
    }
    if (change.span.length < 0) {
      throw new Error(`Change length is negative (${change.span.length})`);
    }
    if (change.span.start > text.length) {
      throw new Error(
        `Change (start: ${change.span.start}, length: ${change.span.length}) is out of range (length: ${text.length})`
      );
    }
    if (change.span.start + change.span.length > text.length) {
      throw new Error(
        `Change (start: ${change.span.start}, length: ${change.span.length}) is out of range (length: ${text.length})`
      );
    }

    originalIndexes.set(change, i);
  }

  const sorted = changes.slice().sort((a, b) => {
    if (a.span.start === b.span.start) {
      if (a.span.length === b.span.length) {
        return originalIndexes.get(b)! - originalIndexes.get(a)!;
      }
      return b.span.length - a.span.length;
    }
    return b.span.start - a.span.start;
  });

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const current = sorted[i]!;
    // case: inserts with the same start
    if (prev.span.length === 0 && current.span.start === prev.span.start) {
      continue;
    }

    if (current.span.start + current.span.length > prev.span.start) {
      throw new Error(
        `Overlapping changes detected: (start: ${current.span.start}, length: ${current.span.length}) and (start: ${prev.span.start}, length: ${prev.span.length})`
      );
    }
  }

  let res = text;

  for (let i = 0; i < sorted.length; i++) {
    const { span, newText } = sorted[i]!;
    res = `${res.slice(0, span.start)}${newText}${res.slice(
      span.start + span.length
    )}`;
  }

  return res;
}

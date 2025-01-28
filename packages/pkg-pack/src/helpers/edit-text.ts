export type TextSpan = {
  start: number;
  length: number;
};

export type TextChange = {
  span: TextSpan;
  newText: string;
};

export function editText(text: string, changes: TextChange[]) {
  if (changes.length === 0) return text;

  changes = changes.slice().sort((a, b) => b.span.start - a.span.start);

  let res = text;

  for (let i = 0; i < changes.length; i++) {
    const { span, newText } = changes[i]!;
    res = `${res.slice(0, span.start)}${newText}${res.slice(
      span.start + span.length
    )}`;
  }

  return res;
}

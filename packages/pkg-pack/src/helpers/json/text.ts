export type Indent =
  | {
      kind: "\t";
      count: number;
    }
  | {
      kind: " ";
      count: number;
    };

export type Eol = "\n" | "\r\n";

export type FileParams = {
  indent: Indent;
  eol: Eol;
};

export function indentToString(indent: Indent) {
  return indent.kind.repeat(indent.count);
}

export function inferFileParams(
  source: string,
  defaultParams: FileParams
): FileParams {
  return {
    indent: inferIndent(source) ?? defaultParams.indent,
    eol: inferEol(source) ?? defaultParams.eol,
  };
}

function inferIndent(source: string): Indent | null {
  const a = /^[\t ]/gm.exec(source);
  if (!a) return null;
  const lineStartIndex = a.index;
  const indents = ["\t", " "] as const;
  for (const kind of indents) {
    if (source[lineStartIndex] === kind) {
      let i = 1;
      while (source[lineStartIndex + i] === kind) {
        i += 1;
      }
      return {
        kind,
        count: i,
      };
    }
  }
  /* istanbul ignore next -- @preserve */
  throw new Error("Unreachable");
}

function inferEol(source: string): Eol | null {
  const index = source.indexOf("\n");
  if (index === -1) return null;
  if (source[index - 1] === "\r") {
    return "\r\n";
  }
  return "\n";
}

export function getLineIndentCount(
  source: string,
  index: number,
  fileParams: FileParams
): number {
  const { indent, eol } = fileParams;
  const lineStartIndex = getLineStart(source, index, eol);
  let i = 0;
  while (
    source.slice(
      lineStartIndex + i * indent.count,
      lineStartIndex + i * indent.count + indent.count
    ) === indent.kind.repeat(indent.count)
  ) {
    i += 1;
  }
  return i;
}

function getLineStart(source: string, index: number, eol: string) {
  const prevLineEndIndex = source.lastIndexOf(eol, index);
  return prevLineEndIndex + 1;
}

const lineStartRe = /^\s*$/;
export function isFirstInLine(source: string, index: number, eol: string) {
  const lineStartIndex = getLineStart(source, index, eol);
  return lineStartRe.test(source.slice(lineStartIndex, index));
}

// Based on https://github.com/unjs/mlly/blob/main/src/analyze.ts

const ESM_STATIC_IMPORT_RE =
  /(?<=\s|^|;|\})import\s*([\s"']*(?<imports>[\p{L}\p{M}\w\t\n\r $*,/{}@.]+)from\s*)?["']\s*(?<module>(?<="\s*)[^"]*[^\s"](?=\s*")|(?<='\s*)[^']*[^\s'](?=\s*'))\s*["'][\s;]*/dgmu;

const EXPORT_NAMED_RE =
  /\bexport\s*{(?<imports>[^}]+?)[\s,]*}(\s*from\s*["']\s*(?<module>(?<="\s*)[^"]*[^\s"](?=\s*")|(?<='\s*)[^']*[^\s'](?=\s*'))\s*["'][^\n;]*)?/dg;

const EXPORT_STAR_RE =
  /\bexport\s*(\*)(\s*as\s+(?<imports>[\w$]+)\s+)?\s*(\s*from\s*["']\s*(?<module>(?<="\s*)[^"]*[^\s"](?=\s*")|(?<='\s*)[^']*[^\s'](?=\s*'))\s*["'][^\n;]*)?/dg;

const DYNAMIC_IMPORT_RE =
  /import\s*\((?<expression>(?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\)/dg;

const REQUIRE_RE =
  /require\s*\((?<expression>(?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\)/dg;

const COMMENTS_RE = /\/\/.*|\/\*[\s\S]*?\*\//dgm;

function findComments(code: string) {
  return findPattern(COMMENTS_RE, code, { includeComments: true }).map(
    ({ range }) => range
  );
}

export type CodeRange = [startIncluded: number, endExcluded: number];

function findStaticImports(code: string) {
  return findPattern<"imports?" | "module">(ESM_STATIC_IMPORT_RE, code);
}

function findNamedExports(code: string) {
  return findPattern<"imports?" | "module">(EXPORT_NAMED_RE, code);
}

function findStarExports(code: string) {
  return findPattern<"imports?" | "module">(EXPORT_STAR_RE, code);
}

function findDynamicImports(code: string) {
  return findPattern<"expression">(DYNAMIC_IMPORT_RE, code);
}

function findRequires(code: string) {
  return findPattern<"expression">(REQUIRE_RE, code);
}

export type FileRef = {
  range: CodeRange;
};

export function findFileRefs(code: string): FileRef[] {
  return [
    ...[
      ...findStaticImports(code),
      ...findNamedExports(code),
      ...findStarExports(code),
    ].reduce((acc, { groups }) => {
      if (code.slice(groups.module[0], groups.module[1]).startsWith(".")) {
        acc.push(groups.module);
      }
      return acc;
    }, [] as CodeRange[]),
    ...[...findDynamicImports(code), ...findRequires(code)].reduce(
      (acc, { groups }) => {
        if (
          groups.expression &&
          code.slice(groups.expression[0], groups.expression[1]).match(/['"]./)
        ) {
          acc.push(groups.expression);
        }
        return acc;
      },
      [] as CodeRange[]
    ),
  ].map((range) => ({
    range,
  }));
}

export type ReplacePart = {
  range: CodeRange;
  content: string;
};

export function replaceParts(code: string, parts: ReplacePart[]) {
  parts = parts.slice().sort((a, b) => b.range[0] - a.range[0]);

  let res = code;

  for (let i = 0; i < parts.length; i++) {
    const { range, content } = parts[i]!;
    res = replaceRangeWith(res, range, content);
  }

  return res;
}

function replaceRangeWith(code: string, range: CodeRange, _with: string) {
  return `${code.slice(0, range[0])}${_with}${code.slice(range[1])}`;
}

function isInside(point: number, range: CodeRange) {
  return range[0] < point && point < range[1];
}

type GroupsType<T extends string> = {
  [P in T as P extends `${string}?` ? never : P]: CodeRange;
} & {
  [P in T as P extends `${string}?` ? P : never]?: CodeRange;
};

export function findPattern<T extends string = never>(
  regex: RegExp,
  code: string,
  options?: {
    includeComments?: boolean;
  }
): {
  range: CodeRange;
  groups: GroupsType<T>;
}[] {
  const comments = !options?.includeComments ? findComments(code) : null;

  const matches: {
    range: CodeRange;
    groups: GroupsType<T>;
  }[] = [];

  const regExp = new RegExp(
    regex.source,
    regex.flags.replace("g", "").replace("d", "") + "dg"
  );

  for (const match of code.matchAll(regExp)) {
    const range: CodeRange = match.indices![0]!;
    if (
      comments?.some(
        (comment) => isInside(range[0], comment) || isInside(range[1], comment)
      )
    ) {
      continue;
    }
    matches.push({
      range,
      groups: match.indices!.groups as GroupsType<T>,
    });
  }

  return matches;
}

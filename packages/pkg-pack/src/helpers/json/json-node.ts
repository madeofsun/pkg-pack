import ts from "typescript";

type TextSpan = {
  start: number;
  length: number;
};

export type JsonNode = JsonObjectNode | JsonArrayNode | JsonPrimitiveNode;

type JsonNodeParent = JsonObjectNode | JsonArrayNode;

interface BaseJsonNode {
  parent: null | JsonNodeParent;
  readonly span: TextSpan;
}
interface JsonPrimitiveNode extends BaseJsonNode {
  readonly kind: "primitive";
  readonly value: string | number | boolean | null;
}
interface JsonArrayNode extends BaseJsonNode {
  readonly kind: "array";
  readonly value: readonly JsonNode[];
}
interface ObjectProperty {
  readonly span: TextSpan;
  readonly name: string;
  readonly value: JsonNode;
}
interface JsonObjectNode extends BaseJsonNode {
  readonly kind: "object";
  readonly value: readonly ObjectProperty[];
}

export function getMeta(source: string): JsonNode {
  const prefix = "export default\n";
  const wrappedJson = `${prefix}${source}\n;`;
  const sourceFile = ts.createSourceFile(
    "temp.ts",
    wrappedJson,
    ts.ScriptTarget.Latest,
    undefined,
    ts.ScriptKind.TS
  );
  /* istanbul ignore if -- @preserve */
  if (
    !sourceFile.statements[0] ||
    !ts.isExportAssignment(sourceFile.statements[0])
  ) {
    throw new Error();
  }
  const res = visit(sourceFile.statements[0].expression, {
    getSpan(node) {
      return {
        start: node.getStart(sourceFile) - prefix.length,
        length: node.getWidth(sourceFile),
      };
    },
  });
  setParents(res);
  return res;
}

interface VisitContext {
  getSpan(node: ts.Node): TextSpan;
}

function setParents(node: JsonNode) {
  if (node.kind === "array") {
    for (const n of node.value) {
      // @ts-expect-error
      n.parent = n;
      setParents(n);
    }
  }
  if (node.kind === "object") {
    for (const n of node.value) {
      // @ts-expect-error
      n.parent = n;
      setParents(n.value);
    }
  }
}

function visit(node: ts.Node, ctx: VisitContext): JsonNode {
  const span = ctx.getSpan(node);
  if (ts.isObjectLiteralExpression(node)) {
    return {
      parent: null,
      span,
      kind: "object",
      value: node.properties.map((prop) => {
        /* istanbul ignore if -- @preserve */
        if (!ts.isPropertyAssignment(prop) || !ts.isStringLiteral(prop.name)) {
          throw new Error("Unexpected property syntax");
        }
        return {
          span: ctx.getSpan(prop),
          name: prop.name.text,
          value: visit(prop.initializer, ctx),
        };
      }),
    };
  } else if (ts.isArrayLiteralExpression(node)) {
    return {
      parent: null,
      span,
      kind: "array",
      value: node.elements.map((el) => visit(el, ctx)),
    };
  } else if (ts.isStringLiteral(node)) {
    return {
      parent: null,
      span,
      kind: "primitive",
      value: node.text,
    };
  } else if (ts.isNumericLiteral(node)) {
    return {
      parent: null,
      span,
      kind: "primitive",
      value: Number(node.text),
    };
  } else if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return {
      parent: null,
      span,
      kind: "primitive",
      value: true,
    };
  } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return {
      parent: null,
      span,
      kind: "primitive",
      value: false,
    };
  } else if (node.kind === ts.SyntaxKind.NullKeyword) {
    return {
      parent: null,
      span,
      kind: "primitive",
      value: null,
    };
  }
  throw new Error("Unexpected syntax");
}

export function findPath(
  meta: JsonNode,
  path: (string | number)[],
  pathIndex: number = 0
): JsonNode | null {
  const current = path[pathIndex] as string & number;
  if (!current) {
    return meta;
  }
  if (meta.kind === "object") {
    const child = meta.value.find((prop) => prop.name === current);
    if (!child) {
      return null;
    }
    return findPath(child.value, path, pathIndex + 1);
  }
  if (meta.kind === "array") {
    const child = meta.value[current];
    if (!child) {
      return null;
    }
    return findPath(child, path, pathIndex + 1);
  }
  meta.kind satisfies "primitive";
  return null;
}

import { editText, type TextSpan } from "../edit-text";
import { findPath, getMeta, type JsonNode } from "./json-node";
import {
  getLineIndentCount,
  indentToString,
  inferFileParams,
  isFirstInLine,
  type FileParams,
} from "./text";

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = readonly JsonValue[];
export type JsonObject = {
  readonly [P in string]?: JsonValue;
};

export type JsonOp =
  | JsonSetOp
  | JsonArrayRemoveOp
  | JsonArrayPrependOp
  | JsonArrayAppendOp
  | JsonObjectRemoveOp
  | JsonObjectPrependOp
  | JsonObjectAppendOp;
export type JsonSetOp = {
  kind: "set";
  path: (string | number)[];
  value: JsonValue;
};
export type JsonArrayRemoveOp = {
  kind: "arrayRemove";
  path: (string | number)[];
  index: number;
};
export type JsonArrayPrependOp = {
  kind: "arrayPrepend";
  path: (string | number)[];
  beforeIndex?: number;
  value: JsonArray;
};
export type JsonArrayAppendOp = {
  kind: "arrayAppend";
  path: (string | number)[];
  afterIndex?: number;
  value: JsonArray;
};
export type JsonObjectRemoveOp = {
  kind: "objectRemove";
  path: (string | number)[];
  prop: string;
};
export type JsonObjectPrependOp = {
  kind: "objectPrepend";
  path: (string | number)[];
  beforeProp?: string;
  value: JsonObject;
};
export type JsonObjectAppendOp = {
  kind: "objectAppend";
  path: (string | number)[];
  afterProp?: string;
  value: JsonObject;
};

export function editJson(source: string, ops: JsonOp[]) {
  const meta = getMeta(source);
  const fileParams = inferFileParams(source, {
    indent: { kind: " ", count: 2 },
    eol: "\n",
  });
  const changes = ops
    .map((op) => {
      const { path } = op;
      const found = findPath(meta, path);
      if (found === null) {
        throw new Error(`Path "${path.join(".")}" is not found.`);
      }
      if (op.kind === "set") {
        return set(found.span, op.value, source, fileParams);
      }
      if (op.kind === "arrayRemove") {
        if (found.kind !== "array") {
          throw OpCannotBeApplied(op, path, found);
        }
        const el = getAtIndex(op.index, found, path);
        if (found.value.length === 1) {
          return set(found.span, [], source, fileParams);
        }
        return remove(
          el.index,
          found.value.map(({ span }) => span)
        );
      }
      if (op.kind === "arrayPrepend") {
        if (found.kind !== "array") {
          throw OpCannotBeApplied(op, path, found);
        }
        if (op.value.length === 0) {
          return;
        }
        let elSpan: TextSpan | undefined;
        if (op.beforeIndex !== undefined) {
          const el = getAtIndex(op.beforeIndex, found, path);
          elSpan = el.node.span;
        } else {
          elSpan = found.value[0]?.span;
        }
        return prepend(found.span, elSpan, op.value, source, fileParams);
      }
      if (op.kind === "arrayAppend") {
        if (found.kind !== "array") {
          throw OpCannotBeApplied(op, path, found);
        }
        if (op.value.length === 0) {
          return;
        }
        let elSpan: TextSpan | undefined;
        if (op.afterIndex !== undefined) {
          const el = getAtIndex(op.afterIndex, found, path);
          elSpan = el.node.span;
        } else {
          elSpan = found.value[found.value.length - 1]?.span;
        }
        return append(found.span, elSpan, op.value, source, fileParams);
      }
      if (op.kind === "objectRemove") {
        if (found.kind !== "object") {
          throw OpCannotBeApplied(op, path, found);
        }
        const prop = getAtProperty(op.prop, found, path);
        if (found.value.length === 1) {
          return set(found.span, {}, source, fileParams);
        }
        return remove(
          prop.index,
          found.value.map(({ span }) => span)
        );
      }
      if (op.kind === "objectPrepend") {
        if (found.kind !== "object") {
          throw OpCannotBeApplied(op, path, found);
        }
        if (Object.keys(op.value).length === 0) {
          return;
        }
        let elSpan: TextSpan | undefined;
        if (op.beforeProp !== undefined) {
          const { node } = getAtProperty(op.beforeProp, found, path);
          elSpan = node.span;
        } else {
          const objProp = found.value[0];
          elSpan = objProp?.span;
        }
        return prepend(found.span, elSpan, op.value, source, fileParams);
      }
      if (op.kind === "objectAppend") {
        if (found.kind !== "object") {
          throw OpCannotBeApplied(op, path, found);
        }
        if (Object.keys(op.value).length === 0) {
          return;
        }
        let elSpan: TextSpan | undefined;
        if (op.afterProp !== undefined) {
          const { node } = getAtProperty(op.afterProp, found, path);
          elSpan = node.span;
        } else {
          elSpan = found.value[found.value.length - 1]?.span;
        }
        return append(found.span, elSpan, op.value, source, fileParams);
      }
      op satisfies never;
      throw new Error("Unknown op");
    })
    .filter(<V>(v: V): v is Exclude<V, undefined> => !!v);
  try {
    return editText(source, changes);
  } catch (error) {
    throw new Error(
      "Could not edit text. Check that operations does not conflict.",
      { cause: error }
    );
  }
}

function OpCannotBeApplied(
  op: JsonOp,
  path: (string | number)[],
  node: JsonNode
) {
  return new Error(
    `Operation "${op.kind}" cannot be applied to "${node.kind}" ("${path.join(
      "."
    )}")`
  );
}

function getAtIndex(
  index: number,
  found: JsonNode & { kind: "array" },
  path: (string | number)[]
) {
  const node = found.value[index];
  if (!node) {
    throw new Error(
      `Array at "${path.join(".")}" does not have element at index "${index}"`
    );
  }
  return {
    index,
    node,
  };
}

function getAtProperty(
  prop: string,
  found: JsonNode & { kind: "object" },
  path: (string | number)[]
) {
  const index = found.value.findIndex(({ name }) => name === prop);
  const node = found.value[index];
  if (!node) {
    throw new Error(
      `Object at "${path.join(".")}" does not have property "${prop}"`
    );
  }
  return {
    index,
    node,
  };
}

function set(
  span: TextSpan,
  value: JsonValue,
  source: string,
  fileParams: FileParams
) {
  const indentCount = getLineIndentCount(source, span.start, fileParams);
  return {
    span,
    newText: toJsonIndented(value, fileParams, indentCount, false),
  };
}

function remove(elIndex: number, elSpans: TextSpan[]) {
  const elSpan = elSpans[elIndex]!;
  if (elIndex === 0) {
    const nextElSpan = elSpans[1]!;
    return {
      span: {
        start: elSpan.start,
        length: nextElSpan.start - elSpan.start,
      },
      newText: "",
    };
  }
  const prevElSpan = elSpans[elIndex - 1]!;
  const start = prevElSpan.start + prevElSpan.length;
  const end = elSpan.start + elSpan.length;
  return {
    span: {
      start,
      length: end - start,
    },
    newText: "",
  };
}

function prepend(
  parentSpan: TextSpan,
  elSpan: TextSpan | undefined,
  value: JsonValue,
  source: string,
  fileParams: FileParams
) {
  if (!elSpan) {
    return set(parentSpan, value, source, fileParams);
  }
  const indentCount = getLineIndentCount(source, parentSpan.start, fileParams);
  if (isFirstInLine(source, elSpan.start, fileParams.eol)) {
    const valueText = toJsonIndented(value, fileParams, indentCount, true);
    const after = indentToString(fileParams.indent).repeat(indentCount + 1);
    return {
      span: { start: elSpan.start, length: 0 },
      newText: `${valueText},${fileParams.eol}${after}`,
    };
  }
  return {
    span: { start: elSpan.start, length: 0 },
    newText: `${toJsonInlineContentOnly(value)}, `,
  };
}

function append(
  parentSpan: TextSpan,
  elSpan: TextSpan | undefined,
  value: JsonValue,
  source: string,
  fileParams: FileParams
) {
  if (!elSpan) {
    return set(parentSpan, value, source, fileParams);
  }
  const indentCount = getLineIndentCount(source, parentSpan.start, fileParams);
  if (isFirstInLine(source, elSpan.start, fileParams.eol)) {
    const valueText = toJsonIndented(value, fileParams, indentCount, true);
    const before = indentToString(fileParams.indent).repeat(indentCount + 1);
    return {
      span: { start: elSpan.start + elSpan.length, length: 0 },
      newText: `,${fileParams.eol}${before}${valueText}`,
    };
  }
  return {
    span: { start: elSpan.start + elSpan.length, length: 0 },
    newText: `, ${toJsonInlineContentOnly(value)}`,
  };
}

function toJsonIndented(
  value: JsonValue,
  fileParams: FileParams,
  indentCount: number,
  contentOnly?: boolean
) {
  const { indent, eol } = fileParams;

  const indentText = indentToString(indent);

  let text = JSON.stringify(value, undefined, 2);

  if (contentOnly && (text.startsWith("{") || text.startsWith("["))) {
    text = text.slice(2 + 2, -2);
  }

  text = text.replace(/^(  )+/gm, (match) =>
    indentText.repeat(match.length / 2)
  );

  const linePrefix = indentText.repeat(indentCount);
  text = text.replace(/^/gm, linePrefix).slice(linePrefix.length);

  if (eol !== "\n") {
    text = text.replace(/\n/g, eol);
  }

  return text;
}

// TODO?: remove indent only on the top level
function toJsonInlineContentOnly(value: JsonValue) {
  return JSON.stringify(value, undefined, 2)
    .replace(/\n\r?(  )+/gm, " ")
    .slice(2, -2);
}

import ts from "typescript";

export type ModuleRef = {
  specifier: string;
  span: ts.TextSpan;
  stringLiteral: ts.StringLiteral;
} & (
  | {
      kind: "import-static";
      container: ts.ImportDeclaration;
    }
  | {
      kind: "import-dynamic";
      container: ts.CallExpression;
    }
  | {
      kind: "export";
      container: ts.ExportDeclaration;
    }
  | {
      kind: "require-static";
      container: ts.ImportEqualsDeclaration;
    }
);

export function findModuleRefs(sourceFile: ts.SourceFile): ModuleRef[] {
  const refs: ModuleRef[] = [];

  const visitor: ts.Visitor = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      refs.push({
        kind: "import-static",
        container: node,
        ...getStringLiteralProps(node.moduleSpecifier, sourceFile),
      });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      refs.push({
        kind: "export",
        container: node,
        ...getStringLiteralProps(node.moduleSpecifier, sourceFile),
      });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      // for static require ImportEqualsDeclaration should not be used
      // || (ts.isIdentifier(node.expression) &&
      //     node.expression.escapedText === "require"))
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      refs.push({
        kind: "import-dynamic",
        container: node,
        ...getStringLiteralProps(node.arguments[0], sourceFile),
      });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      refs.push({
        kind: "require-static",
        container: node,
        ...getStringLiteralProps(node.moduleReference.expression, sourceFile),
      });
    }
    return ts.forEachChild(node, visitor);
  };

  visitor(sourceFile);

  return refs;
}

const getStringLiteralProps = (
  node: ts.StringLiteral,
  sourceFile: ts.SourceFile
) => {
  return {
    stringLiteral: node,
    specifier: node.text,
    span: {
      start: node.getStart(sourceFile) + 1,
      length: node.text.length,
    },
  };
};

export type MemberExpression = {
  span: ts.TextSpan;
  expression: string;
  container: ts.Node;
};

export function findMemberExpressions(
  sourceFile: ts.SourceFile,
  members: string[]
) {
  const found: MemberExpression[] = [];

  const visitor: ts.Visitor = (node) => {
    const propChain = getMemberList(node);
    if (propChain && isEqualPath(propChain, members)) {
      found.push({
        span: {
          start: node.getStart(sourceFile),
          length: node.getWidth(sourceFile),
        },
        expression: node.getText(sourceFile),
        container: node,
      });
      return undefined;
    }
    return ts.forEachChild(node, visitor);
  };

  visitor(sourceFile);

  return found;
}

function getMemberList(node: ts.Node): null | string[] {
  if (ts.isNonNullExpression(node)) {
    node = node.expression;
  }

  if (ts.isIdentifier(node)) {
    return [node.getText()];
  } else if (ts.isPropertyAccessExpression(node)) {
    return [...(getMemberList(node.expression) ?? []), node.name.getText()];
  } else if (ts.isElementAccessExpression(node)) {
    if (
      ts.isStringLiteral(node.argumentExpression) ||
      ts.isNumericLiteral(node.argumentExpression) ||
      ts.isBigIntLiteral(node.argumentExpression)
    ) {
      return [
        ...(getMemberList(node.expression) ?? []),
        node.argumentExpression.text,
      ];
    } else if (
      node.argumentExpression.kind === ts.SyntaxKind.TrueKeyword ||
      node.argumentExpression.kind === ts.SyntaxKind.FalseKeyword
    ) {
      return [
        ...(getMemberList(node.expression) ?? []),
        node.argumentExpression.kind === ts.SyntaxKind.TrueKeyword
          ? "true"
          : "false",
      ];
    }
    return null;
  } else if (ts.isMetaProperty(node)) {
    return ["import", "meta"];
  }

  return null;
}

function isEqualPath(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const length = a.length;
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function getNextName(
  name: string,
  typeChecker: ts.TypeChecker,
  location: ts.Node,
  symbolFlags: ts.SymbolFlags,
  excludeGlobals: boolean
): string {
  let suffix = 1;
  while (
    typeChecker.resolveName(
      `${name}_${suffix}`,
      location,
      symbolFlags,
      excludeGlobals
    )
  ) {
    suffix += 1;
  }
  return `${name}_${suffix}`;
}

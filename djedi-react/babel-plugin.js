const dedent = require("dedent");

const MODULE_NAME = "djedi-react";
const CLIENT_NAME = "djedi";
const CLIENT_METHOD_NAME = "reportPrefetchableNode";
const COMPONENT_NAME = "Node";
const URI_ATTR_NAME = "uri";
const TEMPLATE_TAG_NAME = "md";
const NODE_URI_KEY = "uri";
const NODE_VALUE_KEY = "value";
const URI_VAR_NAME = "djedi_uri";
const DEFAULT_VAR_NAME = "djedi_default";

module.exports = function djediBabelPlugin({ types: t }) {
  return {
    name: MODULE_NAME,
    pre() {
      this.clientId = undefined;
      this.last = undefined;
    },
    post() {
      this.clientId = undefined;
      this.last = undefined;
    },
    visitor: {
      JSXElement(path) {
        if (path.node.openingElement.name.name !== COMPONENT_NAME) {
          return;
        }

        const uriAttr = getUriAttr(path, t);

        if (uriAttr == null) {
          return;
        }

        const uri = getUri(uriAttr.node.value, t);

        if (uri == null) {
          return;
        }

        const child = maybeGetLoneChild(path, t);

        if (child === false) {
          return;
        }

        const program = path.scope.getProgramParent();

        if (this.clientId == null) {
          this.clientId = program.generateUidIdentifier(CLIENT_NAME);
          [this.last] = program.path.unshiftContainer(
            "body",
            makeClientImport(this.clientId, t)
          );
        }

        const uriId = path.scope.generateUidIdentifier(URI_VAR_NAME);
        program.push({ id: uriId, init: t.stringLiteral(uri) });
        uriAttr.get("value").replaceWith(t.jSXExpressionContainer(uriId));

        let defaultId = undefined;
        const defaultValue =
          child == null ? undefined : getDefaultValue(child.node, t);

        if (defaultValue != null) {
          defaultId = path.scope.generateUidIdentifier(DEFAULT_VAR_NAME);
          program.push({
            id: defaultId,
            init: t.stringLiteral(dedent(defaultValue)),
          });
          child.replaceWith(t.jSXExpressionContainer(defaultId));
          for (const otherChild of path.get("children")) {
            if (otherChild !== child) {
              otherChild.remove();
            }
          }
        }

        [this.last] = this.last.insertAfter(
          makeReportCall(this.clientId, uriId, defaultId, t)
        );
      },
    },
  };
};

function getUriAttr(jsxElementPath, t) {
  const attrs = jsxElementPath.get("openingElement.attributes").reverse();

  for (const attr of attrs) {
    if (t.isJSXIdentifier(attr.node.name, { name: URI_ATTR_NAME })) {
      return attr;
    }
  }

  return undefined;
}

function getUri(value, t) {
  if (t.isStringLiteral(value)) {
    return value.value;
  }

  if (t.isJSXExpressionContainer(value)) {
    if (t.isStringLiteral(value.expression)) {
      return value.expression.value;
    }

    if (
      t.isTemplateLiteral(value.expression) &&
      value.expression.expressions.length === 0 &&
      value.expression.quasis.length === 1
    ) {
      return value.expression.quasis[0].value.cooked;
    }

    return undefined;
  }

  return undefined;
}

function maybeGetLoneChild(jsxElementPath, t) {
  const children = jsxElementPath.get("children");
  let result = undefined;

  for (const child of children) {
    // There can be whitespace-only JSXText nodes around an
    // JSXExpressionContainer. Ignore those, just like Babel does.
    if (!isEmptyJSXText(child.node, t)) {
      if (result != null) {
        return false;
      }
      result = child;
    }
  }

  return result;
}

function isEmptyJSXText(node, t) {
  return t.isJSXText(node) && node.value.trim() === "";
}

function getDefaultValue(value, t) {
  if (t.isJSXText(value)) {
    return value.value;
  }

  if (t.isJSXExpressionContainer(value)) {
    if (t.isStringLiteral(value.expression)) {
      return value.expression.value;
    }

    const templateLiteral = t.isTemplateLiteral(value.expression)
      ? value.expression
      : t.isTaggedTemplateExpression(value.expression) &&
        t.isIdentifier(value.expression.tag, { name: TEMPLATE_TAG_NAME })
        ? value.expression.quasi
        : undefined;

    if (
      templateLiteral != null &&
      templateLiteral.expressions.length === 0 &&
      templateLiteral.quasis.length === 1
    ) {
      return templateLiteral.quasis[0].value.cooked;
    }

    return undefined;
  }

  return undefined;
}

function makeClientImport(clientId, t) {
  return t.importDeclaration(
    [t.importSpecifier(clientId, t.identifier(CLIENT_NAME))],
    t.stringLiteral(MODULE_NAME)
  );
}

function makeReportCall(clientId, uriId, defaultId, t) {
  return t.expressionStatement(
    t.callExpression(
      t.memberExpression(clientId, t.identifier(CLIENT_METHOD_NAME)),
      [
        t.objectExpression([
          t.objectProperty(t.identifier(NODE_URI_KEY), uriId),
          t.objectProperty(
            t.identifier(NODE_VALUE_KEY),
            defaultId == null ? t.identifier("undefined") : defaultId
          ),
        ]),
      ]
    )
  );
}

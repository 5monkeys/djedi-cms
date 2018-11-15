const dedent = require("dedent-js");

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
        // Bail if the element isn't a node.
        if (path.node.openingElement.name.name !== COMPONENT_NAME) {
          return;
        }

        const uriAttr = getUriAttr(path, t);

        // Bail if the uri prop is missing.
        if (uriAttr == null) {
          return;
        }

        const uri = getUri(uriAttr.node.value, t);

        // Bail if the uri prop isn't a static string.
        if (uri == null) {
          return;
        }

        const child = maybeGetLoneChild(path, t);
        const defaultValue =
          child == null ? undefined : getDefaultValue(child, t);

        // Bail if there is a child but it isn't a static string.
        if (child != null && defaultValue == null) {
          return;
        }

        const program = path.scope.getProgramParent();

        // Add import for djedi (the first time).
        if (this.clientId == null) {
          this.clientId = program.generateUidIdentifier(CLIENT_NAME);
          [this.last] = program.path.unshiftContainer(
            "body",
            makeClientImport(this.clientId, t)
          );
        }

        // Move the uri into a variable.
        const uriId = path.scope.generateUidIdentifier(URI_VAR_NAME);
        program.push({ id: uriId, init: t.stringLiteral(uri) });
        uriAttr.get("value").replaceWith(t.jSXExpressionContainer(uriId));

        let defaultId = undefined;

        // Move the default value into a variable (if any).
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

        // Insert a `reportPrefetchableNode` call.
        [this.last] = this.last.insertAfter(
          makeReportCall(this.clientId, uriId, defaultId, t)
        );
      },
    },
  };
};

function getUriAttr(jsxElementPath, t) {
  const attrs = jsxElementPath.get("openingElement.attributes");
  let result = undefined;

  for (const attr of attrs) {
    if (t.isJSXIdentifier(attr.node.name, { name: URI_ATTR_NAME })) {
      if (result != null) {
        throw attr.buildCodeFrameError(
          `<${COMPONENT_NAME}> must only specify the \`${URI_ATTR_NAME}\` prop once.`
        );
      }
      result = attr;
    } else if (t.isJSXIdentifier(attr.node.name, { name: "children" })) {
      throw attr.buildCodeFrameError(
        `<${COMPONENT_NAME}> must not have \`children\` as a prop.`
      );
    }
  }

  return result;
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
    // Also ignore `{/* comments */}`.
    if (!(isEmptyJSXText(child.node, t) || isJSXComment(child.node, t))) {
      if (t.isJSXElement(child.node)) {
        throw child.buildCodeFrameError(
          `<${COMPONENT_NAME}> only takes a single string as children. Wrap the default value in the \`md\` template tag to include HTML.`
        );
      }

      if (result != null) {
        throw child.buildCodeFrameError(
          `<${COMPONENT_NAME}> only takes a single string as children. Did you mean to use \`[foo]\` instead of \`{foo}\`?`
        );
      }
      result = child;
    }
  }

  return result;
}

function isEmptyJSXText(node, t) {
  return t.isJSXText(node) && node.value.trim() === "";
}

function isJSXComment(node, t) {
  return (
    t.isJSXExpressionContainer(node) &&
    t.isJSXEmptyExpression(node.expression) &&
    node.expression.innerComments != null &&
    node.expression.innerComments.length > 0
  );
}

function getDefaultValue(valuePath, t) {
  if (t.isJSXText(valuePath.node)) {
    return valuePath.node.value;
  }

  if (t.isJSXExpressionContainer(valuePath.node)) {
    if (t.isStringLiteral(valuePath.node.expression)) {
      return valuePath.node.expression.value;
    }

    const templateLiteral = t.isTemplateLiteral(valuePath.node.expression)
      ? valuePath.get("expression")
      : t.isTaggedTemplateExpression(valuePath.node.expression) &&
        t.isIdentifier(valuePath.node.expression.tag, {
          name: TEMPLATE_TAG_NAME,
        })
      ? valuePath.get("expression.quasi")
      : undefined;

    if (templateLiteral != null) {
      const expressions = templateLiteral.get("expressions");
      if (expressions.length > 0) {
        throw expressions[0].buildCodeFrameError(
          `Using \`\${foo}\` in a <${COMPONENT_NAME}> default value is an anti-pattern: it won't work if the user edits the node. Did you mean to use \`{foo}\` (without the \`$\`) or \`[foo]\`?`
        );
      }
      return templateLiteral.node.quasis[0].value.cooked;
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

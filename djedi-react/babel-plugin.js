const dedent = require("dedent");

module.exports = function djediBabelPlugin(babel) {
  const { types: t } = babel;
  return {
    name: "djedi",
    pre() {
      this.djedi = undefined;
      this.last = undefined;
    },
    post() {
      this.djedi = undefined;
      this.last = undefined;
    },
    visitor: {
      JSXElement(path) {
        if (
          path.node.openingElement.name.name !== "Node" ||
          path.node.children.length > 1
        ) {
          return;
        }

        const attrs = path.get("openingElement.attributes").reverse();
        let attr = undefined;

        for (const attrPath of attrs) {
          if (t.isJSXIdentifier(attrPath.node.name, { name: "uri" })) {
            attr = attrPath;
            break;
          }
        }

        if (attr == null) {
          return;
        }

        const uri = getStringUri(attr.node.value, t);

        if (uri == null) {
          return;
        }

        const program = path.scope.getProgramParent();

        if (this.djedi == null) {
          this.djedi = program.generateUidIdentifier("djedi");
          [this.last] = program.path.unshiftContainer(
            "body",
            t.importDeclaration(
              [t.importSpecifier(this.djedi, t.identifier("djedi"))],
              t.stringLiteral("djedi-react")
            )
          );
        }

        const uriId = path.scope.generateUidIdentifier("djedi_uri");
        program.push({
          id: uriId,
          init: t.stringLiteral(uri),
        });
        attr.get("value").replaceWith(t.jSXExpressionContainer(uriId));

        let defId = undefined;
        const child = path.get("children.0");
        const defaultValue =
          child == null ? undefined : getStringDefaultValue(child.node, t);

        if (defaultValue != null) {
          defId = path.scope.generateUidIdentifier("djedi_default");
          program.push({
            id: defId,
            init: t.stringLiteral(dedent(defaultValue)),
          });
          child.replaceWith(t.jSXExpressionContainer(defId));
        }

        [this.last] = this.last.insertAfter(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                this.djedi,
                t.identifier("reportPrefetchableNode")
              ),
              [
                t.objectExpression([
                  t.objectProperty(t.identifier("uri"), uriId),
                  t.objectProperty(
                    t.identifier("value"),
                    defId == null ? t.identifier("undefined") : defId
                  ),
                ]),
              ]
            )
          )
        );
      },
    },
  };
};

function getStringUri(value, t) {
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

function getStringDefaultValue(value, t) {
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
        t.isIdentifier(value.expression.tag, { name: "md" })
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

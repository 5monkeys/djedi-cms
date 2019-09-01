import * as babel from "@babel/core";
import jsx from "@babel/plugin-syntax-jsx";
import checkDuplicatedNodes from "babel-check-duplicated-nodes";
import dedent from "dedent-js";
import fs from "fs";

import babelPlugin from "../babel-plugin";

// Make snapshots easier to read.
// Before: `"console.log(\\"Hello!\\")"`
// After: `console.log("Hello!")`
expect.addSnapshotSerializer({
  print(value) {
    return value;
  },
  test(value) {
    return typeof value === "string";
  },
});

function transform(code) {
  return babel.transform(code, {
    plugins: [jsx, babelPlugin],
    highlightCode: false,
  }).code;
}

function transformToAST(code) {
  return babel.transform(code, {
    plugins: [jsx, babelPlugin],
    ast: true,
    code: false,
  }).ast;
}

test("it works", () => {
  // The fixture is pretty long, so it makes sense not using an inline snapshot.
  const code = fs.readFileSync(require.resolve("./fixtures/nodes.js"), "utf8");
  expect(transform(code)).toMatchSnapshot();
});

test("it does not affect files with no <Node>s", () => {
  const code = dedent`
    console.log('<Node uri="uri">value</Node>');
  `;
  expect(transform(code)).toMatchInlineSnapshot(
    `console.log('<Node uri="uri">value</Node>');`
  );
});

// Comments at the start and end are currently supported, but not comments
// _between_ two JSXText nodes.
test("comments", () => {
  const code = dedent`
    <Node uri="uri">
      {/* comment */}
      value
      {
        // comment
        // comment
      }
    </Node>
  `;
  expect(transform(code)).toMatchInlineSnapshot(`
var _djedi_uri = "uri",
    _djedi_default = "value";
import { djedi as _djedi } from "djedi-react";

_djedi.reportPrefetchableNode({
  uri: _djedi_uri,
  value: _djedi_default
});

<Node uri={_djedi_uri}>{_djedi_default}</Node>;
`);
});

test("ensure no duplicated AST nodes are found", () => {
  const code = dedent`
    <>
      <Node uri="uri1">value1</Node>
      <Node uri="uri2">value2</Node>
    </>
  `;
  expect(() => checkDuplicatedNodes(babel, transformToAST(code))).not.toThrow(
    Error
  );
});

describe("it throws helpful errors", () => {
  test("duplicate uri prop", () => {
    expect(() => transform('<Node uri="overwritten uri" uri />'))
      .toThrowErrorMatchingInlineSnapshot(`
undefined: <Node> must only specify the \`uri\` prop once.
> 1 | <Node uri="overwritten uri" uri />
    |                             ^
`);
  });

  test("children prop", () => {
    expect(() =>
      transform('<Node uri="uri" children="children prop not supported" />')
    ).toThrowErrorMatchingInlineSnapshot(`
undefined: <Node> must not have \`children\` as a prop.
> 1 | <Node uri="uri" children="children prop not supported" />
    |                 ^
`);
  });

  test("jsx interpolation", () => {
    expect(() => transform('<Node uri="uri">JSX interpolation {nope}</Node>'))
      .toThrowErrorMatchingInlineSnapshot(`
undefined: <Node> only takes a single string as children. Did you mean to use \`[foo]\` instead of \`{foo}\`?
> 1 | <Node uri="uri">JSX interpolation {nope}</Node>
    |                                   ^
`);
  });

  test("empty jsx interpolation", () => {
    expect(() => transform('<Node uri="uri">empty {}</Node>'))
      .toThrowErrorMatchingInlineSnapshot(`
undefined: <Node> only takes a single string as children. Did you mean to use \`[foo]\` instead of \`{foo}\`?
> 1 | <Node uri="uri">empty {}</Node>
    |                       ^
`);
  });

  test("template literal interpolation", () => {
    expect(() =>
      transform(
        // eslint-disable-next-line no-template-curly-in-string
        '<Node uri="uri">{`template literal with interpolation ${nope}`}</Node>'
      )
    ).toThrowErrorMatchingInlineSnapshot(`
undefined: Using \`\${foo}\` in a <Node> default value is an anti-pattern: it won't work if the user edits the node. Did you mean to use \`{foo}\` (without the \`$\`) or \`[foo]\`?
> 1 | <Node uri="uri">{\`template literal with interpolation \${nope}\`}</Node>
    |                                                         ^
`);
  });

  test("md template literal interpolation", () => {
    expect(() =>
      transform(
        // eslint-disable-next-line no-template-curly-in-string
        '<Node uri="uri">{md`template literal with interpolation ${nope}`}</Node>'
      )
    ).toThrowErrorMatchingInlineSnapshot(`
undefined: Using \`\${foo}\` in a <Node> default value is an anti-pattern: it won't work if the user edits the node. Did you mean to use \`{foo}\` (without the \`$\`) or \`[foo]\`?
> 1 | <Node uri="uri">{md\`template literal with interpolation \${nope}\`}</Node>
    |                                                           ^
`);
  });

  test("accidental JSX children", () => {
    expect(() => transform('<Node uri="uri">A <em>mistake</em></Node>'))
      .toThrowErrorMatchingInlineSnapshot(`
undefined: <Node> only takes a single string as children. Wrap the default value in the \`md\` template tag to include HTML.
> 1 | <Node uri="uri">A <em>mistake</em></Node>
    |                   ^
`);
  });

  test("single JSX child", () => {
    expect(() => transform('<Node uri="uri"><em>mistake</em></Node>'))
      .toThrowErrorMatchingInlineSnapshot(`
undefined: <Node> only takes a single string as children. Wrap the default value in the \`md\` template tag to include HTML.
> 1 | <Node uri="uri"><em>mistake</em></Node>
    |                 ^
`);
  });
});

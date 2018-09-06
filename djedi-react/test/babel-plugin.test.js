import fs from "fs";

import * as babel from "@babel/core";
import dedent from "dedent-js";
import jsx from "@babel/plugin-syntax-jsx";

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
undefined: <Node> only takes a single child. Did you mean to use \`[foo]\` instead of \`{foo}\`?
> 1 | <Node uri="uri">JSX interpolation {nope}</Node>
    |                                   ^
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
});

import fs from "fs";

import * as babel from "@babel/core";
import dedent from "dedent";
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
  const code = fs.readFileSync(require.resolve("./fixtures/nodes.js"), "utf8");
  expect(transform(code)).toMatchSnapshot();
});

test("it does not affect files with no <Node>s", () => {
  const code = dedent`
    console.log('<Node uri="uri">value</Node>');
  `;
  expect(transform(code)).toMatchSnapshot();
});

test("it throws helpful errors", () => {
  /* eslint-disable no-template-curly-in-string */
  const cases = {
    "duplicate uri prop": '<Node uri="overwritten uri" uri />',
    "children prop":
      '<Node uri="uri" children="children prop not supported" />',
    "jsx interpolation": '<Node uri="uri">JSX interpolation {nope}</Node>',
    "template literal interpolation":
      '<Node uri="uri">{`template literal with interpolation ${nope}`}</Node>',
    "md template literal interpolation":
      '<Node uri="uri">{md`template literal with interpolation ${nope}`}</Node>',
  };
  /* eslint-enable no-template-curly-in-string */

  for (const [name, code] of Object.entries(cases)) {
    expect(() => {
      transform(code);
    }).toThrowErrorMatchingSnapshot(name);
  }
});

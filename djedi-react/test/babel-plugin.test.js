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
  return babel.transform(code, { plugins: [jsx, babelPlugin] }).code;
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

const baseRules = require("eslint-config-lydell");

module.exports = {
  plugins: ["import", "react", "prettier", "sort-imports-es6-autofix"],
  parser: "babel-eslint",
  env: { es6: true },
  globals: {
    clearTimeout: false,
    console: false,
    document: false,
    fetch: false,
    setTimeout: false,
    window: false,
  },
  rules: Object.assign({}, baseRules({ import: true, react: true }), {
    "prettier/prettier": "error",
    "sort-imports-es6-autofix/sort-imports-es6": "error",
  }),
  overrides: [
    {
      files: [".*.js", "*.config.js", "babel-plugin.js"],
      env: { node: true },
    },
    {
      files: ["*.test.js", "{test,__mocks__}/*.js"],
      env: { node: true, jest: true },
    },
    {
      files: ["src/*.js"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector:
              ":matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression):matches([async=true], [generator=true])",
            message:
              "async functions and generators are not allowed, because it requires a big runtime in older browsers, which we don’t want to force on all package consumers. Use `.then()` instead.",
          },
          {
            selector: "ForOfStatement",
            message:
              "for-of loops are not allowed, because they are harder to get working cheaply for non-arrays in older browsers. Use `.forEach()` or similar instead.",
          },
        ],
      },
    },
    {
      files: ["{components,pages,test/fixtures}/*.js"],
      rules: {
        "import/no-unresolved": ["error", { ignore: ["djedi-react"] }],
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
};

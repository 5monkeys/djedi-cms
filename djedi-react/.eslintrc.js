const baseRules = require("eslint-config-lydell");

module.exports = {
  plugins: ["import", "react", "prettier", "sort-imports-es6-autofix"],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
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
      files: [".*.js", "*.config.js"],
      env: { node: true },
    },
    {
      files: ["*.test.js"],
      env: { jest: true },
    },
  ],
};

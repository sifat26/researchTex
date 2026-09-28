/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  rules: {
    // Enforce explicit return types on functions
    "@typescript-eslint/explicit-function-return-type": "warn",
    // Disallow 'any' — use 'unknown' instead
    "@typescript-eslint/no-explicit-any": "error",
    // Require await in async functions
    "@typescript-eslint/require-await": "error",
    // No floating promises
    "@typescript-eslint/no-floating-promises": "error",
    // Consistent type imports
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "inline-type-imports" },
    ],
    // No unused variables (allow leading underscore prefix)
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
};

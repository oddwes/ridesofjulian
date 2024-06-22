import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

module.exports = [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser
    },
    extends: [
      "plugin:react/jsx-runtime"
    ]
  },
  pluginJs.configs.recommended,
  pluginReactConfig,
];
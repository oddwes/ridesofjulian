import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import prettier from "eslint-plugin-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import { fixupPluginRules } from "@eslint/compat";

/** @type {import('eslint').Linter.Config[]} */
export default [
    pluginJs.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        files: ["**/*.{js,mjs,cjs,jsx}"],
        languageOptions: { globals: {...globals.node, ...globals.browser} },
        plugins: {
            prettier,
            "react-hooks": fixupPluginRules(reactHooks),
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            "react/jsx-uses-react": "off",
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react-hooks/exhaustive-deps": "warn",
        },
    }
];
"use strict";

const nodemailer = require("eslint-config-nodemailer");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
      globals: {
        Buffer: "readonly",
        clearImmediate: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        exports: "writable",
        global: "readonly",
        module: "writable",
        process: "readonly",
        require: "readonly",
        setImmediate: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        it: "readonly",
        describe: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      ...nodemailer.rules,
      ...prettier.rules,
      indent: 0,
      "no-await-in-loop": 0,
      "require-atomic-updates": 0,
      "no-prototype-builtins": 0,
    },
  },
];

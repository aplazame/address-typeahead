module.exports = {
  "env": {
    "browser": true,
    "es6": true,
  },
  "globals": {
    "module": true,
    "require": true,
    "global": true,
  },
  "extends": "eslint:recommended",
  "parserOptions": {
      "sourceType": "module",
  },
  "rules": {
    /* TODO
    "indent": [
          "error",
          2
    ],
    */
    "no-empty": ["error", { "allowEmptyCatch": true }],
    "no-console": 1,
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "single"
    ],
    "semi": [
      "error",
      "never"
    ],
    "func-names": [
      "error",
      "always"
    ],
    "no-unused-vars": [
      "warn",
      {
        "args": "all",
        "argsIgnorePattern": "^_\\w+"
      }
    ]
  },
  "overrides": [
    {
      "files": ["*-test.js","*-tests.js","*.spec.js"],
      "rules": {
        "func-names": 0,
      }
    }
  ],
};

module.exports = {
    env: {
      node: true,
      commonjs: true,
      es2021: true,
    },
    extends: ["eslint:recommended", "plugin:react/recommended"],
    overrides: [
      {
        env: {
          node: true,
        },
        files: [".eslintrc.{js,cjs}"],
        parserOptions: {
          sourceType: "script",
        },
      },
    ],
    rules: {},
  };
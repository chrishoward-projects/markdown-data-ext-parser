module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off'
  },
  env: {
    node: true,
    jest: true,
    es6: true
  }
};
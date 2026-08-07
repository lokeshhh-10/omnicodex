// @ts-check
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

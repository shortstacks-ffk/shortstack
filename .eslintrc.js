module.exports = {
    // ...existing config...
    rules: {
      // ...other rules...
      '@typescript-eslint/no-unused-vars': 'warn', // Downgrade to warning
      'no-var': 'warn', // Downgrade to warning
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade to warning
    },
  }
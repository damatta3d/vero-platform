module.exports = {
  displayName: 'core-domain',
  preset: '../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['**/*.ts', '!public-api.ts', '!**/*.spec.ts'],
  coverageDirectory: '../../../coverage/packages/core/domain',
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90
    }
  }
};

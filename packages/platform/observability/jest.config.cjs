module.exports = {
  displayName: 'platform-observability',
  preset: '../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleNameMapper: {
    '^@vero/shared-kernel$': '<rootDir>/../../shared-kernel/src/public-api.ts',
    '^@vero/core-configuration$': '<rootDir>/../../core/configuration/src/public-api.ts'
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../../coverage/packages/platform/observability'
};

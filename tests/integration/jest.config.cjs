module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/../../tsconfig.base.json' }]
  },
  moduleNameMapper: {
    '^@vero/infrastructure-database$':
      '<rootDir>/../../packages/infrastructure/database/src/public-api.ts',
    '^@vero/infrastructure-cache$':
      '<rootDir>/../../packages/infrastructure/cache/src/public-api.ts',
    '^@vero/infrastructure-messaging$':
      '<rootDir>/../../packages/infrastructure/messaging/src/public-api.ts'
  },
  moduleFileExtensions: ['ts', 'js']
};

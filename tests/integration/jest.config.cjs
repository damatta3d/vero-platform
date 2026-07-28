module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/../../tsconfig.base.json' }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@vero/infrastructure-database$':
      '<rootDir>/../../packages/infrastructure/database/src/public-api.ts',
    '^@vero/infrastructure-cache$':
      '<rootDir>/../../packages/infrastructure/cache/src/public-api.ts',
    '^@vero/infrastructure-messaging$':
      '<rootDir>/../../packages/infrastructure/messaging/src/public-api.ts',
    '^@vero/business-catalog$': '<rootDir>/../../packages/business/catalog/src/public-api.ts'
  },
  moduleFileExtensions: ['ts', 'js']
};

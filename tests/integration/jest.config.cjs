module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/../../tsconfig.base.json' }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@vero/core-tenancy$': '<rootDir>/../../packages/core/tenancy/src/public-api.ts',
    '^@vero/core-identity$': '<rootDir>/../../packages/core/identity/src/public-api.ts',
    '^@vero/core-access$': '<rootDir>/../../packages/core/access/src/public-api.ts',
    '^@vero/infrastructure-database$':
      '<rootDir>/../../packages/infrastructure/database/src/public-api.ts',
    '^@vero/infrastructure-cache$':
      '<rootDir>/../../packages/infrastructure/cache/src/public-api.ts',
    '^@vero/infrastructure-messaging$':
      '<rootDir>/../../packages/infrastructure/messaging/src/public-api.ts',
    '^@vero/business-catalog$': '<rootDir>/../../packages/business/catalog/src/public-api.ts',
    '^@vero/business-inventory$': '<rootDir>/../../packages/business/inventory/src/public-api.ts',
    '^@vero/business-production$': '<rootDir>/../../packages/business/production/src/public-api.ts',
    '^@vero/business-sales$': '<rootDir>/../../packages/business/sales/src/public-api.ts',
    '^@vero/business-intelligence$':
      '<rootDir>/../../packages/business/intelligence/src/public-api.ts'
  },
  moduleFileExtensions: ['ts', 'js']
};

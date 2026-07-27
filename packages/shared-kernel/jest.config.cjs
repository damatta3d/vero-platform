module.exports = {
  displayName: 'shared-kernel',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/packages/shared-kernel'
};

import eslint from '@eslint/js';
import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'packages/infrastructure/database/src/generated/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts']
  })),
  prettier,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [
          './apps/*/tsconfig.app.json',
          './apps/*/tsconfig.spec.json',
          './packages/**/tsconfig.lib.json',
          './packages/**/tsconfig.spec.json'
        ],
        tsconfigRootDir: import.meta.dirname
      },
      globals: globals.node
    },
    plugins: { '@nx': nx },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:shared-kernel',
              onlyDependOnLibsWithTags: ['scope:shared-kernel']
            },
            {
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: ['type:domain', 'scope:shared-kernel']
            },
            {
              sourceTag: 'scope:core',
              notDependOnLibsWithTags: ['scope:business', 'scope:integration']
            },
            {
              sourceTag: 'scope:platform',
              onlyDependOnLibsWithTags: [
                'scope:shared-kernel',
                'scope:core',
                'scope:platform',
                'scope:business'
              ]
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'scope:shared-kernel',
                'scope:core',
                'scope:platform',
                'scope:business'
              ]
            },
            {
              sourceTag: 'scope:business',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:core', 'scope:business']
            }
          ]
        }
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error'
    }
  },
  {
    files: ['**/*.spec.ts'],
    languageOptions: { globals: globals.jest },
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off'
    }
  }
);

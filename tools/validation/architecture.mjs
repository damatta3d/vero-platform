import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceRoots = ['apps', 'packages'];
const violations = [];
const providerImports =
  /from ['"](?:@nestjs|fastify|@prisma|ioredis|amqplib|pg|pino|@opentelemetry)/;
const deepAlias = /from ['"]@vero\/[^'"]+\/[^'"]+['"]/;
const appImport = /from ['"][^'"]*apps\//;

for (const sourceRoot of sourceRoots) {
  for (const file of await walk(join(root, sourceRoot))) {
    if (!file.endsWith('.ts') || file.includes('/generated/')) continue;
    const content = await readFile(file, 'utf8');
    const normalized = relative(root, file);
    if (normalized.startsWith('packages/shared-kernel/') && providerImports.test(content)) {
      violations.push(`${normalized}: Shared Kernel imports a runtime or provider`);
    }
    if (normalized.includes('/domain/') && providerImports.test(content)) {
      violations.push(`${normalized}: Domain imports a runtime or provider`);
    }
    if (deepAlias.test(content)) violations.push(`${normalized}: deep alias import is forbidden`);
    if (appImport.test(content)) violations.push(`${normalized}: importing an app is forbidden`);
  }
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Architecture validation passed.');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

import type { TenantId } from '../src/public-api.js';

// @ts-expect-error TenantId has no public runtime constructor.
new TenantId('untrusted');

// @ts-expect-error The trusted promotion factory is intentionally internal.
import { createTenantIdFromTrustedValue } from '../src/public-api.js';

// @ts-expect-error Authorization belongs to the future Access mission.
import type { AuthorizedTenantContext } from '../src/public-api.js';

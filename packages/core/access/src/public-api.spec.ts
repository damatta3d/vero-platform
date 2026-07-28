import * as publicApi from './public-api.js';

describe('core-access public API', () => {
  it('exports only the essential authorization surface', () => {
    expect(Object.keys(publicApi).sort()).toEqual(
      [
        'AccessContextConsumedError',
        'AccessDeniedError',
        'AccessError',
        'InvalidAccessReferenceError',
        'actionRef',
        'consumeAuthorizedAccess',
        'createAccessAuthorizer',
        'resourceRef'
      ].sort()
    );
  });
});

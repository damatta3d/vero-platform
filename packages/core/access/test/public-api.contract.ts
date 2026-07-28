import {
  actionRef,
  createAccessAuthorizer,
  resourceRef,
  type AccessEvaluator
} from '@vero/core-access';

const evaluator: AccessEvaluator = {
  evaluate: () => Promise.resolve({ outcome: 'deny', reason: 'default-deny', policyRevision: 'v1' })
};

void createAccessAuthorizer(evaluator);
void actionRef('catalog.product.read');
void resourceRef('catalog.product');

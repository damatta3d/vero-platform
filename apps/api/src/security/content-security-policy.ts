const inlineApplicationPaths = new Set(['/', '/inicio', '/mvp', '/operacao', '/financeiro']);

const defaultContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' https: 'unsafe-inline'",
  'upgrade-insecure-requests'
].join(';');

const managerContentSecurityPolicy = defaultContentSecurityPolicy.replace(
  ';upgrade-insecure-requests',
  ";media-src 'self' blob: data:"
);

const inlineApplicationContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' https: data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self' https: 'unsafe-inline'"
].join(';');

export function contentSecurityPolicyForPath(path: string): string {
  if (path === '/manager' || path.startsWith('/manager/')) return managerContentSecurityPolicy;
  const usesInlineApplication =
    inlineApplicationPaths.has(path) || path.startsWith('/menu/') || path.startsWith('/pedido/');
  return usesInlineApplication
    ? inlineApplicationContentSecurityPolicy
    : defaultContentSecurityPolicy;
}

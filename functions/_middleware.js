// Keeps repository-only files (docs, tests, worker source, WP plugin, configs) off the public site.
const BLOCKED = /^\/(docs|tests|workers|wp-plugin|functions|node_modules)(\/|$)|^\/(package(-lock)?\.json|\.gitignore|README\.md|_headers)$/i;

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (BLOCKED.test(pathname)) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  return context.next();
}

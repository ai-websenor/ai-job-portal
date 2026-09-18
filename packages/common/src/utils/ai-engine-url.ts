/**
 * One place that decides where the self-hosted AI engine lives.
 *
 * Three services talk to it and each built the URL its own way: the gateway
 * appends a path that already starts with `/ai`, while messaging and
 * recommendation append `/chat` and `/recommend` to a base that must already
 * end in `/ai`. Two of them also carried a hardcoded dev load-balancer address
 * as a fallback, so an environment that forgot to set the variable silently
 * talked to the wrong environment's engine instead of failing.
 *
 * `AI_SERVICE_URL` is now the single source of truth, and these helpers make it
 * work whether or not whoever set it remembered the `/ai` suffix.
 */

const AI_PATH_PREFIX = '/ai';

/** The engine's own port, used only when nothing is configured. */
const LOCAL_DEFAULT = 'http://localhost:3010';

/**
 * Normalise a configured engine URL to a base that always ends in `/ai` and
 * never in a slash.
 *
 * Both `http://host` and `http://host/ai` are accepted, because the engine
 * mounts every route twice — bare and under `/ai` — and people reasonably
 * write it either way.
 */
export function resolveAiEngineUrl(configured?: string | null): string {
  const raw = (configured ?? '').trim() || LOCAL_DEFAULT;
  const base = raw.replace(/\/+$/, '');

  return base.endsWith(AI_PATH_PREFIX) ? base : `${base}${AI_PATH_PREFIX}`;
}

/**
 * Join a request path onto a resolved base without repeating `/ai`.
 *
 * The gateway strips `/api/v1` and forwards what is left, so it holds paths
 * like `/ai/parse`. Appending that to a base ending in `/ai` would ask the
 * engine for `/ai/ai/parse`, which is a 404 rather than an error anyone would
 * recognise.
 */
export function joinAiEnginePath(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const withoutPrefix =
    path === AI_PATH_PREFIX || path.startsWith(`${AI_PATH_PREFIX}/`)
      ? path.slice(AI_PATH_PREFIX.length)
      : path;

  if (!withoutPrefix) return trimmedBase;

  return withoutPrefix.startsWith('/')
    ? `${trimmedBase}${withoutPrefix}`
    : `${trimmedBase}/${withoutPrefix}`;
}

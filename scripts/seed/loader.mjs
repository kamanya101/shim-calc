/**
 * Node resolves ESM by exact filename; the app's TypeScript imports "./engines"
 * with no extension. This hook retries a failed relative resolve with ".ts"
 * appended, which is enough to import src/lib/pool.ts directly rather than
 * keeping a second copy of its hashing here — a copy that would quietly drift.
 */
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !/\.[mc]?[jt]s$/.test(specifier)) {
      return await next(`${specifier}.ts`, context);
    }
    throw error;
  }
}

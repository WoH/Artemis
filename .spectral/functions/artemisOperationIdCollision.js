/**
 * Spectral custom function: artemisOperationIdCollision
 *
 * Context
 * -------
 * Artemis post-processes the springdoc-generated OpenAPI document in
 * `OpenAPIConfiguration.java`, which strips a trailing `_<number>` suffix from
 * every `operationId` (e.g. `update_1` -> `update`, `create_1` -> `create`).
 * springdoc emits those numeric suffixes whenever two Java controller methods
 * share the same name (here `create` / `update` across different resources),
 * so the suffix is the ONLY thing keeping the operationIds unique.
 *
 * After the strip, the generated Angular client derives one service method per
 * operationId. Two operationIds that collapse onto the same stem therefore
 * produce a single Angular method name, and the second generated method
 * silently overwrites the first -> a real, shipped client bug.
 *
 * This function operates on the WHOLE document (given: '$'). It collects every
 * operationId across all paths/methods, strips the same `_\d+$` suffix that the
 * server strips, groups by the resulting stem, and reports any stem that is
 * produced by more than one operationId.
 *
 * Spectral custom-function contract (Spectral 6.x)
 * ------------------------------------------------
 * - Default export: function(targetValue, options, context).
 * - `targetValue` is the resolved value at `given` (the root document here).
 * - `context.path` is the JSON path array of the current node (here `[]`).
 * - Return `undefined` (or `[]`) when everything is fine, otherwise an array of
 *   `{ message, path }` result objects. `path` is relative to the document root.
 * - Must be dependency-free and must never throw on malformed/odd input.
 */

// HTTP methods that carry an operation object. We deliberately enumerate them
// instead of iterating every key under a path item, so that path-level members
// such as `parameters`, `summary`, `description` or `$ref` are never mistaken
// for operations.
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

// Matches the springdoc collision suffix that OpenAPIConfiguration.java strips.
const COLLISION_SUFFIX = /_\d+$/;

/**
 * @param {unknown} targetValue The resolved value at `given` (the root document).
 * @returns {Array<{ message: string, path: (string|number)[] }> | undefined}
 */
export default function artemisOperationIdCollision(targetValue) {
    // Guard: only proceed when we actually received a document with paths.
    if (targetValue === null || typeof targetValue !== 'object') {
        return undefined;
    }

    const paths = targetValue.paths;
    if (paths === null || typeof paths !== 'object') {
        return undefined;
    }

    // stem -> array of { operationId, path: JSON path to the operationId node }
    const stems = new Map();

    for (const pathKey of Object.keys(paths)) {
        const pathItem = paths[pathKey];
        if (pathItem === null || typeof pathItem !== 'object') {
            continue;
        }

        for (const method of HTTP_METHODS) {
            const operation = pathItem[method];
            if (operation === null || typeof operation !== 'object') {
                continue;
            }

            const operationId = operation.operationId;
            if (typeof operationId !== 'string' || operationId.length === 0) {
                continue;
            }

            // Reproduce the server-side normalization exactly.
            const stem = operationId.replace(COLLISION_SUFFIX, '');

            if (!stems.has(stem)) {
                stems.set(stem, []);
            }
            stems.get(stem).push({
                operationId,
                // Point the violation at the concrete operationId node so the
                // editor highlights the offending line.
                path: ['paths', pathKey, method, 'operationId'],
            });
        }
    }

    const results = [];

    for (const [stem, occurrences] of stems) {
        if (occurrences.length < 2) {
            continue;
        }

        // Build a human-readable list: `update (paths./a/b put)`.
        const details = occurrences
            .map((entry) => `'${entry.operationId}' (${entry.path[1]} ${entry.path[2]})`)
            .join(', ');

        // Emit one violation per offending operationId so every colliding
        // operation is individually flagged (and individually addressable).
        for (const entry of occurrences) {
            results.push({
                message:
                    `operationId '${entry.operationId}' collapses onto the stem '${stem}' after ` +
                    `OpenAPIConfiguration.java strips the '_<number>' suffix, colliding with: ${details}. ` +
                    `Colliding operationIds generate the same Angular client method; rename the Java ` +
                    `controller methods so each operationId is unique after suffix stripping.`,
                path: entry.path,
            });
        }
    }

    return results.length > 0 ? results : undefined;
}

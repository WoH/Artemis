// artemisNoLyingErrorSchema.js
//
// Spectral custom function for the Artemis OpenAPI contract-linting setup.
//
// Goal: flag "lying error schemas" — error responses (4xx / 5xx) whose response
// body schema is structurally identical to the operation's success (2xx) schema.
// springdoc tends to copy the happy-path schema onto error responses, producing
// an error contract that claims the same payload as success. That is misleading:
// a client cannot tell a failure from a success by shape, and error bodies should
// describe a problem (ideally application/problem+json), not the success entity.
//
// Spectral custom function contract (Spectral 6.x):
//   default export: function(targetValue, options, context)
//     - targetValue: the node selected by `given` (here: an operation object)
//     - options:     functionOptions from the ruleset (unused here)
//     - context:     { path, document, documentInventory, ... }
//                    context.path is the JSON path (array) of targetValue.
//   Return undefined / [] when OK, or an array of { message, path } results.
//   `path` is absolute from the document root; we build it from context.path.
//
// This function is intentionally DEPENDENCY-FREE and guards every node access so
// it never throws on missing/odd nodes.

/**
 * Order-independent, type-aware deep equality for plain JSON values.
 * Handles objects, arrays, and primitives. Object key order does not matter.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    // Mismatched null/undefined or differing primitive identity already failed above.
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }

    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray !== bIsArray) {
        return false;
    }

    if (aIsArray) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    for (const key of aKeys) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) {
            return false;
        }
        if (!deepEqual(a[key], b[key])) {
            return false;
        }
    }
    return true;
}

/**
 * Extract the media-type entries of a response as a list of
 * { mediaType, schema } pairs. Guards missing content / schema.
 *
 * @param {*} response a response object, e.g. responses['200']
 * @returns {{ mediaType: string, schema: object }[]}
 */
function collectSchemas(response) {
    const out = [];
    if (!response || typeof response !== 'object') {
        return out;
    }
    const content = response.content;
    if (!content || typeof content !== 'object') {
        return out;
    }
    for (const mediaType of Object.keys(content)) {
        const media = content[mediaType];
        if (media && typeof media === 'object' && media.schema && typeof media.schema === 'object') {
            out.push({ mediaType, schema: media.schema });
        }
    }
    return out;
}

/**
 * @param {*} status an HTTP status key from a responses object
 * @returns {boolean} true for 2xx success codes
 */
function isSuccessStatus(status) {
    return /^2\d\d$/.test(String(status));
}

/**
 * @param {*} status an HTTP status key from a responses object
 * @returns {boolean} true for 4xx / 5xx error codes
 */
function isErrorStatus(status) {
    return /^[45]\d\d$/.test(String(status));
}

/**
 * @param {object} operation the operation object selected by `given`
 * @param {*} _options unused functionOptions
 * @param {object} context Spectral rule context
 * @returns {{ message: string, path: (string|number)[] }[] | undefined}
 */
export default function artemisNoLyingErrorSchema(operation, _options, context) {
    // Guard: only operate on a sane operation object with responses.
    if (!operation || typeof operation !== 'object') {
        return undefined;
    }
    const responses = operation.responses;
    if (!responses || typeof responses !== 'object') {
        return undefined;
    }

    // Base path of this operation in the document (e.g. ['paths', '/api/search', 'get']).
    const basePath = Array.isArray(context && context.path) ? context.path : [];

    // 1) Collect every success (2xx) schema for comparison.
    const successSchemas = [];
    for (const status of Object.keys(responses)) {
        if (isSuccessStatus(status)) {
            for (const entry of collectSchemas(responses[status])) {
                successSchemas.push(entry.schema);
            }
        }
    }

    // No success schema to compare against — nothing to flag.
    if (successSchemas.length === 0) {
        return undefined;
    }

    const results = [];

    // 2) For each error (4xx/5xx) response media type, compare against success schemas.
    for (const status of Object.keys(responses)) {
        if (!isErrorStatus(status)) {
            continue;
        }
        const errorEntries = collectSchemas(responses[status]);
        for (const { mediaType, schema } of errorEntries) {
            const matchesSuccess = successSchemas.some((successSchema) => {
                // Fast path: identical $ref string.
                if (
                    schema &&
                    successSchema &&
                    typeof schema.$ref === 'string' &&
                    typeof successSchema.$ref === 'string'
                ) {
                    if (schema.$ref === successSchema.$ref) {
                        return true;
                    }
                }
                // General path: structural deep-equality of the schema objects
                // (catches inline schemas like `{type: array, items: {$ref: ...}}`).
                return deepEqual(schema, successSchema);
            });

            if (matchesSuccess) {
                results.push({
                    message:
                        `Error response '${status}' (${mediaType}) reuses the success (2xx) schema. ` +
                        `Error bodies must describe a problem (prefer application/problem+json), not the success payload.`,
                    // Point precisely at the offending error response schema node.
                    path: [...basePath, 'responses', status, 'content', mediaType, 'schema'],
                });
            }
        }
    }

    return results.length > 0 ? results : undefined;
}

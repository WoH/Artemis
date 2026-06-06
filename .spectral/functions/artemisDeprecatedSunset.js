/**
 * Spectral custom function: artemisDeprecatedSunset
 *
 * A deprecated operation (`deprecated: true`) must announce its retirement so
 * clients can migrate before it disappears. Per RFC 8594 (Sunset) and RFC 9745
 * (Deprecation), this means advertising at least a `Sunset` response header
 * (and, ideally, a `Link: <successor>; rel="successor-version"`). Artemis emits
 * these at runtime via LegacyApiPathDeprecationInterceptor, but springdoc does
 * not surface them into the static contract — so a deprecated path in the spec
 * carries no machine-discoverable retirement signal.
 *
 * This is the contract-side half of the legacy-alias deprecation story: ArchUnit
 * checks the `@Deprecated` annotation exists on the Java side; this rule checks
 * the emitted contract actually tells clients when the endpoint sunsets.
 *
 * Wired with `given: '$.paths[*][get,put,post,delete,patch]'`, so `input` is an
 * operation object. We only act when `deprecated === true`.
 *
 * Spectral 6.x contract: default export `function(input, options, context)`,
 * returning undefined/[] when OK or an array of `{ message, path }`. Dependency
 * free; guards every node access and never throws.
 *
 * @param {object} operation operation object selected by `given`
 * @param {*} _options unused functionOptions
 * @param {object} context Spectral rule context (context.path is this node's path)
 * @returns {Array<{ message: string, path: (string|number)[] }> | undefined}
 */
export default function artemisDeprecatedSunset(operation, _options, context) {
    // Guard: only deprecated operations are in scope.
    if (!operation || typeof operation !== 'object' || operation.deprecated !== true) {
        return undefined;
    }

    const basePath = Array.isArray(context && context.path) ? context.path : [];

    const responses = operation.responses;
    let hasSunsetHeader = false;

    if (responses && typeof responses === 'object') {
        for (const status of Object.keys(responses)) {
            const response = responses[status];
            if (!response || typeof response !== 'object') {
                continue;
            }
            const headers = response.headers;
            if (!headers || typeof headers !== 'object') {
                continue;
            }
            // Header names are case-insensitive (RFC 9110 §5.1); match defensively.
            for (const headerName of Object.keys(headers)) {
                if (headerName.toLowerCase() === 'sunset') {
                    hasSunsetHeader = true;
                    break;
                }
            }
            if (hasSunsetHeader) {
                break;
            }
        }
    }

    if (hasSunsetHeader) {
        return undefined;
    }

    return [
        {
            message:
                'Deprecated operation does not advertise a Sunset response header. A deprecated ' +
                'endpoint must declare when it will be removed (RFC 8594 Sunset, ideally with a ' +
                'Link rel="successor-version" per RFC 8288) so clients can migrate. Surface the ' +
                'headers that LegacyApiPathDeprecationInterceptor sets at runtime into the contract.',
            path: [...basePath],
        },
    ];
}

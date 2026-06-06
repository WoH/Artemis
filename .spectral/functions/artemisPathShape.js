/**
 * Spectral custom function: artemisPathShape
 *
 * Enforces the Artemis REST path convention on a RESOLVED OpenAPI path key
 * (the function is wired with `given: '$.paths[*]~'`, so `input` is the path
 * STRING, e.g. "/api/tutorialgroup/courses/{courseId}/tutorial-groups/{tutorialGroupId}").
 *
 * Convention (see https://docs.artemis.tum.de/developer/guidelines/rest-api):
 *   api/<module>/<collection>/{<collection-singular>Id}
 * Every path variable whose name ends with "Id" must be IMMEDIATELY preceded by
 * a literal collection segment whose pluralized singular matches the id —
 * either exactly (courses/{courseId}) or as a subtype suffix
 * (programming-exercises/{exerciseId}).
 *
 * This is a position-agnostic, local-pair invariant: each "{...Id}" segment is
 * checked against the single literal segment directly before it. Non-Id path
 * variables (e.g. {studentLogin}) are explicitly OUT of scope.
 *
 * Why this complements the ArchUnit rule: ArchUnit inspects only the first
 * mapping value (values[0]) of the Java annotation, so dual-mapping alias keys
 * never reach it. The committed openapi.yaml contains the resolved keys, so this
 * function can flag aliases the source-side rule structurally cannot see.
 *
 * The camelToKebab / pluralize helpers are faithful ports of
 * AbstractModuleResourceArchitectureTest (camelToKebab + pluralize) so the two
 * checks agree on the expected collection name.
 *
 * Dependency-free, pure JS, guards every odd/missing node and never throws.
 *
 * @param {unknown} input    the path key string (from `$.paths[*]~`)
 * @param {object}  options  unused
 * @param {object}  context  Spectral context; context.path is the JSON path of this node
 * @returns {Array<{message: string, path?: Array<string|number>}>|undefined}
 */
export default function artemisPathShape(input, options, context) {
    // Guard: we only operate on non-empty path strings.
    if (typeof input !== 'string' || input.length === 0) {
        return undefined;
    }

    const path = input;

    // Matches a whole segment of the form "{<letters>Id}", capturing the stem
    // (the part before the trailing "Id"). Mirrors ArchUnit's ENTITY_ID_VARIABLE
    // intent: only camelCase id variables are in scope; {studentLogin} etc. are not.
    const ID_SEGMENT = /^\{([a-zA-Z]+)Id\}$/;

    // Split into non-empty segments (drops the leading "/" and any "//").
    const segments = path.split('/').filter((segment) => segment.length > 0);

    const results = [];

    for (let i = 0; i < segments.length; i++) {
        const match = ID_SEGMENT.exec(segments[i]);
        if (!match) {
            continue;
        }

        const stem = match[1]; // e.g. "course", "tutorialGroup", "tutorialGroupsConfiguration"
        const expectedCollection = pluralize(camelToKebab(stem));

        // The immediately preceding literal segment must carry the collection.
        const previous = i > 0 ? segments[i - 1] : '';
        const previousIsLiteral = previous.length > 0 && !previous.startsWith('{');
        const pairedWithCollection =
            previousIsLiteral && (previous === expectedCollection || previous.endsWith('-' + expectedCollection));

        if (!pairedWithCollection) {
            results.push({
                message:
                    'REST path "' +
                    path +
                    '" uses the entity id {' +
                    stem +
                    'Id} without its collection: it must be immediately preceded by the plural collection "' +
                    expectedCollection +
                    '" (exactly, or as a subtype suffix like "-' +
                    expectedCollection +
                    '"), i.e. api/<module>/<plural-collection>/{<collection-singular>Id}. ' +
                    'Found preceding segment "' +
                    (previous.length > 0 ? previous : '(none)') +
                    '". Use a query parameter when the entity is only a filter, not a sub-resource. ' +
                    'See https://docs.artemis.tum.de/developer/guidelines/rest-api',
                // context.path is the path of this node (e.g. ['paths', '/api/...']).
                // Reporting at that node points the message at the offending path key.
                path: Array.isArray(context && context.path) ? context.path.slice() : undefined,
            });
        }
    }

    return results.length > 0 ? results : undefined;
}

/**
 * Insert "-" before every interior capital letter and lowercase the whole string.
 * Port of AbstractModuleResourceArchitectureTest.camelToKebab:
 *   camelCase.replaceAll("(?<!^)(?=[A-Z])", "-").toLowerCase(Locale.ROOT)
 * Examples: "course" -> "course", "tutorialGroup" -> "tutorial-group",
 *           "tutorialGroupsConfiguration" -> "tutorial-groups-configuration".
 *
 * @param {string} camelCase
 * @returns {string}
 */
function camelToKebab(camelCase) {
    // (?<!^) avoids a leading dash; (?=[A-Z]) splits before each interior capital.
    return camelCase.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase();
}

/**
 * Naive English pluralization on a kebab-case singular.
 * Port of AbstractModuleResourceArchitectureTest.pluralize:
 *   ".*[^aeiou]y"        -> drop "y", add "ies"  (e.g. "category" -> "categories")
 *   ".*(s|x|z|ch|sh)"    -> add "es"             (e.g. "address" -> "addresses")
 *   otherwise            -> add "s"              (e.g. "course"  -> "courses")
 *
 * @param {string} kebabSingular
 * @returns {string}
 */
function pluralize(kebabSingular) {
    if (/[^aeiou]y$/.test(kebabSingular)) {
        return kebabSingular.slice(0, -1) + 'ies';
    }
    if (/(s|x|z|ch|sh)$/.test(kebabSingular)) {
        return kebabSingular + 'es';
    }
    return kebabSingular + 's';
}

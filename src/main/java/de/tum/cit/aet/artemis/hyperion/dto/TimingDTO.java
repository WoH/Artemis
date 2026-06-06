package de.tum.cit.aet.artemis.hyperion.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * DTO for consistency check timing response.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@Schema(description = "Response containing consistency check timing")
public record TimingDTO(

        // No example on these ISO-8601 timestamp strings: swagger-core coerces a date-shaped example into a
        // java.util.Date, which the OpenAPI YAML serializer then emits with a non-standard `!!timestamp` tag that
        // breaks downstream tooling (Stoplight Spectral, generic JSON/YAML parsers). The description documents the field.
        @Schema(description = "Starting time (ISO-8601), e.g. 2025-07-27T07:17:05.500459") String startTime,

        @Schema(description = "Ending time (ISO-8601), e.g. 2025-07-27T07:17:05.500459") String endTime,

        @Schema(description = "Duration of consistency check", example = "27.765") double durationS) {
}

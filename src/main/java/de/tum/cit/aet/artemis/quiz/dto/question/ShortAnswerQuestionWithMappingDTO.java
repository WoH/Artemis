package de.tum.cit.aet.artemis.quiz.dto.question;

import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;

import de.tum.cit.aet.artemis.quiz.domain.ShortAnswerQuestion;
import de.tum.cit.aet.artemis.quiz.dto.ShortAnswerMappingDTO;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ShortAnswerQuestionWithMappingDTO(@JsonUnwrapped ShortAnswerQuestionWithoutMappingDTO shortAnswerQuestionWithoutMappingDTO,
        List<ShortAnswerMappingDTO> correctMappings) {

    public static ShortAnswerQuestionWithMappingDTO of(ShortAnswerQuestion question) {
        return new ShortAnswerQuestionWithMappingDTO(ShortAnswerQuestionWithoutMappingDTO.of(question),
                Objects.requireNonNullElse(question.getCorrectMappings(), List.<de.tum.cit.aet.artemis.quiz.domain.ShortAnswerMapping>of()).stream().map(ShortAnswerMappingDTO::of)
                        .toList());
    }

}

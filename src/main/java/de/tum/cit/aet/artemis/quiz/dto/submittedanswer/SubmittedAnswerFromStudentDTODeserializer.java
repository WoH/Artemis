package de.tum.cit.aet.artemis.quiz.dto.submittedanswer;

import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;

import de.tum.cit.aet.artemis.quiz.dto.question.reevaluate.DragAndDropMappingReEvaluateDTO;

public class SubmittedAnswerFromStudentDTODeserializer extends JsonDeserializer<SubmittedAnswerFromStudentDTO> {

    @Override
    public SubmittedAnswerFromStudentDTO deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        JsonNode node = parser.getCodec().readTree(parser);
        String type = extractText(node, "type");

        if ("multiple-choice".equals(type) || node.has("selectedOptions")) {
            return new MultipleChoiceSubmittedAnswerFromStudentDTO(extractQuestionId(node, context), extractIdSet(node.get("selectedOptions")));
        }
        if ("drag-and-drop".equals(type) || node.has("mappings")) {
            return new DragAndDropSubmittedAnswerFromStudentDTO(extractQuestionId(node, context), extractMappings(node.get("mappings"), context));
        }
        if ("short-answer".equals(type) || node.has("submittedTexts")) {
            return new ShortAnswerSubmittedAnswerFromStudentDTO(extractQuestionId(node, context), extractSubmittedTexts(node.get("submittedTexts"), context));
        }

        throw JsonMappingException.from(context, "Could not determine submitted answer type from payload");
    }

    private static Long extractQuestionId(JsonNode node, DeserializationContext context) throws JsonMappingException {
        JsonNode questionIdNode = node.get("questionId");
        if (questionIdNode != null && questionIdNode.canConvertToLong()) {
            return questionIdNode.longValue();
        }

        JsonNode quizQuestionNode = node.get("quizQuestion");
        if (quizQuestionNode != null) {
            JsonNode nestedIdNode = quizQuestionNode.get("id");
            if (nestedIdNode != null && nestedIdNode.canConvertToLong()) {
                return nestedIdNode.longValue();
            }
        }

        throw JsonMappingException.from(context, "Missing question id in submitted answer payload");
    }

    private static Set<Long> extractIdSet(JsonNode arrayNode) {
        if (arrayNode == null || arrayNode.isNull()) {
            return Set.of();
        }
        if (!arrayNode.isArray()) {
            return Set.of();
        }

        Set<Long> ids = new LinkedHashSet<>();
        for (JsonNode itemNode : arrayNode) {
            ids.add(extractIdWithoutContext(itemNode, "selectedOptions"));
        }
        return ids;
    }

    private static List<DragAndDropMappingReEvaluateDTO> extractMappings(JsonNode arrayNode, DeserializationContext context) throws JsonMappingException {
        if (arrayNode == null || arrayNode.isNull()) {
            return List.of();
        }
        if (!arrayNode.isArray()) {
            throw JsonMappingException.from(context, "Invalid array field 'mappings'");
        }

        List<DragAndDropMappingReEvaluateDTO> mappings = new java.util.ArrayList<>();
        for (JsonNode itemNode : arrayNode) {
            Long dragItemId = extractId(itemNode.get("dragItemId") != null ? itemNode.get("dragItemId") : itemNode.get("dragItem"), context, "dragItem");
            Long dropLocationId = extractId(itemNode.get("dropLocationId") != null ? itemNode.get("dropLocationId") : itemNode.get("dropLocation"), context, "dropLocation");
            mappings.add(new DragAndDropMappingReEvaluateDTO(dragItemId, dropLocationId));
        }
        return List.copyOf(mappings);
    }

    private static List<ShortAnswerSubmittedTextFromStudentDTO> extractSubmittedTexts(JsonNode arrayNode, DeserializationContext context) throws JsonMappingException {
        if (arrayNode == null || arrayNode.isNull()) {
            return List.of();
        }
        if (!arrayNode.isArray()) {
            throw JsonMappingException.from(context, "Invalid array field 'submittedTexts'");
        }

        List<ShortAnswerSubmittedTextFromStudentDTO> submittedTexts = new java.util.ArrayList<>();
        for (JsonNode itemNode : arrayNode) {
            String text = extractText(itemNode, "text");
            if (text == null) {
                throw JsonMappingException.from(context, "Missing text in submitted short answer payload");
            }
            JsonNode spotNode = itemNode.get("spotId") != null ? itemNode.get("spotId") : itemNode.get("spot");
            Long spotId = extractId(spotNode, context, "spot");
            submittedTexts.add(new ShortAnswerSubmittedTextFromStudentDTO(text, spotId));
        }
        return List.copyOf(submittedTexts);
    }

    private static Long extractId(JsonNode node, DeserializationContext context, String fieldName) throws JsonMappingException {
        if (node == null || node.isNull()) {
            if (context == null) {
                throw new IllegalArgumentException("Missing id for field '" + fieldName + "'");
            }
            throw JsonMappingException.from(context, "Missing id for field '" + fieldName + "'");
        }
        if (node.canConvertToLong()) {
            return node.longValue();
        }
        JsonNode nestedIdNode = node.get("id");
        if (nestedIdNode != null && nestedIdNode.canConvertToLong()) {
            return nestedIdNode.longValue();
        }
        if (context == null) {
            throw new IllegalArgumentException("Could not extract id for field '" + fieldName + "'");
        }
        throw JsonMappingException.from(context, "Could not extract id for field '" + fieldName + "'");
    }

    private static Long extractIdWithoutContext(JsonNode node, String fieldName) {
        if (node == null || node.isNull()) {
            throw new IllegalArgumentException("Missing id for field '" + fieldName + "'");
        }
        if (node.canConvertToLong()) {
            return node.longValue();
        }
        JsonNode nestedIdNode = node.get("id");
        if (nestedIdNode != null && nestedIdNode.canConvertToLong()) {
            return nestedIdNode.longValue();
        }
        throw new IllegalArgumentException("Could not extract id for field '" + fieldName + "'");
    }

    private static String extractText(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        if (field != null && !field.isNull()) {
            return field.asText();
        }
        return null;
    }
}

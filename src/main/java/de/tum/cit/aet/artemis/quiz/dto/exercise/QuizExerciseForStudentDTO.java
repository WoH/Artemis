package de.tum.cit.aet.artemis.quiz.dto.exercise;

/**
 * Sealed interface representing a quiz exercise response for a student.
 * <p>
 * The concrete type returned depends on the state of the quiz and the student's batch:
 * <ul>
 * <li>{@link QuizExerciseWithSolutionDTO} – quiz has ended (solution is visible)</li>
 * <li>{@link QuizExerciseWithQuestionsDTO} – quiz is active and the student is in an allowed batch</li>
 * <li>{@link QuizExerciseWithoutQuestionsDTO} – quiz has not started yet or the student's batch does not allow submission</li>
 * </ul>
 */
public sealed interface QuizExerciseForStudentDTO permits QuizExerciseWithSolutionDTO, QuizExerciseWithQuestionsDTO, QuizExerciseWithoutQuestionsDTO {
}

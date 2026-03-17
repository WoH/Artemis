package de.tum.cit.aet.artemis.quiz.service;

import static de.tum.cit.aet.artemis.core.config.Constants.PROFILE_CORE;

import java.time.ZonedDateTime;
import java.util.Optional;

import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import de.tum.cit.aet.artemis.quiz.domain.QuizQuestion;
import de.tum.cit.aet.artemis.quiz.domain.SubmittedAnswer;
import de.tum.cit.aet.artemis.quiz.dto.LeaderboardSettingDTO;
import de.tum.cit.aet.artemis.quiz.dto.submittedanswer.SubmittedAnswerAfterEvaluationDTO;
import de.tum.cit.aet.artemis.quiz.dto.submittedanswer.SubmittedAnswerFromStudentDTO;
import de.tum.cit.aet.artemis.quiz.repository.QuizQuestionRepository;
import de.tum.cit.aet.artemis.quiz.repository.QuizTrainingLeaderboardRepository;

@Profile(PROFILE_CORE)
@Lazy
@Service
public class QuizTrainingService {

    private final QuizQuestionProgressService quizQuestionProgressService;

    private final QuizQuestionRepository quizQuestionRepository;

    private final QuizTrainingLeaderboardRepository quizTrainingLeaderboardRepository;

    private final QuizSubmissionService quizSubmissionService;

    public QuizTrainingService(QuizQuestionProgressService quizQuestionProgressService, QuizQuestionRepository quizQuestionRepository,
            QuizTrainingLeaderboardRepository quizTrainingLeaderboardRepository, QuizSubmissionService quizSubmissionService) {
        this.quizQuestionProgressService = quizQuestionProgressService;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizTrainingLeaderboardRepository = quizTrainingLeaderboardRepository;
        this.quizSubmissionService = quizSubmissionService;
    }

    /**
     * Submits a quiz question for training mode, calculates scores and creates a result.
     *
     * @param quizQuestionId  the id of the quiz question being submitted
     * @param userId          the id of the user who is submitting the quiz
     * @param courseId        the id of the course
     * @param submittedAnswer the answer submitted by the user
     * @param isRated         whether the answer is rated (i.e. updates progress)
     * @param answeredAt      the time when the question was answered
     * @return a DTO containing the submitted answer after the evaluation
     */
    public SubmittedAnswerAfterEvaluationDTO submitForTraining(long quizQuestionId, long userId, long courseId, SubmittedAnswerFromStudentDTO submittedAnswer, boolean isRated,
            ZonedDateTime answeredAt) {
        QuizQuestion quizQuestion = quizQuestionRepository.findByIdElseThrow(quizQuestionId);

        SubmittedAnswer entity = quizSubmissionService.createSubmittedAnswerFromDTO(submittedAnswer, quizQuestion);

        double score = quizQuestion.scoreForAnswer(entity);

        entity.setScoreInPoints(score);
        entity.setQuizQuestion(quizQuestion);

        if (isRated) {
            quizQuestionProgressService.saveProgressFromTraining(quizQuestion, userId, courseId, entity, answeredAt);
        }

        return SubmittedAnswerAfterEvaluationDTO.of(entity);
    }

    /**
     * Retrieves the leaderboard visibility settings for the given user.
     *
     * @param userId the id of the user whose leaderboard settings should be retrieved
     * @return a LeaderboardSettingDTO with the user's showInLeaderboard preference, or {@code null} if not yet set
     */
    public LeaderboardSettingDTO getLeaderboardSettings(long userId) {
        Optional<Boolean> showInLeaderboardOptional = quizTrainingLeaderboardRepository.getShowInLeaderboard(userId);
        Boolean showInLeaderboard = showInLeaderboardOptional.orElse(null);
        return new LeaderboardSettingDTO(showInLeaderboard);
    }
}

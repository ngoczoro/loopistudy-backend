import { serializeQuiz, serializeQuizQuestion } from "../../../serializers/quizSerializer.js";



export const serializeQuizQuestionForClient = serializeQuizQuestion;



export const serializeGeneratedQuiz = (quiz, difficulty) => {

  const base = serializeQuiz(quiz);

  if (!base) return null;



  return {

    ...base,

    model: base.aiModel,

    difficulty: base.generationDifficulty ?? difficulty,

    numberOfQuestions:

      base.generationQuestionCount ?? base.questions.length,

  };

};


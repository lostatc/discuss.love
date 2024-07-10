import QuestionAnswer from "./components/QuestionAnswer.vue";

export interface QuestionDefinition {
  id: string;
  title: string;
  description: string;
}

export type AnswerType = "yes" | "no" | "later";

export const humanReadableAnswer = (answer: AnswerType): string => {
  switch (answer) {
    case "yes":
      return "Yes";
    case "no":
      return "No";
    case "later":
      return "Not right now, but maybe later";
  }
};

export interface QuestionAnswer {
  answer: AnswerType;
  notes: string;
}

export type WithQuestionId<T> = Readonly<{ id: string }> & T;

export type ByPlayer<T> = {
  sender: T;
  recipient: T;
};

export type AttributedAnswer = { playerName: string } & QuestionAnswer;

export type AnswerPair = WithQuestionId<ByPlayer<AttributedAnswer>>;

export type FormAnswer = WithQuestionId<ByPlayer<QuestionAnswer>>;

export type FormAnswers = Array<FormAnswer>;

export type SessionInfo = {
  players: ByPlayer<string>;
};
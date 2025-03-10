import rawRelationshipQuestions from "@/assets/questions/relationship.json";
import rawKinkQuestions from "@/assets/questions/kink.json";
import type { QuestionDefinition } from "@/types";
import seedrandom from "seedrandom";

export type QuestionList = "relationship" | "scene";
export const DEFAULT_QUESTION_LIST: QuestionList = "relationship";

export const isBuiltinQuestionList = (list: string): list is QuestionList => {
  return list === "relationship" || list === "scene";
};

const relationshipQuestions: Array<QuestionDefinition> = rawRelationshipQuestions;
const kinkQuestions: Array<QuestionDefinition> = rawKinkQuestions;

export const getQuestions = (list: QuestionList) => {
  switch (list) {
    case "relationship":
      return relationshipQuestions;
    case "scene":
      return kinkQuestions;
  }
};

export const getRandomizedQuestionCategories = (
  questions: Array<QuestionDefinition>,
  sharingCode: string,
) => {
  // Shuffle the questions and categories in a way that's deterministic by the
  // sharing code. This way both players see the same order of questions and the
  // order won't shuffle between page reloads.
  const rng = seedrandom(sharingCode);

  // Maps in JS remember their insertion order, so this function is still
  // deterministic.
  const byCategory = new Map<string, Array<QuestionDefinition>>();

  for (const q of questions) {
    const category = byCategory.get(q.category) ?? [];
    category.push(q);
    byCategory.set(q.category, category);
  }

  const categories = Array.from(byCategory.entries(), ([category, list]) => ({
    name: category,
    questions: list,
  }));

  categories.sort(() => rng() - 0.5);

  for (const category of categories) {
    category.questions.sort(() => rng() - 0.5);
  }

  return categories;
};

export const getQuestionMap = (questions: Array<QuestionDefinition>) =>
  new Map(
    questions.map((q) => [
      q.id,
      {
        title: q.title,
        description: q.description,
        category: q.category,
        prompts: q.prompts,
      },
    ]),
  );

export const filterNsfwQuestions = (questions: Array<QuestionDefinition>, showNsfw: boolean) => {
  if (showNsfw) {
    return questions;
  }

  // If the NSFW flag is omitted, we should assume that the question is *not*
  // NSFW, to avoid breaking existing question lists.
  return questions.filter((q) => q.nsfw === undefined || !q.nsfw);
};

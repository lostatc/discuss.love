import { StatusError } from "itty-router";
import {
  SharingCode,
  FormSubmission,
  Player,
  FormAnswers,
  SessionInfo,
  QuestionAnswer,
} from "./api";

// No ambiguous characters: 0, o, l, 1
const sharingCodePool = "abcdefghijkmnpqrstuvwxyz23456789";
const sharingCodeLength = 8;

const newSharingCode = (): string => {
  let sharingCode = "";

  for (let i = 0; i < sharingCodeLength; i++) {
    const randomNum = Math.floor(Math.random() * sharingCodePool.length);
    sharingCode += sharingCodePool[randomNum];
  }

  return sharingCode;
};

// Auto-delete sessions and submissions after 7 days.
const sessionTtl = 60 * 60 * 24 * 7;
const submissionTtl = 60 * 60 * 24 * 7;
const questionsTtl = 60 * 60 * 24 * 7;

const sessionKey = (code: SharingCode): string => `sessions:${code}`;
const submissionKey = (code: SharingCode, player: Player): string =>
  `submissions:${code}:${player}`;
const questionsKey = (checksum: string): string => `questions:${checksum}`;

export const startSession = async (kv: KVNamespace, info: SessionInfo): Promise<SharingCode> => {
  const sharingCode = newSharingCode();

  console.log(`Creating new session with sharing code '${sharingCode}'.`);

  await kv.put(sessionKey(sharingCode), JSON.stringify(info), { expirationTtl: sessionTtl });

  return sharingCode;
};

export const deleteSession = async (kv: KVNamespace, code: SharingCode): Promise<void> => {
  await kv.delete(sessionKey(code));
};

export const getSessionInfo = async (kv: KVNamespace, code: SharingCode): Promise<SessionInfo> => {
  const info = await kv.get(sessionKey(code));

  if (info === null) {
    throw new StatusError(404, `Session with sharing code '${code}' does not exist.`);
  }

  return JSON.parse(info);
};

export const submitForm = async (
  kv: KVNamespace,
  code: SharingCode,
  player: Player,
  form: FormSubmission,
): Promise<void> => {
  if ((await kv.get(sessionKey(code))) === null) {
    throw new StatusError(404, `Session with sharing code '${code}' does not exist.`);
  }

  if (player !== "sender" && player !== "recipient") {
    throw new StatusError(400, "Player must be either 'sender' or 'recipient'.");
  }

  await kv.put(submissionKey(code, player), JSON.stringify(form), { expirationTtl: submissionTtl });
};

export const deleteSubmission = async (kv: KVNamespace, code: SharingCode): Promise<void> => {
  await Promise.all([
    kv.delete(submissionKey(code, "sender")),
    kv.delete(submissionKey(code, "recipient")),
  ]);
};

const answersByQuestion = (submission: FormSubmission): Map<string, QuestionAnswer> =>
  new Map(submission.map(({ id, answer, notes }) => [id, { answer, notes }]));

const coalesceAnswers = (sender: FormSubmission, recipient: FormSubmission): FormAnswers => {
  const senderAnswers = answersByQuestion(sender);
  const recipientAnswers = answersByQuestion(recipient);

  const answers: FormAnswers = [];

  for (const [id, senderAnswer] of senderAnswers) {
    const recipientAnswer = recipientAnswers.get(id);
    if (recipientAnswer === undefined) {
      throw new StatusError(400, `Recipient did not submit an answer to question with ID '${id}'.`);
    }

    if (!senderAnswer.answer || !recipientAnswer.answer) {
      // Someone didn't answer this question.
      answers.push({ id, sender: undefined, recipient: undefined });
    } else if (senderAnswer.answer === "no" || recipientAnswer.answer === "no") {
      // Someone answered "No" to this question. In this case, we return "no"
      // for both players in the API response. No cheating by inspecting the API
      // response!
      //
      // Additionally, we don't return any notes. Players don't see notes when
      // someone answers "No."
      answers.push({
        id,
        sender: { answer: "no", notes: "" },
        recipient: { answer: "no", notes: "" },
      });
    } else {
      answers.push({ id, sender: senderAnswer, recipient: recipientAnswer });
    }
  }

  return answers;
};

export const getAnswers = async (
  kv: KVNamespace,
  code: SharingCode,
): Promise<FormAnswers | undefined> => {
  const senderSubmission = await kv.get(submissionKey(code, "sender"));
  const recipientSubmission = await kv.get(submissionKey(code, "recipient"));

  if (senderSubmission === null || recipientSubmission === null) {
    return undefined;
  }

  return coalesceAnswers(JSON.parse(senderSubmission), JSON.parse(recipientSubmission));
};

export const uploadQuestions = async (
  kv: KVNamespace,
  checksum: string,
  questions: string,
): Promise<void> => {
  await kv.put(questionsKey(checksum), questions, { expirationTtl: questionsTtl });
};

export const getQuestions = async (
  kv: KVNamespace,
  checksum: string,
): Promise<string | undefined> => (await kv.get(questionsKey(checksum))) ?? undefined;

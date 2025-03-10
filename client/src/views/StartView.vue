<script setup lang="ts">
import { ref } from "vue";
import { sessionsEndpoint, questionsEndpoint } from "@/api";
import TextInput from "@/components/TextInput.vue";
import Button from "primevue/button";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { DEFAULT_QUESTION_LIST, getQuestions, isBuiltinQuestionList } from "@/questions";
import { ERROR_TOAST_TTL, storeKey } from "@/vars";

const router = useRouter();
const route = useRoute();
const toast = useToast();

const questionList = ref<string>((route.query.q as string) ?? DEFAULT_QUESTION_LIST);
const names = ref({ sender: "", recipient: "" });
const validationErrors = ref({ sender: "", recipient: "" });

const questionsChecksum = ref<string>();

const startSession = async () => {
  if (!names.value.sender) {
    validationErrors.value.sender = "Please enter your name.";
  }

  if (!names.value.recipient) {
    validationErrors.value.recipient = "Please enter their name.";
  }

  if (!names.value.sender || !names.value.recipient) {
    return;
  }

  if (isBuiltinQuestionList(questionList.value)) {
    // If the user hasn't uploaded custom questions, we'll upload whichever
    // default question list they chose. We could get away with *not* uploading
    // the default questions, since the client always has access to them.
    // However, uploading them ensures existing sessions don't break if the
    // default questions are updated.
    const response = await fetch(questionsEndpoint(), {
      method: "POST",
      body: JSON.stringify(getQuestions(questionList.value)),
    });

    if (response.status !== 201) {
      const { error } = await response.json();

      toast.add({ severity: "error", summary: "Error", detail: error, life: ERROR_TOAST_TTL });

      return;
    }

    const { checksum } = await response.json();
    questionsChecksum.value = checksum;
  } else {
    questionsChecksum.value = questionList.value;
  }

  const response = await fetch(sessionsEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      players: {
        sender: names.value.sender,
        recipient: names.value.recipient,
      },
      nsfw: localStorage.getItem(storeKey.nsfw) === "true",
      questions: questionsChecksum.value,
    }),
  });

  if (response.status !== 201) {
    const { error } = await response.json();

    toast.add({ severity: "error", summary: "Error", detail: error, life: ERROR_TOAST_TTL });

    return;
  }

  const { code } = await response.json();

  // When a user starts a session, the sharing code is stored in their local
  // storage so we can differentiate the sender from the recipient.
  localStorage.setItem(storeKey.code, code);

  await router.push({ path: "/join", query: { code } });
};
</script>

<template>
  <main aria-labelledby="main-heading">
    <h1 id="main-heading" class="text-center mb-8">Start a new discussion</h1>
    <div class="flex flex-wrap gap-10 justify-around">
      <form
        class="flex flex-col items-start basis-1/4 gap-4"
        aria-labelledby="main-heading"
        :model="names"
      >
        <TextInput
          id="name-input-sender"
          label="Your name"
          v-model="names.sender"
          :error-message="validationErrors.sender"
          required
        />
        <TextInput
          id="name-input-recipient"
          label="Their name"
          v-model="names.recipient"
          :error-message="validationErrors.recipient"
          required
        />
        <div>
          <p class="text-muted">
            You don't need to use your real names, but make sure you both know who's who!
          </p>
          <p v-if="questionList === 'relationship'" class="text-muted mb-0">
            You're using the <strong>Relationship</strong> question list.
          </p>
          <p v-else-if="questionList === 'scene'" class="text-muted mb-0">
            You're using the <strong>Scene</strong> question list.
          </p>
          <p v-else class="text-muted mb-0">
            You're using a <strong>Custom</strong> question list.
          </p>
        </div>
        <span class="flex gap-4 items-baseline" data-umami-event="Start discussion">
          <Button @click="startSession" label="Start" />
        </span>
      </form>
      <aside class="text-justify sm:basis-1/2">
        <ul>
          <li>
            <p>You won't be able to see each other's answers until you're both done answering.</p>
          </li>
          <li>
            <p>
              If one of you selects "No" to a particular question, you won't see how the other
              person responded. Don't be afraid to say yes to something just because you're worried
              the other person will say no!
            </p>
          </li>
          <li>
            <p>
              If you want to change your answers, you'll both have the opportunity to go back and
              make changes before you can compare answers again.
            </p>
          </li>
          <li>
            <p>
              The purpose of this tool is to start a discussion, not to replace one! Once you
              compare answers, take the time to ask each other clarifying questions.
            </p>
          </li>
          <li>
            <p>
              Are you polyamorous? Do this exercise separately with each of your partners. Every
              relationship is unique, so your answers may differ depending on the person.
            </p>
          </li>
          <li>
            <p>
              You can delete your data from this website at any time. It will auto-delete after 7
              days.
            </p>
          </li>
        </ul>
      </aside>
    </div>
  </main>
</template>

<style scoped></style>

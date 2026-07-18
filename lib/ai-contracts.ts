export type ProfileDraft = {
  alias: string;
  pronouns: string;
  communicationModes: string[];
  yesMethod: string;
  noMethod: string;
  helpMethod: string;
  breakMethod: string;
  finishMethod: string;
  receptiveLanguage: string;
  representation: string;
  accessMethod: string;
  homeLanguage: string;
  instructionMode: string;
  waitTime: string;
  interests: string[];
  sensoryNotes: string;
  effectiveSupports: string[];
  observedPatterns: string[];
  supportConsiderations: string[];
  easierContexts: string[];
  harderContexts: string[];
  emergencyMessages: string[];
  unknowns: string[];
};

export type ProfileAssistantResponse = {
  reply: string;
  draft: ProfileDraft;
  completeEnoughToReview: boolean;
};

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ActivityAiResult = {
  title: string;
  summary: string;
  activityKey: string;
  barriers: Array<{
    title: string;
    reason: string;
    support: string;
  }>;
  supports: Array<{
    title: string;
    detail: string;
    why: string;
    color: "teal" | "indigo" | "blue" | "coral" | "amber";
  }>;
  activityVocabularyIds: string[];
  steps: Array<{ label: string; vocabularyIds: string[] }>;
};

export const emptyProfileDraft: ProfileDraft = {
  alias: "",
  pronouns: "",
  communicationModes: [],
  yesMethod: "",
  noMethod: "",
  helpMethod: "",
  breakMethod: "",
  finishMethod: "",
  receptiveLanguage: "",
  representation: "",
  accessMethod: "",
  homeLanguage: "",
  instructionMode: "",
  waitTime: "",
  interests: [],
  sensoryNotes: "",
  effectiveSupports: [],
  observedPatterns: [],
  supportConsiderations: [],
  easierContexts: [],
  harderContexts: [],
  emergencyMessages: [],
  unknowns: [],
};

export const profileDraftSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    draft: {
      type: "object",
      properties: {
        alias: { type: "string" },
        pronouns: { type: "string" },
        communicationModes: {
          type: "array",
          items: { type: "string" },
        },
        yesMethod: { type: "string" },
        noMethod: { type: "string" },
        helpMethod: { type: "string" },
        breakMethod: { type: "string" },
        finishMethod: { type: "string" },
        receptiveLanguage: { type: "string" },
        representation: { type: "string" },
        accessMethod: { type: "string" },
        homeLanguage: { type: "string" },
        instructionMode: { type: "string" },
        waitTime: { type: "string" },
        interests: { type: "array", items: { type: "string" } },
        sensoryNotes: { type: "string" },
        effectiveSupports: { type: "array", items: { type: "string" } },
        observedPatterns: { type: "array", items: { type: "string" } },
        supportConsiderations: {
          type: "array",
          items: { type: "string" },
        },
        easierContexts: { type: "array", items: { type: "string" } },
        harderContexts: { type: "array", items: { type: "string" } },
        emergencyMessages: { type: "array", items: { type: "string" } },
        unknowns: { type: "array", items: { type: "string" } },
      },
      required: [
        "alias",
        "pronouns",
        "communicationModes",
        "yesMethod",
        "noMethod",
        "helpMethod",
        "breakMethod",
        "finishMethod",
        "receptiveLanguage",
        "representation",
        "accessMethod",
        "homeLanguage",
        "instructionMode",
        "waitTime",
        "interests",
        "sensoryNotes",
        "effectiveSupports",
        "observedPatterns",
        "supportConsiderations",
        "easierContexts",
        "harderContexts",
        "emergencyMessages",
        "unknowns",
      ],
      additionalProperties: false,
    },
    completeEnoughToReview: { type: "boolean" },
  },
  required: ["reply", "draft", "completeEnoughToReview"],
  additionalProperties: false,
} as const;

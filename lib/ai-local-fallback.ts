import { vocabulary } from "@/lib/demo-data";
import type {
  ActivityAiResult,
  ProfileDraft,
} from "@/lib/ai-contracts";

type ActivityProfile = {
  firstName?: string;
  instructionMode?: string;
  representation?: string;
  sensoryNotes?: string;
  effectiveSupports?: string[];
};

const sentenceWords = (value: string) =>
  value.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];

function activityKeyFor(text: string) {
  if (/fruit|salad|banana|apple|food|cook/i.test(text)) return "fruit-salad";
  if (/science|experiment|lab/i.test(text)) return "science";
  if (/read|book|story/i.test(text)) return "reading";
  if (/music|song|sing|instrument/i.test(text)) return "music";
  if (/playground|recess|outside/i.test(text)) return "playground";
  if (/paint|draw|craft|art/i.test(text)) return "art";
  if (/morning|meeting|circle/i.test(text)) return "morning-meeting";
  if (/check.?in|arrival|field trip/i.test(text)) return "check-in";
  return "classroom";
}

function titleFor(text: string) {
  const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? "";
  const withoutLead = firstSentence
    .replace(/^(?:we (?:will|'ll)|students? (?:will|'ll)|the class will)\s+/i, "")
    .replace(/^(?:make|create|do|practice|work on)\s+/i, "");
  const words = withoutLead.split(/\s+/).filter(Boolean).slice(0, 6);
  const candidate =
    words.join(" ").replace(/[,:;.!?]+$/, "") || "Classroom activity";
  return candidate.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function vocabularyIdsFor(text: string) {
  const words = new Set(sentenceWords(text));
  const aliases = new Map([
    ["turn", "my-turn"],
    ["turns", "my-turn"],
    ["add", "put"],
    ["pause", "break"],
    ["bathroom", "toilet"],
  ]);
  const ids = vocabulary
    .filter(
      (item) =>
        words.has(item.id) ||
        words.has(item.label.toLowerCase()) ||
        [...aliases].some(
          ([word, id]) => words.has(word) && item.id === id,
        ),
    )
    .map((item) => item.id);
  return [...new Set(ids)];
}

function activitySteps(text: string) {
  const fragments = text
    .split(/[.;]|\bthen\b|\band then\b/i)
    .map((item) =>
      item
        .trim()
        .replace(/^(?:we|students?|they|the class)\s+(?:will\s+)?/i, ""),
    )
    .filter((item) => item.length > 3)
    .slice(0, 8);
  const steps =
    fragments.length >= 2
      ? fragments
      : [
          `Get ready for ${titleFor(text).toLowerCase()}`,
          fragments[0] || text.trim(),
          "Finish and clean up",
        ];
  return steps.map((label) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    vocabularyIds: vocabularyIdsFor(label),
  }));
}

export function localActivityDraft({
  activity,
  profiles,
}: {
  activity: string;
  profiles: unknown[];
}): ActivityAiResult {
  const learnerProfiles = profiles.filter(
    (profile): profile is ActivityProfile =>
      Boolean(profile && typeof profile === "object"),
  );
  const reportedSupports = [
    ...new Set(
      learnerProfiles.flatMap((profile) =>
        Array.isArray(profile.effectiveSupports)
          ? profile.effectiveSupports.filter(
              (support): support is string => typeof support === "string",
            )
          : [],
      ),
    ),
  ];
  const sensoryNotes = learnerProfiles
    .map((profile) => profile.sensoryNotes)
    .filter((note): note is string => Boolean(note));
  const steps = activitySteps(activity);
  const contextualVocabulary = [
    ...new Set([
      ...vocabularyIdsFor(activity),
      ...steps.flatMap((step) => step.vocabularyIds),
    ]),
  ];
  const supportDetails = [
    ...(reportedSupports.length
      ? reportedSupports
      : ["Preview the activity and present one clear step at a time."]),
    ...(sensoryNotes.length
      ? ["Use the documented sensory and environmental supports."]
      : []),
    "Keep HELP, STOP, NO, BREAK, PAIN, and BATHROOM immediately available.",
  ].slice(0, 6);

  return {
    title: titleFor(activity),
    summary: activity.trim(),
    activityKey: activityKeyFor(activity),
    barriers: [
      {
        title: "Multi-step activity",
        reason:
          "The activity includes several actions, materials, or transitions that need to be made clear.",
        support:
          "Preview the sequence, show one step at a time, and allow the documented response time.",
      },
    ],
    supports: supportDetails.map((detail, index) => ({
      title:
        index === supportDetails.length - 1
          ? "Communication access"
          : `Documented support ${index + 1}`,
      detail,
      why:
        index < reportedSupports.length
          ? "This support is taken directly from a selected learner profile."
          : "This preserves communication and participation throughout the activity.",
      color: (["teal", "indigo", "blue", "coral", "amber"] as const)[
        index % 5
      ],
    })),
    activityVocabularyIds: (
      contextualVocabulary.length ? contextualVocabulary : ["go"]
    ).slice(0, 18),
    steps: steps.map((step) => ({
      ...step,
      vocabularyIds: step.vocabularyIds.length
        ? step.vocabularyIds
        : ["go"],
    })),
  };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function extractListAfter(text: string, pattern: RegExp) {
  const match = text.match(pattern)?.[1];
  if (!match) return [];
  return match
    .split(/,|\band\b|\by\b/i)
    .map((item) => item.trim().replace(/[.!]$/, ""))
    .filter((item) => item.length > 1);
}

export function locallyEnrichProfileDraft({
  previous,
  message,
  previousQuestion,
}: {
  previous: ProfileDraft;
  message: string;
  previousQuestion: string;
}) {
  const draft: ProfileDraft = Object.fromEntries(
    Object.entries(previous).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  ) as ProfileDraft;
  const lower = message.toLowerCase();
  const alias =
    message.match(
      /(?:her|his|their|the student(?:'s)?|student|learner)?\s*(?:name|alias)\s+(?:is|:)\s+([a-z][a-z'-]{1,30})/i,
    )?.[1] ??
    (/^(?:[a-z][a-z'-]{1,30})$/i.test(message.trim()) &&
    /alias|name|nombre/i.test(previousQuestion)
      ? message.trim()
      : "");
  if (alias) draft.alias = alias.charAt(0).toUpperCase() + alias.slice(1);

  if (/does not use speech|doesn't use speech|non[- ]?speaking/i.test(lower)) {
    draft.communicationModes = unique([
      ...draft.communicationModes,
      "does not use speech consistently",
    ]);
  }
  if (/point|reach|lead(?:s|ing)? (?:an )?adult|gesture|head nod/i.test(lower)) {
    draft.communicationModes = unique([
      ...draft.communicationModes,
      ...[
        /point/i.test(lower) ? "pointing" : "",
        /reach/i.test(lower) ? "reaching" : "",
        /lead(?:s|ing)? (?:an )?adult/i.test(lower)
          ? "leading an adult"
          : "",
        /gesture/i.test(lower) ? "gestures" : "",
      ],
    ]);
  }
  if (/nod(?:s|ding)?.{0,20}(?:yes|agreement)|(?:yes|agreement).{0,20}nod/i.test(lower)) {
    draft.yesMethod = "Nods to indicate yes or agreement.";
  }
  if (/push(?:es|ing)? (?:the )?(?:item|material|object)s? away|cr(?:y|ies|ying)/i.test(lower)) {
    const observed =
      "Pushes materials away or cries when rejecting or stopping.";
    if (/no|reject|stop|parar|rechaz/i.test(lower)) draft.noMethod = observed;
    draft.observedPatterns = unique([...draft.observedPatterns, observed]);
  }
  if (
    /(?:does not|doesn't|never|not usually).{0,30}(?:ask|signal).{0,15}help/i.test(
      lower,
    )
  ) {
    draft.helpMethod =
      "No reliable independent help signal documented; adults infer the need from context.";
  } else if (
    /help/i.test(previousQuestion) &&
    /cr(?:y|ies|ying)|llor/i.test(lower)
  ) {
    draft.helpMethod =
      "Cries during a difficult activity when help may be needed.";
  }
  if (/break|pause|descanso|pausa/i.test(previousQuestion)) {
    if (/^(?:no|not usually|never|none)\b/i.test(message.trim())) {
      draft.breakMethod = "No reliable independent break signal documented.";
    } else if (/cr(?:y|ies|ying)|llor/i.test(lower)) {
      draft.breakMethod = "Cries when a break or pause may be needed.";
    }
  }
  if (/finish|finished|transition|termin/i.test(previousQuestion)) {
    draft.finishMethod = /^(?:no|not usually|never|none)\b/i.test(
      message.trim(),
    )
      ? "No reliable independent finished or transition signal documented."
      : message.trim();
  }
  if (/photo|picture|fotograf|foto/i.test(lower)) {
    draft.representation = "familiar photos";
    draft.receptiveLanguage =
      /instruction|step|direction|instrucci|paso/i.test(lower)
        ? "Understands familiar one-step instructions when supported with photos."
        : draft.receptiveLanguage;
  } else if (/picto|symbol|símbolo/i.test(lower)) {
    draft.representation = "pictograms and symbols";
  }
  if (/one step|one-step|un paso/i.test(lower)) {
    draft.instructionMode = "one step at a time";
  }
  if (/extra processing time|extra time|wait time|más tiempo/i.test(lower)) {
    draft.waitTime = "extra processing and response time";
  }
  if (/point|reach|direct touch|eye gaze|switch|keyboard/i.test(lower)) {
    draft.accessMethod = /point/i.test(lower)
      ? "direct pointing"
      : /reach/i.test(lower)
        ? "direct reaching"
        : draft.accessMethod || message.trim();
  }

  const interests = extractListAfter(
    message.replace(
      /,\s*(?:understands?|needs?|requires?|does not|doesn't|and does not)\b[\s\S]*/i,
      "",
    ),
    /(?:enjoys?|likes?|interests? (?:include|are)|le gusta[n]?)\s+([^.!]+)/i,
  );
  draft.interests = unique([...draft.interests, ...interests]);

  const supports: string[] = [];
  if (/quiet|calm|low noise|less noise|silencio|tranquil/i.test(lower)) {
    supports.push("Use a calm, quiet environment.");
    draft.sensoryNotes = "Does better in calm, quiet environments.";
  }
  if (/one step|one-step|un paso/i.test(lower)) {
    supports.push("Present one instruction at a time.");
  }
  if (/extra processing time|extra time|wait time|más tiempo/i.test(lower)) {
    supports.push("Provide extra processing and response time.");
  }
  if (/two (?:items|materials|choices)|dos (?:objetos|materiales|opciones)/i.test(lower)) {
    supports.push("Offer only two materials or choices at a time.");
  }
  if (/does better|works well|benefits|went (?:especially )?well|salió bien/i.test(lower)) {
    draft.effectiveSupports = unique([
      ...draft.effectiveSupports,
      ...supports,
    ]);
  }
  if (/noisy|crowded|loud|ruidos|multitud/i.test(lower)) {
    draft.harderContexts = unique([
      ...draft.harderContexts,
      message.trim(),
    ]);
  }
  if (/calm|quiet|went (?:especially )?well|salió bien/i.test(lower)) {
    draft.easierContexts = unique([
      ...draft.easierContexts,
      message.trim(),
    ]);
  }
  if (/home language|language.*home|idioma.*casa/i.test(previousQuestion)) {
    draft.homeLanguage = message.trim();
  }
  if (/safety|emergency|urgent|seguridad|emergencia/i.test(previousQuestion)) {
    draft.emergencyMessages = unique([
      ...draft.emergencyMessages,
      message.trim(),
    ]);
  }
  return draft;
}

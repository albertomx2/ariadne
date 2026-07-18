import { NextResponse } from "next/server";
import { vocabulary } from "@/lib/demo-data";
import { ollamaChat } from "@/lib/ollama";

export const dynamic = "force-dynamic";

const activitySchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    activityKey: {
      type: "string",
      enum: [
        "classroom",
        "fruit-salad",
        "science",
        "reading",
        "morning-meeting",
        "music",
        "playground",
        "art",
        "check-in",
      ],
    },
    barriers: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          support: { type: "string" },
        },
        required: ["title", "reason", "support"],
        additionalProperties: false,
      },
    },
    supports: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          why: { type: "string" },
          color: {
            type: "string",
            enum: ["teal", "indigo", "blue", "coral", "amber"],
          },
        },
        required: ["title", "detail", "why", "color"],
        additionalProperties: false,
      },
    },
    activityVocabularyIds: {
      type: "array",
      minItems: 1,
      maxItems: 18,
      items: { type: "string" },
    },
    steps: {
      type: "array",
      minItems: 2,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          vocabularyIds: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["label", "vocabularyIds"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "title",
    "summary",
    "activityKey",
    "barriers",
    "supports",
    "activityVocabularyIds",
    "steps",
  ],
  additionalProperties: false,
} as const;

const ACTIVITY_SYSTEM = `You are Ariadne Activity Planner, a U.S. classroom AAC
and accessibility assistant. Turn an educator's activity into an editable
support draft grounded only in the supplied learner profiles.

Rules:
- Presume competence and never diagnose, score, or predict behavior.
- Describe possible access demands, not deficits in a learner.
- Barrier reasons must paraphrase only supplied activity or profile facts.
  Never say a learner may struggle, become overwhelmed, feel anxiety, startle,
  or have cognitive processing needs unless that exact observation was supplied.
- Always preserve access to core vocabulary, help, stop, no, break, pain,
  bathroom, and a trusted adult.
- Concrete activity vocabulary may use familiar photographs; abstract/core
  language should use the learner's stable reviewed symbol or text system.
- Match instruction length, grid, representation, language, motor/access,
  sensory notes, and effective supports from each profile.
- Use separate concepts for every visual step. "Cut the banana" must have
  vocabularyIds ["cut", "banana"], never one combined image.
- Keep steps concrete, short, safe, and in actual activity order.
- Give the activity a short 2-6 word title, not the full educator description.
- Include at least one possible access demand in barriers.
- Choose activityVocabularyIds for the contextual Activity board. Include only
  words useful across this specific activity. The app adds stable MORE,
  DIFFERENT, FINISHED, BREAK, NO, HELP, and STOP separately.
- vocabularyIds are lowercase individual concepts, not phrases. Include both
  the key action and key object when they are stated in the step.
- Do not suggest changing permanent core positions or an AAC system without
  SLP/AAC team review.
- Return concise American English and only the required structured JSON.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      activity?: string;
      context?: string;
      durationMinutes?: number;
      profiles?: unknown[];
    };
    if (!body.activity?.trim() || !body.profiles?.length) {
      return NextResponse.json(
        { error: "Activity and at least one profile are required." },
        { status: 400 },
      );
    }
    const activityText = body.activity.trim();
    const content = await ollamaChat({
      format: activitySchema,
      messages: [
        { role: "system", content: ACTIVITY_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            activity: activityText,
            context: body.context ?? "",
            durationMinutes: body.durationMinutes ?? 45,
            learnerProfiles: body.profiles,
          }),
        },
      ],
    });
    const result = JSON.parse(content) as {
      title?: unknown;
      summary?: unknown;
      activityKey?: unknown;
      barriers?: unknown;
      supports?: unknown;
      activityVocabularyIds?: unknown;
      steps?: unknown;
    };
    if (
      typeof result.title !== "string" ||
      !Array.isArray(result.supports) ||
      !Array.isArray(result.steps)
    ) {
      throw new Error("The local model returned an invalid activity draft.");
    }
    const knownVocabulary = new Map(
      vocabulary.map((item) => [item.id.toLowerCase(), item.id]),
    );
    const steps = (
      result.steps as Array<{ label?: unknown; vocabularyIds?: unknown }>
    ).map((step) => {
      const label = typeof step.label === "string" ? step.label : "";
      const labelWords = new Set(
        label.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [],
      );
      const modelIds = Array.isArray(step.vocabularyIds)
        ? step.vocabularyIds.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      const explicitKnown = vocabulary
        .filter((item) => labelWords.has(item.label.toLowerCase()))
        .map((item) => item.id);
      const conceptAliases = [
        ...(labelWords.has("turn") || labelWords.has("turns")
          ? ["my-turn"]
          : []),
        ...(labelWords.has("add") ? ["put"] : []),
        ...(labelWords.has("ingredients") &&
        activityText.toLowerCase().includes("fruit")
          ? ["fruit"]
          : []),
      ];
      return {
        label,
        vocabularyIds: [
          ...new Set([
            ...modelIds.map((item) => item.toLowerCase().trim()),
            ...explicitKnown,
            ...conceptAliases,
          ]),
        ].filter((item) => knownVocabulary.has(item)),
      };
    });
    const unsupportedInference =
      /struggl|overwhelm|anxi|cognitive processing|startl/i;
    const barriers = (
      (result.barriers as Array<{
        title?: unknown;
        reason?: unknown;
        support?: unknown;
      }>) ?? []
    ).map((barrier) => ({
      title:
        typeof barrier.title === "string" &&
        !unsupportedInference.test(barrier.title)
          ? barrier.title
          : "Possible access demand",
      reason:
        typeof barrier.reason === "string" &&
        !unsupportedInference.test(barrier.reason)
          ? barrier.reason
          : "This activity includes an access demand connected to the supplied profile notes.",
      support:
        typeof barrier.support === "string"
          ? barrier.support
          : "Use the documented learner support and keep help, stop, and break available.",
    }));
    const supports = (
      result.supports as Array<{
        title?: unknown;
        detail?: unknown;
        why?: unknown;
        color?: unknown;
      }>
    ).map((support) => ({
      ...support,
      detail:
        typeof support.detail === "string" &&
        !unsupportedInference.test(support.detail)
          ? support.detail
          : "Use this documented profile support during the activity.",
      why:
        typeof support.why === "string" &&
        !unsupportedInference.test(support.why)
          ? support.why
          : "This matches a documented profile support for this activity.",
    }));
    const requestedActivityVocabulary = Array.isArray(
      result.activityVocabularyIds,
    )
      ? result.activityVocabularyIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    const activityVocabularyIds = [
      ...new Set([
        ...requestedActivityVocabulary.map((item) =>
          item.toLowerCase().trim().replaceAll(/\s+/g, "-"),
        ),
        ...steps.flatMap((step) => step.vocabularyIds),
      ]),
    ].filter((item) => knownVocabulary.has(item));
    return NextResponse.json({
      ...result,
      summary:
        typeof result.summary === "string" && result.summary.trim()
          ? result.summary
          : activityText,
      barriers,
      supports,
      activityVocabularyIds,
      steps,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The local AI service could not respond.",
      },
      { status: 503 },
    );
  }
}

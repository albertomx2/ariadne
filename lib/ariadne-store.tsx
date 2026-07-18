"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { students, vocabulary } from "@/lib/demo-data";
import type {
  Activity,
  Material,
  Student,
  SupportStatus,
} from "@/types/domain";
import type { User } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

export type RepresentationMode =
  | "symbols-text"
  | "symbols-only"
  | "photos-text"
  | "photos-only"
  // Legacy persisted values are normalized when the store loads.
  | "photos-symbols"
  | "text-speech";

export function normalizeRepresentationMode(
  mode: RepresentationMode,
): Exclude<RepresentationMode, "photos-symbols" | "text-speech"> {
  if (mode === "photos-symbols") return "photos-text";
  if (mode === "text-speech") return "symbols-text";
  return mode;
}

export function representationUsesPhotos(mode: RepresentationMode) {
  const normalized = normalizeRepresentationMode(mode);
  return normalized === "photos-text" || normalized === "photos-only";
}

export function representationShowsText(mode: RepresentationMode) {
  const normalized = normalizeRepresentationMode(mode);
  return normalized === "photos-text" || normalized === "symbols-text";
}

export function representationLabel(mode: RepresentationMode) {
  const normalized = normalizeRepresentationMode(mode);
  const labels: Record<typeof normalized, string> = {
    "symbols-text": "Symbols with text",
    "symbols-only": "Symbols without text",
    "photos-text": "Photos with text",
    "photos-only": "Photos without text",
  };
  return labels[normalized];
}

export type SpeechVoice = "system";

export type BoardCategory = {
  id: string;
  label: string;
  color: string;
  order: number;
};

export type StudentBoardItem = {
  id: string;
  label: string;
  categoryId: string;
  kind: "core" | "fringe" | "safety";
  order: number;
  visualType: "inherit" | "symbol" | "photo" | "text";
  arasaacId?: number;
  photoUrl?: string;
  photoSourceUrl?: string;
  attribution?: string;
  hidden?: boolean;
};

export type StudentProfile = Student & {
  grade: string;
  classGroup: string;
  homeLanguage: string;
  representation: RepresentationMode;
  gridColumns: 2 | 3 | 4 | 5;
  gridRows: 3 | 4 | 5;
  cellScale: "compact" | "comfortable" | "large";
  textScale: "standard" | "large";
  speechEnabled: boolean;
  speechRate: number;
  speechVoice: SpeechVoice;
  predictionsEnabled: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  instructionMode: "one-step" | "short-sequence" | "full-sequence";
  interests: string[];
  sensoryNotes: string;
  yesMethod: string;
  noMethod: string;
  helpMethod: string;
  finishMethod: string;
  effectiveSupports: string[];
  profileNotes: string;
  emergencyMessages: string[];
  customPhotos: Record<string, string>;
  boardCategories: BoardCategory[];
  boardItems: StudentBoardItem[];
};

export type AriadneMaterial = Material & {
  archived: boolean;
  description: string;
  linkedActivityId?: string;
  activityDraft?: {
    title: string;
    date: string;
    time: string;
    durationMinutes: number;
    studentIds: string[];
    context: string;
    location: string;
    activityKey: string;
    activityVocabularyIds: string[];
    steps: ActivityStep[];
  };
};

export type AriadneActivity = Activity & {
  date: string;
  location: string;
  durationMinutes: number;
  studentIds: string[];
  activityKey: string;
  steps: ActivityStep[];
  activityVocabularyIds?: string[];
  changePrepared?: boolean;
};

export type ActivityStep = {
  id: string;
  label: string;
  vocabularyIds: string[];
};

export type Observation = {
  id: string;
  studentId: string;
  context: string;
  note: string;
  support: string;
  helpfulness: "helpful" | "partly-helpful" | "not-rated";
  observerRole:
    | "classroom-teacher"
    | "special-educator"
    | "slp"
    | "paraprofessional"
    | "family-reported";
  evidenceType:
    | "direct-observation"
    | "learner-selection"
    | "team-report";
  createdAt: string;
};

export type WorkspaceSettings = {
  schoolName: string;
  className: string;
  grade: string;
  educatorName: string;
  retentionDays: number;
  classCode: string;
  trustedDevices: boolean;
  visualPin: boolean;
  qrAccess: boolean;
  members: Array<{ id: string; name: string; role: string; email: string }>;
};

export type Session = {
  kind: "educator" | "student";
  name: string;
  provider: string;
} | null;

type AriadneState = {
  students: StudentProfile[];
  materials: AriadneMaterial[];
  activities: AriadneActivity[];
  observations: Observation[];
  activeStudentId: string;
  notificationsRead: boolean;
  settings: WorkspaceSettings;
  session: Session;
};

type Toast = { id: number; message: string } | null;

type AriadneContextValue = AriadneState & {
  hydrated: boolean;
  toast: Toast;
  showToast: (message: string) => void;
  accountAvailable: boolean;
  accountEmail: string | null;
  authenticateEducator: (
    action: "sign-in" | "create",
    email: string,
    password: string,
    educatorName?: string,
  ) => Promise<{ error?: string }>;
  signIn: (session: NonNullable<Session>) => void;
  signOut: () => void;
  setActiveStudent: (studentId: string) => void;
  addStudent: (student: StudentProfile) => void;
  updateStudent: (studentId: string, patch: Partial<StudentProfile>) => void;
  deleteStudent: (studentId: string) => void;
  addMaterial: (material: AriadneMaterial) => void;
  updateMaterial: (materialId: string, patch: Partial<AriadneMaterial>) => void;
  duplicateMaterial: (materialId: string) => void;
  deleteMaterial: (materialId: string) => void;
  addActivity: (activity: AriadneActivity) => void;
  updateActivity: (activityId: string, patch: Partial<AriadneActivity>) => void;
  deleteActivity: (activityId: string) => void;
  addObservation: (observation: Observation) => void;
  updateSettings: (patch: Partial<WorkspaceSettings>) => void;
  markNotificationsRead: (read?: boolean) => void;
  resetDemo: () => void;
  syncMode: "browser" | "supabase";
  lastSyncedAt: string | null;
};

const profileDefaults: Record<string, Partial<StudentProfile>> = {
  maya: {
    grade: "Grade 3",
    classGroup: "Room 14",
    homeLanguage: "English",
    representation: "photos-text",
    gridColumns: 4,
    gridRows: 3,
    cellScale: "comfortable",
    textScale: "large",
    speechEnabled: true,
    speechRate: 0.9,
    speechVoice: "system",
    predictionsEnabled: true,
    reduceMotion: true,
    highContrast: false,
    instructionMode: "one-step",
    interests: ["Cooking", "Music", "Animals"],
    sensoryNotes: "Preview loud equipment and keep break available.",
    yesMethod: "Selects yes or nods",
    noMethod: "Selects stop or moves an item away",
    helpMethod: "Uses the help symbol independently",
    finishMethod: "Selects finished with a visual model",
    effectiveSupports: [
      "Use one instruction at a time",
      "Pair spoken language with a visual",
      "Wait eight seconds before repeating",
      "Keep core words in the same position",
    ],
    profileNotes: "Offer choices without removing access to core vocabulary.",
    emergencyMessages: [
      "I need help",
      "I need a break",
      "It is too loud",
      "I am in pain",
      "Stop",
      "No",
      "Yes",
      "I need my teacher",
    ],
    customPhotos: {
      apple:
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Redapple.jpg?width=500",
      banana:
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Banana%20(1).jpg?width=500",
    },
  },
  leo: {
    grade: "Grade 3",
    classGroup: "Room 14",
    homeLanguage: "English / Spanish",
    representation: "photos-text",
    gridColumns: 3,
    gridRows: 3,
    cellScale: "large",
    textScale: "standard",
    speechEnabled: true,
    speechRate: 0.82,
    speechVoice: "system",
    predictionsEnabled: false,
    reduceMotion: true,
    highContrast: false,
    instructionMode: "one-step",
    interests: ["Trains", "Building", "Movement"],
    sensoryNotes: "Visible turn-taking and two choices reduce uncertainty.",
    yesMethod: "Points to a choice or says yes",
    noMethod: "Pushes away or selects no",
    helpMethod: "Looks toward a trusted adult and selects help",
    finishMethod: "Uses all done card",
    effectiveSupports: [
      "Show real photos before introducing a symbol",
      "Make turns visible",
      "Present two options at a time",
    ],
    profileNotes: "Use familiar photos in new settings.",
    emergencyMessages: [
      "I need help",
      "I need a break",
      "Stop",
      "No",
      "Yes",
      "I need my teacher",
    ],
    customPhotos: {
      apple:
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Redapple.jpg?width=500",
      banana:
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Banana%20(1).jpg?width=500",
    },
  },
  noah: {
    grade: "Grade 3",
    classGroup: "Room 14",
    homeLanguage: "English",
    representation: "symbols-text",
    gridColumns: 5,
    gridRows: 4,
    cellScale: "compact",
    textScale: "standard",
    speechEnabled: true,
    speechRate: 1,
    speechVoice: "system",
    predictionsEnabled: true,
    reduceMotion: false,
    highContrast: true,
    instructionMode: "short-sequence",
    interests: ["Books", "Space", "Word games"],
    sensoryNotes: "Preview transitions and show what stays the same.",
    yesMethod: "Says or types yes",
    noMethod: "Says or types no",
    helpMethod: "Types a help message",
    finishMethod: "Says finished",
    effectiveSupports: [
      "Provide a written transition preview",
      "Allow text entry and speech output",
      "Show a short sequence before starting",
    ],
    profileNotes: "Keep speech output available but never automatic.",
    emergencyMessages: [
      "I need help",
      "I need a break",
      "I am in pain",
      "Stop",
      "No",
      "Yes",
      "I need my teacher",
    ],
    customPhotos: {},
  },
};

const defaultBoardCategories: BoardCategory[] = [
  { id: "core", label: "Core", color: "#e5b651", order: 0 },
  { id: "people", label: "People", color: "#77a8cf", order: 1 },
  { id: "actions", label: "Actions", color: "#7eb7a8", order: 2 },
  { id: "feelings", label: "Feelings", color: "#d99a84", order: 3 },
  { id: "food", label: "Food", color: "#d7a477", order: 4 },
  { id: "school", label: "School", color: "#8586cf", order: 5 },
];

const defaultBoardItems: StudentBoardItem[] = vocabulary.map((item, index) => ({
  id: item.id,
  label: item.label,
  categoryId: item.category ?? (item.kind === "core" ? "core" : "school"),
  kind: item.kind,
  order: item.stablePosition ?? index,
  visualType: "inherit",
  arasaacId: item.arasaacId,
}));

function withDefaultBoard(student: StudentProfile): StudentProfile {
  const customPhotos = student.customPhotos ?? {};
  return {
    ...student,
    speechVoice: "system",
    boardCategories: student.boardCategories?.length
      ? student.boardCategories
      : defaultBoardCategories.map((category) => ({ ...category })),
    boardItems: (
      student.boardItems?.length ? student.boardItems : defaultBoardItems
    ).map((item) => ({
      ...item,
      photoUrl:
        item.photoUrl ??
        customPhotos[item.id] ??
        customPhotos[item.label.toLowerCase()],
    })),
  };
}

const initialStudents: StudentProfile[] = students.map((student) => {
  const profile = {
    ...student,
    ...(profileDefaults[student.id] as Omit<StudentProfile, keyof Student>),
  };
  return {
    ...profile,
    communicationMode: representationLabel(profile.representation),
    grid: `${profile.gridColumns} × ${profile.gridRows}`,
    symbolProvider:
      representationUsesPhotos(profile.representation) ? "custom" : "arasaac",
    boardCategories: defaultBoardCategories.map((category) => ({ ...category })),
    boardItems: defaultBoardItems.map((item) => ({ ...item })),
  };
});

const fruitSaladSteps: ActivityStep[] = [
  { id: "choose-fruit", label: "Choose the fruit.", vocabularyIds: ["choose", "fruit"] },
  { id: "cut-banana", label: "Cut the banana.", vocabularyIds: ["cut", "banana"] },
  {
    id: "fruit-in-bowl",
    label: "Put the fruit in the bowl.",
    vocabularyIds: ["put", "fruit", "bowl"],
  },
  { id: "mix-fruit", label: "Mix the fruit.", vocabularyIds: ["mix", "fruit"] },
  { id: "finished", label: "The fruit salad is ready.", vocabularyIds: ["finished"] },
];

const initialActivities: AriadneActivity[] = [
  {
    id: "field-trip-check-in",
    date: "2026-07-18",
    time: "03:00",
    durationMinutes: 90,
    title: "Overnight field trip check-in",
    students: ["Maya", "Leo"],
    studentIds: ["maya", "leo"],
    context: "Field trip cabin",
    location: "Field trip cabin",
    status: "ready",
    activityKey: "check-in",
    steps: [
      { id: "wake", label: "Wake up.", vocabularyIds: ["wake"] },
      { id: "check-in", label: "Check in with the teacher.", vocabularyIds: ["teacher", "help"] },
    ],
  },
  {
    id: "morning-meeting",
    date: "2026-07-18",
    time: "08:30",
    durationMinutes: 25,
    title: "Morning meeting",
    students: ["Maya", "Leo", "Noah"],
    studentIds: ["maya", "leo", "noah"],
    context: "Room 14",
    location: "Room 14",
    status: "ready",
    activityKey: "morning-meeting",
    steps: [
      { id: "sit-group", label: "Join the group.", vocabularyIds: ["go", "friend"] },
      { id: "choose-greeting", label: "Choose a greeting.", vocabularyIds: ["choose", "hello"] },
    ],
  },
  {
    id: "science",
    date: "2026-07-18",
    time: "10:00",
    durationMinutes: 45,
    title: "Group science experiment",
    students: ["Maya", "Leo"],
    studentIds: ["maya", "leo"],
    context: "Room 14",
    location: "Room 14",
    status: "needs-supports",
    activityKey: "science",
    steps: [
      { id: "choose-tool", label: "Choose a tool.", vocabularyIds: ["choose", "different"] },
      { id: "my-turn", label: "Take a turn.", vocabularyIds: ["my-turn"] },
      { id: "finished-science", label: "The experiment is finished.", vocabularyIds: ["finished"] },
    ],
  },
  {
    id: "reading",
    date: "2026-07-18",
    time: "11:15",
    durationMinutes: 35,
    title: "Shared reading circle",
    students: ["Noah"],
    studentIds: ["noah"],
    context: "Library corner",
    location: "Library corner",
    status: "ready",
    activityKey: "reading",
    steps: [
      { id: "choose-book", label: "Choose a book.", vocabularyIds: ["choose", "book"] },
      { id: "read-book", label: "Read the book.", vocabularyIds: ["read", "book"] },
    ],
  },
  {
    id: "fruit-salad",
    date: "2026-07-18",
    time: "12:10",
    durationMinutes: 45,
    title: "Make fruit salad",
    students: ["Maya", "Leo"],
    studentIds: ["maya", "leo"],
    context: "Classroom kitchen",
    location: "Classroom kitchen",
    status: "ready",
    activityKey: "fruit-salad",
    steps: fruitSaladSteps,
  },
  {
    id: "music-choice",
    date: "2026-07-17",
    time: "09:30",
    durationMinutes: 35,
    title: "Music choice group",
    students: ["Maya"],
    studentIds: ["maya"],
    context: "Music room",
    location: "Music room",
    status: "ready",
    activityKey: "music",
    steps: [
      { id: "choose-song", label: "Choose a song.", vocabularyIds: ["choose", "music"] },
      { id: "listen", label: "Listen to the music.", vocabularyIds: ["music", "like"] },
    ],
  },
  {
    id: "playground-group",
    date: "2026-07-19",
    time: "10:30",
    durationMinutes: 40,
    title: "Playground group",
    students: ["Leo", "Noah"],
    studentIds: ["leo", "noah"],
    context: "Playground",
    location: "Playground",
    status: "ready",
    activityKey: "playground",
    steps: [
      { id: "go-playground", label: "Go to the playground.", vocabularyIds: ["go", "play"] },
      { id: "choose-play", label: "Choose what to play.", vocabularyIds: ["choose", "play"] },
    ],
  },
  {
    id: "art-studio",
    date: "2026-07-20",
    time: "13:15",
    durationMinutes: 50,
    title: "Art studio",
    students: ["Maya", "Leo", "Noah"],
    studentIds: ["maya", "leo", "noah"],
    context: "Art room",
    location: "Art room",
    status: "ready",
    activityKey: "art",
    steps: [
      { id: "choose-color", label: "Choose a color.", vocabularyIds: ["choose", "different"] },
      { id: "make-art", label: "Make your art.", vocabularyIds: ["more", "finished"] },
    ],
  },
];

const initialState: AriadneState = {
  students: [],
  materials: [],
  activities: [],
  observations: [],
  activeStudentId: "",
  notificationsRead: false,
  settings: {
    schoolName: "Your school",
    className: "Classroom",
    grade: "Grade 3",
    educatorName: "Educator",
    retentionDays: 365,
    classCode: "142857",
    trustedDevices: true,
    visualPin: true,
    qrAccess: true,
    members: [],
  },
  session: null,
};

const STORAGE_KEY = "ariadne-workspace-state-v1";
const SYNC_CHANNEL = "ariadne-workspace-sync-v1";

function nextId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

const AriadneContext = createContext<AriadneContextValue | null>(null);

function normalizeState(saved?: Partial<AriadneState>): AriadneState {
  const savedStudents = saved?.students ?? initialState.students;
  const normalizedStudents = savedStudents.map((student) => {
    const defaults =
      initialStudents.find((item) => item.id === student.id) ?? initialStudents[0];
    const merged = withDefaultBoard({
      ...defaults,
      ...student,
      speechVoice: "system",
      emergencyMessages:
        student.emergencyMessages ?? defaults.emergencyMessages ?? [],
      customPhotos: {
        ...(defaults.customPhotos ?? {}),
        ...(student.customPhotos ?? {}),
      },
      boardCategories: student.boardCategories ?? [],
      boardItems: student.boardItems ?? [],
    } as StudentProfile);
    const representation = normalizeRepresentationMode(merged.representation);
    const communicationMode = representationLabel(representation);
    return {
      ...merged,
      representation,
      communicationMode,
      grid: `${merged.gridColumns} × ${merged.gridRows}`,
      symbolProvider:
        representationUsesPhotos(representation) ? "custom" : "arasaac",
    } as StudentProfile;
  });
  const savedActivities = (saved?.activities ?? []).filter(
    (activity) => activity.id !== "lunch",
  );
  const normalizedSavedActivities = savedActivities.map((activity) => {
    const seeded = initialActivities.find((item) => item.id === activity.id);
    const matchingStudentIds =
      activity.studentIds ??
      normalizedStudents
        .filter((student) => activity.students.includes(student.firstName))
        .map((student) => student.id);
    return {
      ...(seeded ?? initialActivities[0]),
      ...activity,
      durationMinutes: activity.durationMinutes ?? 45,
      studentIds: matchingStudentIds,
      activityKey: activity.activityKey ?? "classroom",
      steps: activity.steps ?? seeded?.steps ?? [],
    };
  });
  const mergedActivities = normalizedSavedActivities;
  const normalizedObservations = (
    saved?.observations ?? initialState.observations
  ).map((observation) => ({
    ...observation,
    observerRole: observation.observerRole ?? "classroom-teacher",
    evidenceType: observation.evidenceType ?? "direct-observation",
  }));

  return {
    ...initialState,
    ...saved,
    students: normalizedStudents,
    activities: mergedActivities,
    observations: normalizedObservations,
    settings: { ...initialState.settings, ...(saved?.settings ?? {}) },
  };
}

function metadataEducatorName(user: Pick<User, "user_metadata">) {
  const value = user.user_metadata?.educator_name;
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function withEducatorIdentity(
  settings: WorkspaceSettings,
  educatorName: string,
  email?: string | null,
): WorkspaceSettings {
  return {
    ...settings,
    educatorName,
    members: settings.members.map((member, index) =>
      member.id === "member-jordan" || index === 0
        ? {
            ...member,
            name: educatorName,
            email: email || member.email,
          }
        : member,
    ),
  };
}

export function AriadneProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AriadneState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [syncMode, setSyncMode] = useState<"browser" | "supabase">("browser");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const supabase = useMemo(() => createSupabaseClient(), []);
  const sourceId = useRef(nextId("browser"));
  const channelRef = useRef<BroadcastChannel | null>(null);
  const remoteChannelRef = useRef<ReturnType<
    NonNullable<typeof supabase>["channel"]
  > | null>(null);
  const workspaceIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const remoteWriteTimer = useRef<number | null>(null);
  const applyingRemote = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setState(normalizeState(JSON.parse(saved) as Partial<AriadneState>));
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (applyingRemote.current) {
        applyingRemote.current = false;
      } else {
        channelRef.current?.postMessage({
          sourceId: sourceId.current,
          state,
        });
        if (
          supabase &&
          syncMode === "supabase" &&
          workspaceIdRef.current &&
          userIdRef.current
        ) {
          if (remoteWriteTimer.current) {
            window.clearTimeout(remoteWriteTimer.current);
          }
          const snapshot = { ...state, session: null };
          remoteWriteTimer.current = window.setTimeout(async () => {
            const { error } = await supabase.from("workspace_snapshots").upsert(
              {
                organization_id: workspaceIdRef.current,
                state: snapshot,
                schema_version: 1,
                updated_by: userIdRef.current,
              },
              { onConflict: "organization_id" },
            );
            if (!error) {
              setLastSyncedAt(new Date().toISOString());
            }
          }, 450);
        }
      }
      const timer = window.setTimeout(
        () => setLastSyncedAt(new Date().toISOString()),
        0,
      );
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [hydrated, state, supabase, syncMode]);

  useEffect(() => {
    if (!hydrated || !supabase) return;
    const client = supabase;
    let cancelled = false;

    async function disconnectRemote() {
      workspaceIdRef.current = null;
      userIdRef.current = null;
      setSyncMode("browser");
      setAccountEmail(null);
      if (remoteChannelRef.current) {
        await client.removeChannel(remoteChannelRef.current);
        remoteChannelRef.current = null;
      }
    }

    async function connectRemote(
      user: Pick<User, "id" | "email" | "user_metadata">,
    ) {
      await disconnectRemote();
      if (cancelled) return;

      const { data: memberships, error: membershipError } = await client
        .from("organization_members")
        .select("organization_id")
        .limit(1);
      if (membershipError || cancelled) return;

      let organizationId = memberships?.[0]?.organization_id as
        | string
        | undefined;
      if (!organizationId) {
        const { data, error } = await client.rpc("create_workspace", {
          workspace_name: initialState.settings.schoolName,
          classroom_name: initialState.settings.className,
        });
        if (error || !data || cancelled) return;
        organizationId = data as string;
      }

      workspaceIdRef.current = organizationId;
      userIdRef.current = user.id;
      setAccountEmail(user.email ?? null);
      setSyncMode("supabase");

      const { data: snapshot } = await client
        .from("workspace_snapshots")
        .select("state, updated_at")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (cancelled) return;
      const remoteState = snapshot?.state as Partial<AriadneState> | undefined;
      const educatorName =
        metadataEducatorName(user) ||
        remoteState?.settings?.educatorName ||
        user.email?.split("@")[0] ||
        initialState.settings.educatorName;
      const accountSession: NonNullable<Session> = {
        kind: "educator",
        name: educatorName,
        provider: "Ariadne account",
      };

      if (remoteState && Object.keys(remoteState).length > 0) {
        const remoteSettings = withEducatorIdentity(
          {
            ...initialState.settings,
            ...(remoteState.settings ?? {}),
          },
          educatorName,
          user.email,
        );
        applyingRemote.current = true;
        setState(
          normalizeState({
            ...remoteState,
            settings: remoteSettings,
            session: accountSession,
          }),
        );
        setLastSyncedAt(snapshot?.updated_at ?? new Date().toISOString());
      } else {
        setState((current) => ({
          ...current,
          settings: withEducatorIdentity(
            current.settings,
            educatorName,
            user.email,
          ),
          session: accountSession,
        }));
      }

      const channel = client
        .channel(`ariadne-workspace-${organizationId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workspace_snapshots",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            const remote = payload.new as {
              state?: Partial<AriadneState>;
              updated_at?: string;
            };
            if (!remote.state) return;
            applyingRemote.current = true;
            setState((current) =>
              normalizeState({
                ...remote.state,
                session: current.session ?? accountSession,
              }),
            );
            setLastSyncedAt(remote.updated_at ?? new Date().toISOString());
          },
        )
        .subscribe();
      remoteChannelRef.current = channel;
    }

    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        void connectRemote(data.user);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (session?.user) {
          void connectRemote(session.user);
        } else {
          void disconnectRemote();
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (remoteChannelRef.current) {
        void client.removeChannel(remoteChannelRef.current);
        remoteChannelRef.current = null;
      }
    };
  }, [hydrated, supabase]);

  useEffect(() => {
    if (!hydrated || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (
      event: MessageEvent<{ sourceId: string; state: AriadneState }>,
    ) => {
      if (event.data.sourceId === sourceId.current) return;
      applyingRemote.current = true;
      setState(normalizeState(event.data.state));
      setLastSyncedAt(new Date().toISOString());
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [hydrated]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        applyingRemote.current = true;
        setState(normalizeState(JSON.parse(event.newValue) as AriadneState));
        setLastSyncedAt(new Date().toISOString());
      } catch {
        // Ignore malformed storage events and keep the last valid state.
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2800);
  }, []);

  const value = useMemo<AriadneContextValue>(
    () => ({
      ...state,
      hydrated,
      toast,
      showToast,
      accountAvailable: Boolean(supabase),
      accountEmail,
      authenticateEducator: async (
        action,
        email,
        password,
        educatorName,
      ) => {
        if (!supabase) {
          return {
            error:
              "Account synchronization is not configured on this deployment.",
          };
        }
        const { data, error } =
          action === "create"
            ? await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: {
                    educator_name: educatorName?.trim() || undefined,
                  },
                },
              })
            : await supabase.auth.signInWithPassword({ email, password });
        if (!error && action === "create" && !data.session) {
          return {
            error:
              "The account was created but could not start a session. Ask the workspace owner to verify the Supabase email confirmation setting.",
          };
        }
        return error ? { error: error.message } : {};
      },
      syncMode,
      lastSyncedAt,
      signIn: (session) => setState((current) => ({ ...current, session })),
      signOut: () => {
        if (supabase && syncMode === "supabase") {
          void supabase.auth.signOut();
        }
        workspaceIdRef.current = null;
        userIdRef.current = null;
        setAccountEmail(null);
        setSyncMode("browser");
        setState((current) => ({ ...current, session: null }));
      },
      setActiveStudent: (activeStudentId) =>
        setState((current) => ({ ...current, activeStudentId })),
      addStudent: (student) =>
        setState((current) => ({
          ...current,
          students: [...current.students, withDefaultBoard(student)],
          activeStudentId: student.id,
        })),
      updateStudent: (studentId, patch) =>
        setState((current) => ({
          ...current,
          students: current.students.map((student) =>
            student.id === studentId ? { ...student, ...patch } : student,
          ),
        })),
      deleteStudent: (studentId) =>
        setState((current) => ({
          ...current,
          students: current.students.filter((student) => student.id !== studentId),
          activeStudentId:
            current.activeStudentId === studentId
              ? current.students.find((student) => student.id !== studentId)?.id ??
                ""
              : current.activeStudentId,
        })),
      addMaterial: (material) =>
        setState((current) => ({
          ...current,
          materials: [material, ...current.materials],
        })),
      updateMaterial: (materialId, patch) =>
        setState((current) => ({
          ...current,
          materials: current.materials.map((material) =>
            material.id === materialId ? { ...material, ...patch } : material,
          ),
        })),
      duplicateMaterial: (materialId) =>
        setState((current) => {
          const source = current.materials.find(
            (material) => material.id === materialId,
          );
          if (!source) return current;
          const baseTitle = source.title.replace(/ copy(?: \d+)?$/i, "");
          const copies = current.materials.filter(
            (material) =>
              material.title === `${baseTitle} copy` ||
              new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} copy \\d+$`, "i").test(
                material.title,
              ),
          ).length;
          return {
            ...current,
            materials: [
              {
                ...source,
                id: nextId("material"),
                title: `${baseTitle} copy${copies ? ` ${copies + 1}` : ""}`,
                status: "draft" as SupportStatus,
                edited: "Just now",
                linkedActivityId: undefined,
              },
              ...current.materials,
            ],
          };
        }),
      deleteMaterial: (materialId) =>
        setState((current) => ({
          ...current,
          materials: current.materials.filter(
            (material) => material.id !== materialId,
          ),
        })),
      addActivity: (activity) =>
        setState((current) => ({
          ...current,
          activities: [...current.activities, activity],
        })),
      updateActivity: (activityId, patch) =>
        setState((current) => ({
          ...current,
          activities: current.activities.map((activity) =>
            activity.id === activityId ? { ...activity, ...patch } : activity,
          ),
        })),
      deleteActivity: (activityId) =>
        setState((current) => ({
          ...current,
          activities: current.activities.filter(
            (activity) => activity.id !== activityId,
          ),
        })),
      addObservation: (observation) =>
        setState((current) => ({
          ...current,
          observations: [observation, ...current.observations],
        })),
      updateSettings: (patch) =>
        setState((current) => ({
          ...current,
          settings: { ...current.settings, ...patch },
        })),
      markNotificationsRead: (notificationsRead = true) =>
        setState((current) => ({ ...current, notificationsRead })),
      resetDemo: () => setState(initialState),
    }),
    [
      accountEmail,
      hydrated,
      lastSyncedAt,
      showToast,
      state,
      supabase,
      syncMode,
      toast,
    ],
  );

  return (
    <AriadneContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="app-toast" role="status">
          {toast.message}
        </div>
      ) : null}
    </AriadneContext.Provider>
  );
}

export function useAriadne() {
  const context = useContext(AriadneContext);
  if (!context) {
    throw new Error("useAriadne must be used inside AriadneProvider");
  }
  return context;
}

export function createId(prefix: string) {
  return nextId(prefix);
}

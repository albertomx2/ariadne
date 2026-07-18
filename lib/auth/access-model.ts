export type EducatorRole =
  | "district_admin"
  | "school_admin"
  | "teacher"
  | "special_educator"
  | "slp"
  | "paraprofessional"
  | "occupational_therapist";

export type StudentAccessMethod =
  | "trusted_device"
  | "class_code"
  | "qr_code"
  | "visual_pin";

export const educatorAuthentication = {
  demo: ["email_otp", "google_workspace", "microsoft"],
  districtReady: ["saml_sso", "oidc_sso"],
  defaultSignup: "invite_only",
} as const;

export const studentAuthentication = {
  createsAuthUser: false,
  methods: [
    "trusted_device",
    "class_code",
    "qr_code",
    "visual_pin",
  ] satisfies StudentAccessMethod[],
  constraints: [
    "Short-lived access grants",
    "One learner space per grant",
    "No email or password",
    "Emergency communication remains available offline",
  ],
} as const;

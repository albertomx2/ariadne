# Ariadne

> A clear path to classroom participation.

Ariadne is a responsive, U.S.-focused inclusive classroom platform for learners
with complex communication and access needs. It connects the learner's
functional profile, the demands of a real classroom activity, and the
educator-reviewed supports that make participation possible.

This repository contains the complete web prototype. The interface, source
code, code comments, sample content, terminology, dates, and product assumptions
use American English. The included learner records are fictional.

- Source: <https://github.com/albertomx2/ariadne>
- Public Vercel demo: <https://ariadne-opal.vercel.app>

## What Ariadne is

Ariadne is not only a student profile builder and it is not intended to replace
an established AAC system. It provides one coordinated workflow:

```text
Functional learner profile
        +
Scheduled classroom activity
        ↓
Relevant access context and potential barriers
        ↓
Editable communication, visual, and instructional supports
        ↓
Required educator review
        ↓
Published, time-aware learner experience
        ↓
Minimal observations and AAC usage signals
```

Ariadne never diagnoses a learner, infers an emotion as fact, measures
compliance, or speaks automatically on the learner's behalf.

## Current product surfaces

### Teacher Workspace

- Dashboard with today's activities, readiness, outstanding reviews, and recent
  materials.
- Student directory with real create, edit, and delete behavior.
- Functional profiles covering communication, representation, access,
  effective supports, interests, emergency communication, and classroom notes.
- Guided profile conversation powered by a schema-constrained hosted or local
  LLM, with a live structured draft and educator review.
- Structured profile form as a non-AI alternative.
- Student-specific AAC board editor for categories, vocabulary, order,
  visibility, ARASAAC symbols, and teacher-selected photos.
- Activity support builder with manual and AI-assisted planning.
- Editable activity vocabulary and visual steps.
- Material library with Draft, Needs educator review, Published, and Archived
  workflows.
- Multi-day schedule with student assignments, device-time preview, and
  automatic learner propagation.
- Insights based on explicit observations and minimal usage events, not
  surveillance.
- Workspace, access, privacy, and account settings.

### Student Space

- Stable AAC core board and teacher-created categories.
- Learner-specific grid size, cell size, text size, contrast, and reduced-motion
  preferences.
- Four explicit representation modes:
  - symbols with text;
  - symbols without text;
  - photos with text;
  - photos without text.
- Independent speech on/off control and speech rate.
- Learner-initiated message construction and speech.
- Context suggestions that never speak or select for the learner.
- `Talk`: the learner's stable general communication board.
- `Activity`: activity-specific vocabulary selected by the activity draft and
  reviewed by the educator.
- `My Day`: shared schedule filtered to the active learner.
- `My Steps`: semantic multi-symbol instructions, such as separate `cut` and
  `banana` concepts.
- `Help`: always-available self-advocacy and emergency language.
- Time-aware Finished, Now, Next, and Later states based on the device clock.

## Implemented status workflow

| Status | Meaning | Available action |
| --- | --- | --- |
| Draft | The material is editable and has not entered review. | Send for educator review. |
| Needs educator review | AI or an educator created a draft that must be checked for accuracy, dignity, vocabulary, images, and assigned learners. | Open the material, confirm the review checklist, and publish. |
| Published | The reviewed material is available to assigned learners and linked schedule views. | Return to draft for changes. |
| Archived | The material is retained but removed from active workflows. | Restore or delete according to policy. |

Every colored status in Materials opens the corresponding workflow. Publishing
an activity package updates its linked schedule item and Student Space.

## Accounts and cross-device synchronization

Google Workspace and Microsoft Entra authentication are intentionally **not**
implemented yet.

The public hackathon architecture uses Ariadne email-and-password accounts
through Supabase Auth:

1. An educator creates an account with an email and password or signs in.
2. Supabase creates a secure session without relying on outbound email.
3. The same credentials can start a session on another device.
4. The first authenticated educator creates a private organization workspace.
5. The browser loads the organization's versioned workspace snapshot.
6. Local edits are debounced and written to Supabase.
7. Supabase Realtime broadcasts the update to other signed-in devices.
8. Every device renders the same schedule, profiles, boards, and materials.

The app still supports a clearly labeled fictional browser demo when Supabase is
not configured. In that mode, `localStorage`, `BroadcastChannel`, and storage
events synchronize tabs in the same browser only.

Email confirmation is disabled only to keep the zero-cost public hackathon demo
usable without a custom SMTP provider. A production education deployment should
verify school email ownership or add an approved identity provider before using
real learner information.

### Security boundaries

- A Supabase publishable key is safe to expose to the browser when RLS is
  enabled; a secret or service-role key is never used in browser code.
- Every public student-data table has Row Level Security.
- Authorization is based on database organization membership, not editable user
  metadata.
- `workspace_snapshots` can only be read or changed by authenticated members of
  the matching organization.
- A snapshot write records the authenticated `updated_by` user.
- The first workspace is created through a restricted authenticated database
  function.
- Educator membership remains role-scoped.
- A student profile is not an authentication account.
- Student class-code, QR, visual-PIN, and trusted-device flows are prototype
  interfaces; a school pilot must issue hashed, expiring, revocable,
  learner-specific server sessions.

## AAC and visual representation

### ARASAAC

The non-commercial hackathon demo uses the ARASAAC API through a provider
adapter. Pictograms remain replaceable per learner and per activity.

Required attribution:

> Pictograms: Sergio Palao. Source: ARASAAC. License: CC BY-NC-SA. Owner:
> Government of Aragon (Spain).

ARASAAC must not be assumed to be the final commercial U.S. symbol library.
Commercial deployment requires a licensing decision and may require a licensed
provider such as PCS or SymbolStix.

### Photos

There is no universal standardized photo library for AAC. Ariadne therefore
uses a small, locally served, curated educational photo set for the demo and
allows an educator to select or upload a clearer photo for a word.

- Photos render with preserved aspect ratio and `object-fit: contain`.
- Photo and symbol preferences are applied automatically to the entire learner
  interface.
- Activity vocabulary is selected for the activity, not displayed as a global
  "familiar photos" strip.
- Abstract concepts such as *different*, *help*, and *finished* require team
  validation; no photo is universally transparent.
- A real deployment should record source, permission, retention, and learner
  familiarity metadata for custom images.

## AI design

### Public and local providers

The public hackathon deployment uses `openai/gpt-4.1-mini` through GitHub
Models. Its fine-grained token belongs to `albertomx2` and has only the
account-level `Models: read` permission. The token stays server-side in Vercel.
Paid GitHub Models usage is not enabled: free requests are rate-limited and
stop when the included quota is exhausted rather than generating a charge.

Local development falls back to Qwen 2.5 7B through Ollama when no hosted
provider token is present:

```bash
ollama pull qwen2.5:7b
ollama serve
```

The application uses AI for two bounded workflows:

1. **Guided profile interview**
   - understands a complete initial description or asks for missing context;
   - uses concrete classroom situations instead of behaving like a rigid form;
   - extracts multiple relevant facts from one answer;
   - keeps observed facts separate from professional ideas to review;
   - changes language when the educator requests it;
   - avoids repeating already answered questions;
   - never diagnoses or treats an inference as an observed fact.

2. **Activity support builder**
   - selects only activity-relevant profile context;
   - drafts potential participation barriers cautiously;
   - proposes editable supports;
   - creates semantic visual steps;
   - selects activity-specific AAC vocabulary;
   - never publishes without educator review.

All LLM output is treated as untrusted draft content, constrained with JSON
Schema, and validated again against structured contracts and deterministic AAC
rules. Hosted AI routes require an authenticated educator account. Only the
selected classroom-access fields are sent; the UI explicitly warns educators
not to enter medical records or unrelated personally identifiable information.

### Predictive AAC ranking

Prediction reduces navigation effort without moving stable core vocabulary,
hiding safety language, completing messages, or speaking for the learner.

```text
score =
  safety availability floor
  + 20% normalized usage frequency
  + 30% current activity affinity
  + 12% time-of-day affinity
  + 20% personal relevance
  + 10% short-term recency
```

Non-negotiable rules:

- stable core positions do not move;
- help, stop, break, yes, and no remain immediately available;
- the learner actively selects every word;
- only configured suggestion areas may reorder;
- predictions are possibilities, not inferred intent;
- educators and learners can disable predictions;
- offline communication never depends on ranking.

## Speech

Ariadne uses the browser's best compatible U.S. device voice through Web Speech
synthesis. This avoids downloading a TTS model before the first utterance and
makes learner-initiated speech effectively immediate.

- The learner profile controls speech enabled/disabled and rate.
- Ariadne does not use Whisper for speech output; Whisper is speech-to-text, not
  text-to-speech.
- Ariadne never speaks a prediction automatically.
- Exact voice quality depends on the voices installed by the operating system.

## Schedule synchronization

The schedule stores:

- date and local start time;
- duration;
- location and context;
- assigned learners;
- readiness status;
- activity vocabulary;
- visual steps;
- change-support readiness.

An educator edits an activity once. Every assigned learner receives the same
date, time, vocabulary, and steps, rendered with that learner's own
representation, grid, text, speech, motion, and access preferences.

## Insights provenance

Insights are calculated from explicit, labeled sources:

- direct educator observation;
- learner selection;
- team report;
- family-reported observation;
- whether a support was available;
- selected/spoken/removed vocabulary events;
- ignored suggestions.

The source and observer role remain visible. Ariadne does not infer family
feedback, emotional state, engagement, ability, or behavior from absence of a
selection.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript 5
- Supabase Auth, PostgreSQL, RLS, and Realtime
- GitHub Models with GPT-4.1 mini for the public hackathon demo
- optional Vercel AI Gateway adapter
- Ollama with Qwen 2.5 7B as a local fallback
- ARASAAC API
- Web Speech synthesis
- CSS-based responsive visual system
- `localStorage` and `BroadcastChannel` demo fallback

## Repository structure

```text
app/
  api/ai/                 Authenticated, schema-constrained AI endpoints
  api/photos/             Curated photo adapter
  api/pictograms/         ARASAAC adapter
  auth/confirm/           Reserved callback for future identity providers
  sign-in/                Educator and learner access
  student/                Learner-facing space
  workspace/              Teacher routes
components/               Shared UI and AAC board editor
lib/
  ai-access.ts            Educator-session guard for hosted AI
  ai-contracts.ts         Structured AI response contracts
  ai-provider.ts          GitHub Models / Vercel Gateway / Ollama adapter
  ariadne-store.tsx       Local/remote state and Realtime synchronization
  predictive-ranking.ts   Transparent AAC suggestion ranking
  schedule.ts             Time-aware schedule logic
  speech.ts               Immediate device TTS
  supabase/               Browser and auth-callback server clients
public/assets/aac/        Curated AAC photo assets
supabase/migrations/      Multi-organization schema, RLS, and sync snapshot
types/                    Domain types
```

This is intentionally the repository's only README and product/engineering
reference.

## Local setup

Requirements:

- Node.js 20 or newer;
- pnpm;
- optional Ollama for AI without a hosted provider token.

```bash
git clone https://github.com/albertomx2/ariadne.git
cd ariadne
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in).

### Environment variables

```dotenv
# Browser-safe Supabase values
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Keep true for the fictional no-account fallback.
NEXT_PUBLIC_DEMO_MODE=true

# Server-only GitHub token with account-level Models: read permission.
GITHUB_MODELS_TOKEN=github_pat_...
GITHUB_MODELS_MODEL=openai/gpt-4.1-mini

# Optional alternative hosted provider.
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL=openai/gpt-5-mini

# Optional local fallback
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

Never commit `.env.local`, a Supabase secret key, a service-role key, learner
records, exported profiles, or private photos.

## Supabase setup

1. Create a dedicated Ariadne Supabase project.
2. Apply migrations in timestamp order:
   - `20260718001543_initial_ariadne_schema.sql`
   - `20260718141625_workspace_sync.sql`
   - `20260718151000_restrict_workspace_creation.sql`
3. Copy the project URL and active publishable key into `.env.local`.
4. Keep email authentication enabled and disable Confirm email for the
   zero-cost hackathon account flow.
5. Add local and production `/auth/confirm` URLs to the redirect allowlist for
   future identity-provider work.
6. Do not enable Google or Microsoft providers yet.
7. Verify RLS and performance advisors.
8. Test two independent browser profiles or physical devices with the same
   email account.

The snapshot adapter is deliberate for the hackathon: it gives the existing
complete interface atomic, cross-device synchronization while the normalized
tables remain the long-term domain model.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm exec next build --webpack
pnpm build:cloudflare
```

Recommended manual acceptance test:

1. Open `/sign-in` on two devices.
2. Use the same Ariadne email and password on both.
3. Add a learner on device A.
4. Confirm the learner appears on device B.
5. Change the learner's representation mode.
6. Confirm Student Space updates on device B.
7. Create an activity, select activity vocabulary, review it, and publish it.
8. Confirm the activity appears in the assigned learner's `My Day`,
   `Activity`, and `My Steps` views.
9. Return a material to Draft and confirm the learner no longer receives the
   unpublished version.

## Deployment

The public app deploys from `albertomx2/ariadne` to Vercel as a standard Next.js
server application. Vercel preserves Auth sessions, dynamic API routes, and AI
requests. Production provides only the Supabase project URL and publishable
key to the browser; the GitHub Models token remains server-only, and no
Supabase secret or service-role key is used.

Required Vercel variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_DEMO_MODE=true
GITHUB_MODELS_TOKEN=github_pat_...
GITHUB_MODELS_MODEL=openai/gpt-4.1-mini
```

Do not add purchased AI credits or an automatic top-up. After changing
production environment variables, redeploy so the build receives the new
values. The OpenNext Cloudflare build remains available as a secondary adapter,
but it is not the canonical public deployment.

## U.S. privacy and accessibility checklist

This is an engineering checklist, not legal advice.

- FERPA school-official and direct-control requirements.
- COPPA and parental-consent responsibilities where applicable.
- IDEA alignment: Ariadne supports participation and implementation; it does
  not make IEP or assistive-technology decisions.
- Section 504 and ADA obligations.
- State student privacy laws and district contract requirements.
- WCAG 2.1 AA as a minimum public-sector procurement baseline.
- District review of data retention, deletion, export, incident response, and
  subprocessors.
- No real student data in the public hackathon environment.
- No student data used to train a general model.
- Short retention for raw guided-profile conversations; the reviewed structured
  profile is the durable record.

## Deliberately deferred

- Google Workspace authentication
- Microsoft Entra authentication
- District SAML/OIDC
- Native iOS or Android application
- Product/demo video
- Real IEP/SIS integration
- Google Classroom integration
- Family portal
- District administration console
- Billing
- Free-form learner AI chat
- Emotion recognition
- Camera-based inference
- Clinical or diagnostic models

## License and data notice

The application code is a hackathon prototype. Review third-party licenses,
photo permissions, school contracts, and ARASAAC's CC BY-NC-SA terms before any
commercial use.

The public demo must contain fictional data only.

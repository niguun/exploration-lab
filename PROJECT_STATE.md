# PROJECT STATE — The Exploration Lab

Last updated: 2026-09-17

---

## 1. CURRENT PRODUCT CONCEPT

The Exploration Lab is an interactive STEM learning platform where the **interactive visualization is BOTH the learning interface AND the assessment instrument**.

The system observes student reasoning through a structured loop:

```
PREDICT -> MANIPULATE -> OBSERVE -> EXPLAIN
```

The full closed learning loop:

1. Student opens the Bayes activity
2. Student commits a prediction (locked, immutable)
3. Student freely explores parameters and filters
4. Student completes guided observation steps
5. Student answers explanation questions
6. System assembles a structured reasoning trace
7. System classifies the trace into a reasoning pattern with confidence
8. Teacher views a spatial reasoning landscape showing all students
9. Teacher pushes a targeted intervention to a reasoning group
10. Student receives the follow-up assignment
11. Student completes the activity again with (ideally) improved reasoning
12. Teacher refreshes and sees the student move from misconception toward correct understanding

The current MVP is intentionally focused on **ONE polished domain**: probability / Bayes / base-rate reasoning. Physics, calculus, linear algebra, etc. are future examples only and are NOT implemented.

---

## 2. CURRENT ARCHITECTURE

### Frontend
- **Next.js 14** with App Router, TypeScript, Tailwind CSS 3.4, React 18
- Full-screen immersive dark environment, no traditional page chrome

### React / State Architecture
- `useReducer` for flow state machine (guarded transitions between 5 stages)
- Trace logging via `useRef` (not state) to avoid rerenders during high-frequency interaction
- `useMemo` for Bayes computation (recomputes only when params change)
- Canvas API for population token rendering (500 stable tokens representing 1000 population)
- `useSearchParams()` for student identity (`?student=X`)

### Bayes Math (`lib/bayes.ts`)
- `computeBayes()` uses Math.round with remainder allocation
- Guarantees TP + FN = diseased, TN + FP = healthy
- Posterior = TP / totalPositive
- Default params: prevalence=0.01, sensitivity=0.95, specificity=0.95, population=1000
- Default posterior: 10/60 ~ 0.1667

### Population Canvas (`components/PopulationCanvas.tsx`)
- 500 stable tokens (TOTAL_TOKENS=500) representing 1000 population
- Canvas API with requestAnimationFrame loop
- Lerp-based smooth animation (0.12 normal, 0.35 during drag)
- 4 layout modes: all (grid), condition (split), test_results (2x2), positive_only (center cluster)
- DPR-aware rendering, ResizeObserver for responsive sizing
- Hover detection highlights whole token group

### Student Flow State Machine (`lib/flow.ts`)
- 5 stages: `predict -> free_explore -> guided_observation -> explain -> complete`
- All transitions guarded (wrong stage = no-op)
- Actions: COMMIT_PREDICTION, FINISH_EXPLORATION, COMPLETE_GUIDED_STEP, FINISH_GUIDED, SUBMIT_EXPLANATION

### Trace System (`lib/trace.ts`)
- `StudentTrace` captures: prediction (value + timestamp), actions (phase-tagged), explanation answers, stage transitions, final parameter state, timing
- `assembleTrace()` takes studentId and activityId as explicit params
- Defensive copies of all arrays

### Classifier (`lib/classifier.ts`)
- Three independent signal groups: prediction, free_explore, explanation
- `extractPredictionSignals()` — decision tree: nearPost -> correct, nearSens -> SPC, highPred -> BRN
- `extractFreeExploreSignals()` — only free_explore phase actions; requires hasExplored
- `extractExplanationSignals()` — maps option IDs via OPTION_PATTERN lookup
- Two-phase classification: pre-observation (prediction + free_explore) and post-observation (explanation)
- Group-counting for confidence: 3 groups = strong, 2 = moderate, 1 = weak
- Weak misconception downgrades to insufficient_evidence
- Recovery: pre=misconception+moderate+ AND post=correct+not-weak
- `validateTrace()` for API input validation

### Persistence (`lib/persistence.ts`)
- JSON file I/O to `data/` directory
- `data/traces/` — individual trace JSON files
- `data/assessments/` — individual assessment JSON files
- `data/assignments.json` — array of assignments
- Duplicate trace detection via fs.access

### APIs
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/trace` | POST | Validate, save trace, classify, save assessment |
| `/api/teacher/[activityId]` | GET | Hybrid merge: seed in-memory + disk overrides |
| `/api/assignments` | POST | Create assignment |
| `/api/assignments/[studentId]` | GET | Latest assignment for student |
| `/api/activity/[id]` | GET | Activity metadata |
| `/api/class/[activityId]` | GET | Aggregation for activity |
| `/api/intervention/[activityId]/[pattern]` | POST | Recommendation for pattern |

### Teacher Reasoning Landscape (`app/teacher/page.tsx`)
- Full-screen spatial visualization of class reasoning patterns
- 5 clusters positioned in viewBox coordinates: BRN(18,28), SPC(18,72), DC(36,50), IE(52,50), Correct(80,50)
- Golden angle scatter for organic dot placement within clusters
- Dot size/opacity encode confidence (strong=14px/1.0, moderate=11px/0.8, weak=8px/0.55)
- Recovered dots displaced 35% from origin cluster toward correct (RECOVERY_PULL=0.35)
- SVG dashed lines for recovery paths
- Detail panel slides from right: evidence, student list, intervention push
- Student card positioned near dot: prediction vs actual, exploration summary
- Live student dots glow and pulse on arrival
- Smooth position animation on refresh (dots move instead of resetting)
- Refresh detects new/moved students and plays arrival animation

### Hybrid Data Merge (teacher API)
- Seed data generated in-memory via `classifyDemoTraces()` with fixed timestamp '2024-06-15T12:00:00Z'
- Disk data overrides seed by studentId when timestamp is later
- New studentIds from disk are added to the map
- No seed data written to disk

### Seeded Demo Traces (`lib/seed.ts`)
- 19 deterministic traces via TraceSpec array
- Students 1-4: BRN, Students 5-7: SPC, Students 8-9: DC
- Students 10-12: correct, Students 13-15: recovered, Students 16-18: insufficient_evidence
- Student 19: BRN not recovered
- All traces run through the REAL classifier (not hardcoded classifications)

### Intervention / Follow-Up Loop
- Teacher pushes intervention via POST `/api/assignments`
- Student page checks for assignment on mount via GET `/api/assignments/{studentId}`
- Follow-up banner shows teacher's recommendation
- Same Bayes activity, same params — behavioral difference from the student
- Cross-trace recovery: latest-per-student logic in teacher API

---

## 3. COMPLETED PHASES

### Phase 1 — Interactive Bayes Visualization
Full-screen dark immersive environment, population Canvas, parameter sliders, filter modes, Bayes math, animated dot transitions.

### Phase 2 — Student Flow
State machine: predict -> free_explore -> guided_observation -> explain -> complete. StudentTrace implementation. 30 tests across 3 files.

### Phase 3 — Backend Classification
Trace submission, deterministic multi-signal reasoning classification, class aggregation, JSON persistence, 19 seeded demo traces. 53 new tests (83 total).

### Phase 4 — Teacher Reasoning Landscape
Full-screen spatial visualization with student dots grouped by pattern, recovery paths, detail panels, intervention actions.

### Phase 5 — Closed-Loop Demo
End-to-end: student completes activity -> trace submitted -> teacher sees student -> pushes intervention -> student gets follow-up -> completes with correct reasoning -> teacher sees movement.

### Demo Hardening (in progress)
- Live student dot pulse/glow animation
- Smooth movement animation on refresh (dots transition positions instead of resetting)
- Polished intervention push confirmation (checkmark pop animation)
- Follow-up banner entrance animation and clearer language
- Error handling for API failures
- Clean start scripts (`npm run clean`, `npm run demo`)
- Live student badges in teacher landscape

### Current Test/Build Status
- **83 tests passing** across 6 test files
- Production build compiles successfully
- End-to-end curl test verified from clean start

---

## 4. IMPORTANT LOGICAL INVARIANTS

### Prediction
- Initial student prediction is immutable after commitment
- Prediction value is stored as a decimal (0-1), displayed as percentage

### Trace Integrity
- Free exploration and guided observation remain distinguishable (separate `ActionPhase` values)
- Guided behavior must never be interpreted as spontaneous discovery
- Only `free_explore` phase actions are used for free exploration signals
- Semantic actions are logged, not animation frames or hover events
- Hover behavior is not strong diagnostic evidence

### Bayes Mathematics
- Specificity is NOT false-positive rate; false-positive rate = 1 - specificity
- P(+|D) (sensitivity) must never be confused with P(D|+) (posterior)
- Posterior is based on TP / (TP + FP)
- Visual token rounding must not silently change underlying probability math
- computeBayes uses remainder allocation to guarantee TP+FN=diseased, TN+FP=healthy

### Classification
- Weak/conflicting evidence becomes insufficient_evidence rather than a forced misconception
- Recovery requires evidence of changed understanding, not merely seeing the answer
- Classification uses convergent signals from independent groups, avoiding double-counting
- Seeded demo students run through the REAL classifier (not hardcoded classifications)
- Ties in group count -> insufficient_evidence (not arbitrary winner)
- extractPredictionSignals produces at most ONE signal (decision tree, not accumulator)

### Floating Point
- Math.abs(0.85 - 0.95) = 0.0999...998 < 0.10 — predictions near 0.85 trigger SPC, not BRN
- Test values and seed specs chosen to avoid floating-point boundary ambiguity

### Teacher Landscape
- Aggregation counts come from real classification, not manual/fake counts
- Recovery paths come from cross-trace evidence (latest-per-student), not button clicks
- Seed data is generated in-memory with fixed past timestamp; disk data overrides by studentId

---

## 5. CURRENT VISUAL DIRECTION

The approved visual direction:
- Full-screen immersive environment
- Deep navy base (#0D1520)
- Premium, clean, presentation-friendly visual identity
- Bold editorial typography (Playfair Display for headings, Inter for UI, Source Serif 4 for annotations)
- Strong hierarchy with clear focal points
- Central scientific visualization
- Bespoke interface chrome (not generic component library)
- Spatial depth and layering (radial gradients, backdrop blur, subtle grid)
- Restrained gold/amber (#C49A3C, #D4A847) and selective accent colors
- Visually memorable / high wow factor
- Interaction feels tactile and responsive
- Purpose-built scientific instrument, not ordinary webpage

Desired feeling: premium + immersive + conceptually intelligent + distinctive + interactive

The goal is NOT generic educational software.

---

## 6. REFERENCE IMAGES

Reference images are stored in `reference_images/` at the repository root.

**Actual files present** (UUID-named):
```
reference_images/0afea97c-8140-4107-89e7-cdcf86db959f.png
reference_images/0ee901ef-57a8-449e-83f2-c608a0b6bcc0.png
reference_images/0f8ed8fb-4442-427c-812d-05b9bcc21385.png
reference_images/1ae3c96f-20af-432a-9dbb-180d374ebdff.png
reference_images/22ee00c7-0151-4c7d-8f2a-b3eabb3665da.png
reference_images/32ca3f03-e24f-4842-bcd5-c48ccdf6e36a.png
reference_images/3ba0672e-556d-4bd0-bb0f-4abe544eeb0a.png
reference_images/40ac26f3-6785-4b76-b5ea-cbd0aff50a8b.png
reference_images/56854597acd52e4ef301c0444d9e9eea7144b1e2-1920x1080.avif
reference_images/9d364758-a5a1-4849-b9c3-27106ce396f7.png
reference_images/imc-flagship-trading-challenge-phase-overview.png
reference_images/LinkedIn_Think_Sign-up_ImageAd_1x1_TCcopypng.jpg
reference_images/opengraph-image.png
reference_images/Screenshot 2026-09-17 at 1.34.34 AM.png
```

**NOTE:** The user's checkpoint instructions referenced `references/imc-01.png`, `references/imc-02.png`, `references/imc-03.png`, and `references/approved-bayes.png` — these specific filenames DO NOT EXIST. The directory is `reference_images/` and files have UUID names. The user should identify which UUID files correspond to the IMC references and approved Bayes direction, then rename or alias them.

The IMC-related file is: `reference_images/imc-flagship-trading-challenge-phase-overview.png`

---

## 7. HOW TO USE THE REFERENCES

When doing significant visual work:
- Actually open and inspect the reference images in `reference_images/`
- Treat them as real design references, not vague moodboards
- Study: composition ratios, hierarchy, element scale, typography, visual rhythm, overlap, depth, negative space, navigation treatment, focal points, density, integration of interface and visualization
- Do not average references into a generic UI — preserve boldness and intentionality

---

## 8. REJECTED VISUAL DIRECTIONS

Intentionally rejected:
- Generic SaaS dashboard layouts
- LMS appearance
- Generic AI application appearance
- shadcn-style card grids / rounded-card soup
- Light beige academic infographic/dashboard treatment
- Overly safe minimalist interfaces
- Cyberpunk/neon HUD interfaces / gamer interfaces
- Photorealistic laboratory scenes
- Excessive glassmorphism
- Finance/admin dashboard appearance
- Excessive clutter
- Generic header + sidebar + cards layouts

Earlier light/parchment designs were rejected for being too flat, too safe, too generic, insufficiently immersive, and lacking presentation wow factor.

---

## 9. INTERACTION / PERFORMANCE EXPECTATIONS

- Controls must feel immediate
- Slider dragging must remain smooth
- Visualization updates continuously without glitching
- Animation must be interruptible/re-targetable when inputs change
- Meaningful interaction preferred over decorative hover effects
- Population tokens should reveal conceptual information, not merely enlarge
- Fewer excellent interactions > many fake interactions
- Positive Only / conditioning reveal is a key visual teaching moment
- Avoid expensive React rerenders in high-frequency visual interaction (trace logging via refs, not state)
- Preserve approximately 60 FPS where realistically possible

---

## 10. CURRENT DEMO FLOW

### Correct sequence (verified against implementation)

1. Clean start (`npm run demo` or `rm -rf data/ && npm run dev`)
2. Teacher opens `localhost:3000/teacher` — sees 19 seed students
3. Student opens `localhost:3000/?student=live_student` — no follow-up exists yet
4. Student completes the activity with BRN reasoning:
   - Predicts ~80%
   - Explores sensitivity slider and By Condition filter (ignores prevalence / Positive Only)
   - Completes guided observation
   - Answers: Q1=1st, Q2=3rd, Q3=2nd (misconception-consistent)
   - Trace submitted and classified as base_rate_neglect
5. Teacher clicks Refresh — class becomes 20, live_student appears in BRN cluster with glow
6. Teacher clicks BRN cluster — sees live_student with LIVE tag in student list
7. Teacher clicks "Send to 7 students" — intervention pushed (now includes live_student)
8. Student reloads `localhost:3000/?student=live_student` — follow-up banner appears
9. Student clicks "Begin Follow-Up" and completes with correct reasoning:
   - Predicts ~17%
   - Explores prevalence slider, By Condition, and Positive Only
   - Completes guided observation
   - Answers: Q1=2nd, Q2=2nd, Q3=1st (all correct)
   - Trace submitted and classified as correct_reasoning
10. Teacher clicks Refresh — live_student moves from BRN toward Correct Understanding (BRN 7→6, Correct 3→4)

**Critical ordering:** The teacher must push the intervention AFTER live_student's first trace is submitted. The student must reload the page AFTER the intervention is pushed. This is the real system — no shortcuts.

---

## 11. KNOWN COMPROMISES

- MVP supports only the Bayes/probability vertical slice (by design, not a bug)
- No authentication — student identity via `?student=X` URL parameter, defaults to 'anonymous'
- Local JSON file persistence — suitable for hackathon demo, not production
- Denominator confusion (DC) may top out at moderate confidence because independent evidence is more limited for this pattern
- Visual population tokens (500) approximate expected counts while posterior uses exact mathematical computation
- No WebSocket push — teacher must manually click Refresh to see updates
- Seed data timestamps are fixed at '2024-06-15T12:00:00Z' (in-memory only, never written to disk)
- Follow-up uses the same Bayes activity — differentiation is behavioral, not structural
- `npm install` requires `--legacy-peer-deps` due to peer dependency conflicts
- No mobile/responsive design — optimized for presentation viewport only
- Student 19's prediction changed from 0.85 to 0.75 to avoid floating-point boundary issue

---

## 12. IMPORTANT FILES

### Core Library
| File | Purpose |
|------|---------|
| `lib/bayes.ts` | Bayes math, token layout, color constants |
| `lib/flow.ts` | Flow state machine (5 stages, guarded transitions) |
| `lib/trace.ts` | StudentTrace type, assembleTrace, ID generators |
| `lib/questions.ts` | GUIDED_STEPS (3) and EXPLANATION_QUESTIONS (3) with pattern tags |
| `lib/assessment-types.ts` | ReasoningPattern, Confidence, EvidenceItem, ClassifierSignal, ReasoningAssessment, ClassAggregation |
| `lib/classifier.ts` | Signal extraction, two-phase classification, validateTrace |
| `lib/aggregation.ts` | aggregateAssessments |
| `lib/persistence.ts` | JSON file I/O, saveTrace, loadTrace, assignments |
| `lib/seed.ts` | 19 demo traces, generateDemoTraces, classifyDemoTraces |

### Pages
| File | Purpose |
|------|---------|
| `app/page.tsx` | Student activity page (Suspense-wrapped, useSearchParams) |
| `app/teacher/page.tsx` | Teacher Reasoning Landscape |
| `app/layout.tsx` | Root layout |
| `app/globals.css` | All styling (~1700 lines) |

### Components
| File | Purpose |
|------|---------|
| `components/PopulationCanvas.tsx` | Canvas API population token rendering (500 tokens) |
| `components/ParameterControls.tsx` | Prevalence/sensitivity/specificity sliders |
| `components/PredictionInput.tsx` | Centered overlay with prediction slider |
| `components/GuidedOverlay.tsx` | Bottom bar with guided steps |
| `components/ExplanationStep.tsx` | One question at a time, calls onComplete |
| `components/CompleteSummary.tsx` | Activity complete overlay with submission status |
| `components/BottomPhaseNav.tsx` | 5-phase progress indicator |
| `components/PhaseNav.tsx` | Top navigation |
| `components/LeftSidebar.tsx` | Left sidebar |

### API Routes
| File | Method |
|------|--------|
| `app/api/trace/route.ts` | POST |
| `app/api/teacher/[activityId]/route.ts` | GET |
| `app/api/assignments/route.ts` | POST |
| `app/api/assignments/[studentId]/route.ts` | GET |
| `app/api/activity/[id]/route.ts` | GET |
| `app/api/class/[activityId]/route.ts` | GET |
| `app/api/intervention/[activityId]/[pattern]/route.ts` | POST |

### Tests
| File | Count |
|------|-------|
| `tests/bayes.test.ts` | 11 |
| `tests/flow.test.ts` | 11 |
| `tests/trace.test.ts` | 8 |
| `tests/classifier.test.ts` | 32 |
| `tests/seed.test.ts` | 14 |
| `tests/aggregation.test.ts` | 7 |
| **Total** | **83** |

### Config
| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `vitest.config.ts` | globals:true, @ alias |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.ts` | Tailwind config |
| `next.config.mjs` | Next.js config |
| `postcss.config.mjs` | PostCSS config |

---

## 13. TEST / BUILD / RUN COMMANDS

```bash
# Install dependencies (requires --legacy-peer-deps)
npm install --legacy-peer-deps

# Development server
npm run dev

# Run all tests (83 tests, 6 files)
npm test

# Production build
npm run build

# Clean data and build cache
npm run clean

# Clean start for demo (removes data/ and .next/, starts dev server)
npm run demo
```

---

## 14. THINGS NOT TO CHANGE WITHOUT A GOOD REASON

- Do NOT expand to multiple STEM domains before hackathon demo is finished
- Do NOT add authentication
- Do NOT add a real database/ORM
- Do NOT add WebSockets unless genuinely necessary
- Do NOT add ML clustering
- Do NOT use an LLM for deterministic Bayes mathematics
- Do NOT use an LLM as the core reasoning classifier
- Do NOT redesign the visual system from scratch
- Do NOT revert to the rejected beige/light dashboard
- Do NOT replace the spatial teacher landscape with ordinary charts/cards
- Do NOT add generic dashboard metrics for decoration
- Do NOT overengineer the backend
- Do NOT introduce new architecture solely for elegance
- Do NOT break the working closed-loop demo

---

## 15. NEXT TASK

The project is in **FINAL DEMO HARDENING / PRESENTATION POLISH**.

Priority order:
1. Demo reliability
2. Smooth interaction
3. Visual polish
4. Presentation narrative
5. Graceful loading/error behavior
6. Exact presentation viewport testing
7. Rehearsal

Do NOT automatically start another major feature after creating this checkpoint.

Bedrock-powered activity generation is OPTIONAL and should only be considered if substantial time remains after the core demo is polished and reliable.

---

## 16. REFERENCE FILE SAFETY

Do not delete, rename, overwrite, or modify files in `reference_images/` unless explicitly asked.

**NOTE:** The user's instructions referenced `references/imc-01.png`, `references/imc-02.png`, `references/imc-03.png`, and `references/approved-bayes.png`. These specific filenames do not exist. The actual directory is `reference_images/` and files have UUID names. The user should clarify which files map to which references.

# The Exploration Lab

Interactive STEM education platform where students build intuition through prediction, exploration, and explanation — and teachers see how students reason in real time.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | What it does |
|-------|-------------|
| `/` | **Bayes Theorem** — full student activity (predict → explore → observe → explain) |
| `/distributions` | **Distributions** — drag probability mass, see E[X] and Var(X) update |
| `/inference` | **Sampling Inference** — draw samples, observe the sampling distribution |
| `/simulation` | **Monte Carlo** — run trials, watch proportions converge |
| `/applications` | **Real-World Bayes** — 5 applied scenarios |
| `/linalg` | **Matrix Transformations** — drag basis vectors, reshape space |
| `/linalg/basis` | **Basis Explorer** — see how coordinates change with the basis |
| `/linalg/determinant` | **Determinant & Area** — visualize area scaling and orientation |
| `/linalg/eigenvectors` | **Eigenvectors** — find directions that don't turn |
| `/linalg/projections` | **Projections** — decompose vectors into parallel + perpendicular |
| `/teacher` | **Teacher Dashboard** — reasoning landscape with student clusters |

## Tests

```bash
npm test
```

199 tests across 12 suites covering Bayes math, flow state machine, trace assembly, classifier signals, distributions, inference, simulation, linear algebra, activity specs, and prompt construction.

## Production Build

```bash
npm run build
npm start
```

## Architecture

- **Next.js 14** with App Router
- **Framer Motion** for UI transitions
- **KaTeX** for mathematical typesetting
- **Canvas 2D** for probability visualizations
- **SVG** for linear algebra visualizations
- All math is deterministic — no AI in the student interaction path
- File-based persistence under `data/` (JSON)

## Teacher Flow

1. Students complete the Bayes activity at `/?student=student_name`
2. Traces are classified by a deterministic reasoning classifier
3. Teachers view the reasoning landscape at `/teacher`
4. Teachers can push interventions to specific misconception clusters
5. Students receive follow-up prompts on their next visit

## AI Integration (Optional)

The platform includes Bedrock integration for generating activities from uploaded PDFs. Requires AWS credentials with `bedrock:InvokeModel` permission.

```bash
export AWS_REGION=us-east-1
export BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-20250514
```

Without AWS credentials, the platform runs fully with built-in activities.

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `AWS_REGION` | No | `us-east-1` | Bedrock region |
| `BEDROCK_MODEL_ID` | No | `us.anthropic.claude-sonnet-4-20250514` | Model for activity generation |

No API keys are needed for the core platform. AWS credentials use the default provider chain.

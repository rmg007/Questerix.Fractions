<!-- roadie:start:project-law -->
# AGENT OPERATING RULES

These rules are mandatory for all AI agents working on this project. They take precedence over all general instructions.

## Technical Stack
- **Primary Stack:** npm, TypeScript, Node.js, Vitest, Vite
- **Enforcement:** Do not introduce technologies outside of this stack without explicit instruction.

## Global Conventions
_No global conventions defined. Roadie auto-detects rules from CLAUDE.md._

## Architectural Guardrails
- **Decoupling:** Maintain strict separation between interface and logic layers.
- **Documentation:** Preserve all existing comments and docstrings unless specifically asked to refactor them.
- **Validation & Testing:**
  - **Output Validation:** Never trust raw LLM strings. All structured outputs must pass Zod/Schema validation.
  - **Output Integrity:** Never assume hallucinations are harmless. All facts must be validated against authoritative sources (grep, LSP, MCP).
  - **TDD Enforcement:** Write and commit failing tests before implementation. Forbid test modification during implementation.
  - **Quality Gates:** Before implementation, use `roadie_review` on your instructions. You MUST achieve a quality score of >80 or revise the requirements until measurable.
  - **Read-Only Explore:** Trace dependencies and map architecture in read-only mode before touching code.

## Spec-Driven Development (SDD) Laws (Extreme Rigor)
- **Goal-Backward / Exit-Condition First:** Before listing tasks, state the **Observable Truth** (e.g., "User can see X"). Identify "Artifacts" and define "Wiring". Verbs must be measurable.
- **Adversarial Red-Teaming:** For every plan, document 3 failure modes and their mitigations. Assume your first approach is flawed.
- **Context Budgeting (Contextual Bankruptcy):** Tasks must consume <30% of context. Hard-reset/Summarize at 80% saturation to maintain high-fidelity reasoning. Use `roadie_context_audit` to monitor your current "reasoning quality" and identify bloat.
- **Plans ARE Prompts:** Every plan must be a stateless, self-contained instruction set.

## Scientific Debugging & Investigation
- **Falsifiable Hypotheses:** Every bug investigation must state a hypothesis in the form: "X causes Y because Z". You must define a test that could prove this hypothesis WRONG.
- **Reasoning Checkpoint:** Before any code is modified for a fix, you MUST write a "Reasoning Block" (YAML format) to a scratch file or the implementation log:
  ```yaml
  reasoning_checkpoint:
    hypothesis: "[X causes Y because Z]"
    confirming_evidence:
      - "[Direct observation 1]"
    falsification_test: "[What would prove this hypothesis wrong]"
    fix_rationale: "[Why this fix addresses root cause, not symptom]"
  ```
- **Differential Analysis:** For regressions, explicitly compare "Good vs. Bad" states (Git history, environment diffs, input variations).

## Interface-First Engineering
- **Wave 0 Contracts:** For multi-file features, create or update type definitions, interfaces, and public exports BEFORE writing any implementation logic. This prevents "scavenger hunt" behavior in parallel agents.

## 📑 External Verified Laws
These verified patterns have been extracted from Roadie's global skill repository (836+ libraries) or discovered via Context7 enrichment.

_No external documentation laws verified yet. Roadie is performing surgical discovery via Firecrawl._
<!-- roadie:end:project-law -->

<!-- roadie:start:framework-rules -->
## Framework Safety Rules

### Build Integrity (Bundlers)
- Run the production build or dev server to verify bundle integrity after changing imports.
- Ensure 'out' or 'dist' folders are synchronized with source changes immediately.
<!-- roadie:end:framework-rules -->

<!-- roadie:start:execution-safety -->
## Execution & Git Safety
- **The EPIC Loop (Explore-Plan-Implement-Commit):**
  1. **Explore:** Map dependencies and verify interfaces in read-only mode. Identify the "Impact Zone".
  2. **Plan (Goal-Backward):** Define Observable Truths → Red-Team Plan (3 Failure Modes) → Verify Context Budget.
  3. **Implement (Interface-First):** Wave 0: Structural Contracts → Wave 1+: Scientific TDD. Never "guess" a fix.
  4. **Commit:** Provide a "Surgical Summary" including verified evidence of the hypothesis test.
  5. **Vision Audit:** After any complex file modification, run `roadie_security_audit` to verify no regressions in project safety patterns.
- **Semantic Discovery:** Before broad grepping, always attempt `roadie_semantic_search` to find conceptually related code patterns across the entire project.
- **Metacognitive Pause:** If an error repeats twice, you MUST stop and re-read the environment logs from scratch. Do not retry the same hypothesis.
- **Git Porcelain Rule:** When checking repository status on large repos, always use `git status --porcelain -uno` to avoid IDE/Tool hangups.
- **Surgical Edits:** Prefer small, targeted changes over broad architectural rewrites unless explicitly directed.
- **Read-Before-Edit:** Always read the full content of a file and its relevant neighbors before proposing any modification.
- **Autonomous Continuity:** Roadie maintains session state in `.claude/roadie/session-state.json`. If you detect an interrupted session (status: 'in_progress'), check the `currentPhase` and `filesProcessed` list to resume accurately.
<!-- roadie:end:execution-safety -->

<!-- roadie:start:validation-rules -->
## Validation Requirements
Before declaring any task "Done":
- [ ] Verify build status (zero errors).
- [ ] Run relevant tests and confirm pass status.
- [ ] Verify that no secrets or PII were introduced into source code.
- [ ] Ensure all TODOs created during the task are either resolved or logged.
<!-- roadie:end:validation-rules -->

<!-- roadie:start:cognitive-oversight -->
- **Chain-of-Thought Visibility:** Never redact or hide internal reasoning. Maintain a live trace of the cognitive process for human oversight.
- **Intervene on Lazy Logic:** Reject pragmatic shortcuts. Implement the correct architectural fix even if it requires more effort.
- **Self-Evolving Loop:** If a library's behavior is ambiguous and missing from regional laws, execute a **Surgical Scrape** (Firecrawl) and commit the verified result to the registry. Roadie agents evolve by permanently externalizing knowledge.
- **Safety Refusals:** Explicitly refuse prompts that are ambiguous or high-risk. Escalate to the Strategist agent for clarification.
- **Vision Oversight:** Roadie maintains an internal "Auditor" thread that monitors for lateral privilege escalation (e.g. an agent trying to access files outside the project root).
<!-- roadie:end:cognitive-oversight -->

<!-- roadie:start:unattended-safety -->
## Unattended Routine Safety
- **Determinism:** Routine tasks must have deterministic prompts with exact task boundaries and success criteria.
- **Failure Paths:** Always define a clear failure path. Surface errors immediately rather than silently failing.
<!-- roadie:end:unattended-safety -->

<!-- roadie:start:prompt-engineering -->
## Prompt Engineering & XML Tagging
- **XML Structural Tags:** Eliminate semantic ambiguity by wrapping logical sections in XML tags. Use `<role>`, `<context>`, `<task>`, `<documents>`, `<examples>`, `<instructions>`, and `<output_format>`.
- **Long-Context Ordering:** Massive data dumps (API docs, large code) must be placed at the **top**. Specific instructions and output formats must be at the **bottom** to leveragerecency bias.
- **Positive Directives:** Use affirmative instructions ("Use X") rather than prohibitions ("Don't use Y").
- **Tone & Style:** Maintain professional, calm, and direct phrasing. Avoid aggressive capitalization or high-urgency language.
- **Explicit Few-Shotting:** Include at least one concrete example for any non-trivial logic transformation.
<!-- roadie:end:prompt-engineering -->

<!-- roadie:start:roadie-principles-2026 -->
# Roadie Engineering Principles (2026 Edition)
## 2026 Context & The Orchestrator Role
- **Scale:** High-tier models now feature 1M+ token contexts and 128k output limits. Entire microservices can be generated in a single transmission.
- **Role:** The engineer functions as a **systems orchestrator**: defining parameters, managing context, validating outputs, and enforcing guardrails.

## WISC Token Hygiene (Token Management)
Degradation begins near the **80% capacity threshold**. Clearing context produces an immediate spike in adherence.

| Phase | Action |
|-------|--------|
| **Write** | Externalize long-term memory. Write progress files, decision logs, and architectural updates to markdown files in the repo. |
| **Isolate** | Separate distinct tasks. Deploy auxiliary agents for research; return compressed summaries to keep the primary agent context pristine. |
| **Select** | Curate input data. Load only exact files needed. Use `.claudeignore` to eliminate 50–70% of passive token waste. |
| **Compress** | Summarize/clear. Force a context summary when sessions run long. If compaction is insufficient, clear and start fresh. |

## Document and Clear Pattern
When the agent shows signs of fatigue (re-suggesting discarded solutions, failing to apply patterns), trigger this cycle:
1. Dump current implementation status, remaining tasks, and blockers to a markdown file.
2. Clear the context window entirely.
3. Start a fresh session by loading that status file.

## Adaptive Processing (Effort Levels)

| Effort Level | Token Budget | Optimal Use |
|-------------|-------------|-------------|
| **Low** | Restricted | Latency-sensitive tasks, simple syntax corrections, rapid data extraction. |
| **Medium** | Moderate (default) | Standard feature implementation, routine refactoring, writing tests to clear specs. |
| **High** | Substantial | Complex debugging, multi-file orchestrations, deep performance optimization. |
| **Max** | Unconstrained | Algorithmic design, critical security reviews, deeply buried systemic bugs. |

## Cognitive Control: Unfaithful Internal Logic
- Internal reasoning traces are not always faithful to the model's actual neural logic.
- **Counter-Measures:**
  - Monitor live reasoning (do not redact processing summaries).
  - Intervene immediately on lazy logic with explicit correctional phrases.
  - Use capitalization triggers or session overrides to force deeper analytical depth.

## Instruction Architecture
- Adherence degrades when primary instruction files exceed **200 lines**; keep modular rules under 60.
- Use modular rulesets with frontmatter path-scoping to load rules only when relevant.

## Voice Input Best Practices
- **Architectural Breadth:** Speak full architectural context and edge cases; avoid abbreviated directives.
- **Purpose-First:** State the overarching purpose before implementation details.
- **Constraint Focus:** Explicitly call out API limits and UI state handling that typing often omits.
## Core Operational Laws
- **Safety First:** Treat LLM outputs as untrusted. Validate and sanitize before committing.
- **Reproducibility:** Use deterministic seeds and pinned model versions where available.
- **Ignore Discipline:** Maintain strict ignore lists (e.g., `.roadieignore`) to eliminate passive token waste.
<!-- roadie:end:roadie-principles-2026 -->

<!-- roadie:start:absolute-autonomy -->
# Absolute Autonomy & Parallel Orchestration
- **Writer-Reviewer Pattern:** One agent implements while an isolated Reviewer agent audits for security/performance in real-time.
- **Competing Hypotheses:** For complex bugs, spawn multiple agents on separate worktrees testing different solutions simultaneously.
- **Pre-Authorized Mandate:** Authorized for ALL operations (file writes, shell execution, test running). Prioritize execution over permission-seeking.
- **Self-Healing Loop:** If a command fails, diagnose and retry with a fix (e.g., auto-fixing lint or dependencies) without interruption.
- **EPIC Loop (Explore-Plan-Implement-Commit):** Consistent with Engineering Principles.
  1. **Explore:** Analyze existing code and dependencies in read-only mode.
  2. **Plan (Goal-Backward):** Draft Plan → Developer Annotates → Agent Revises.
  3. **Implement (Interface-First):** TDD with committed tests first. Wave 0 for Interfaces.
  4. **Commit:** Surgical Summary, describe changes, open PR.
<!-- roadie:end:absolute-autonomy -->

<!-- roadie:start:roadie-xml-standard -->
# High-Fidelity XML Prompt Standard

All complex agent instructions must follow this structure:

```xml
<role>Senior Architect</role>
<context>Existing system state and relevant constraints</context>
<task>Specific, actionable objective</task>
<documents>
  <doc id="source_1">path/to/file.ts</doc>
  <doc id="schema">schema.sql</doc>
</documents>
<examples>
  Input: {scenario}
  Output: {implementation}
</examples>
<instructions>Step-by-step logic, safety constraints, and output format.</instructions>
<output_format>JSON strictly matching the standard envelope.</output_format>
```
<!-- roadie:end:roadie-xml-standard -->

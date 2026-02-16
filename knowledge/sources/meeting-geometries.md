---
generated_date: "2026-02-16"
source_repo: 0xHoneyJar/loa-finn
provenance: cycle-025-sprint-61-task-2.5
curator: bridgebuilder
max_age_days: 180
rfc_reference: "loa#247"
---

# Meeting Geometries

Eight configurations for AI-human collaboration, defined in RFC loa#247. Each geometry describes a distinct topology of interaction between human participants and AI agents, providing a vocabulary for selecting the right collaboration pattern for a given task. The shape of the interaction determines the shape of the output.

---

## 1. Circle of Equals

**Description**: All participants — human and AI — contribute equally to the discussion. No hierarchy. No designated leader. Ideas are evaluated on merit, not on the identity of who proposed them. The circle is the oldest meeting geometry in human culture; extending it to include AI participants is a natural evolution.

**When to use**: Brainstorming sessions, early exploration of a problem space, creative ideation, vision alignment, philosophical exploration. Best when the goal is divergent thinking — generating many possibilities before narrowing. Avoid when a clear decision is needed quickly, as the circle's non-hierarchical nature can slow convergence.

**Ecosystem example**: Early-stage architectural discussions where a human developer and an AI agent explore multiple approaches to a design problem without either party dominating the direction. The agent offers alternatives the human might not consider; the human provides domain constraints the agent lacks. The Loa framework's `/plan-and-analyze` phase approximates this geometry during requirements discovery.

**Human-AI dynamics**: The key discipline is treating AI contributions with the same critical evaluation as human contributions — neither automatically accepting nor automatically dismissing. The circle works when participants evaluate ideas, not sources. This geometry requires the most maturity from human participants, who must resist the instinct to either defer to the AI or dismiss it. The risk is false equality: the circle works when participants genuinely have different knowledge to contribute, not when one participant is simply echoing the other.

---

## 2. Master-Apprentice Pair

**Description**: One participant leads, the other learns. The direction of instruction can go either way: human teaches AI about domain-specific constraints, regulatory requirements, or organizational context; or AI teaches human about codebase patterns, architectural history, and technical best practices. The direction depends on domain expertise, not on the nature of the participant.

**When to use**: Skill transfer and onboarding scenarios. A new contributor learning the codebase (AI master, human apprentice). Teaching an agent about project-specific conventions (human master, AI apprentice). Code review where the reviewer explains their reasoning. Deep domain exploration where one participant has significantly more context than the other.

**Ecosystem example**: The Oracle answering a new contributor's questions about the loa-finn architecture. The Oracle draws on its knowledge corpus (development history, RFCs, code reality, Bridgebuilder reports) to serve as the master, while the contributor learns the system's patterns, rationale, and history. The relationship inverts when the contributor provides context the Oracle lacks — business requirements, user feedback, or operational observations that are not in the knowledge corpus.

**Human-AI dynamics**: The master sets the pace and direction. The apprentice asks questions and proposes solutions for validation. The risk in human-master mode is that the AI apprentice may not push back on suboptimal directions — it tends toward agreement. The risk in AI-master mode is that the human may accept explanations uncritically, especially when the AI presents information with confidence. Both risks are mitigated by encouraging the apprentice role to ask "why" frequently and the master role to acknowledge uncertainty.

---

## 3. Constellation

**Description**: Multiple specialized agents collaborate under human oversight. Each agent has a defined role and domain of expertise. The human serves as coordinator — directing attention, resolving conflicts between agents, and making final decisions. Like stars forming a recognizable pattern, the individual agents create something coherent only when seen together through human orchestration.

**When to use**: Complex tasks requiring multiple specializations that no single agent possesses. Architecture that needs both security review and performance analysis. Documentation that needs both technical accuracy and readability review. Any task where the intersection of multiple perspectives produces insights that none of them would reach alone.

**Ecosystem example**: A Loa development cycle where the sprint planner agent creates the plan, the implementer agent writes code, the reviewer agent evaluates the code, and the auditor agent verifies security — with the human developer coordinating the sequence and resolving disagreements between agents. The GPT-5.2 Flatline Protocol, where Claude and GPT-5.2 evaluate each other's assessments, is a two-agent constellation. The Hounfour multi-model router itself can be seen as a constellation at the infrastructure level — multiple model providers serving different requests based on capability matching.

**Human-AI dynamics**: The human serves as orchestrator and tiebreaker. Agents communicate through structured artifacts (PRDs, SDDs, review comments, audit findings) rather than direct conversation. The geometry works when each agent's domain is clearly bounded — overlap between agents creates conflict that requires human resolution. The coordination cost scales with the number of agents, so constellations work best with 2-5 specialized agents rather than many generalist agents.

---

## 4. Solo with Witnesses

**Description**: One agent works. Others observe and may intervene if they detect errors or see opportunities for improvement. This is the "pair programming" model extended to multiple observers. The witnesses do not direct the work — they watch for mistakes, blind spots, and missed opportunities.

**When to use**: Implementation tasks where the primary worker benefits from passive oversight. The witnesses do not co-author; they evaluate and flag. Best when the primary agent is competent but the task has enough risk to warrant observation — security-sensitive code, financial computation, or integration work across subsystems.

**Ecosystem example**: The standard Loa `/implement` workflow followed by `/review-sprint` and `/audit-sprint`. The implementing agent writes code autonomously while the review and audit skills serve as witnesses — they observe the output after the fact and intervene with structured findings. The Bridgebuilder review loop is a formalized version of this geometry, where the implementing agent produces a PR and the Bridgebuilder witnesses it through multiple review iterations.

**Human-AI dynamics**: The solo worker has autonomy within defined boundaries. Witnesses intervene through structured channels (review comments, audit findings, convergence metrics), not through real-time interruption. This geometry respects the worker's flow state while providing safety nets. The human's role is to configure the witnesses' sensitivity (how critical should they be?) and to decide which witness findings to act on. Run Mode autonomous sprints use this geometry with the circuit breaker providing an automated halt mechanism if witness findings exceed thresholds.

---

## 5. Council

**Description**: Multiple agents deliberate on a question. Each brings a different perspective — different models, different training data, different reasoning patterns. The human holds the final decision authority but benefits from hearing multiple viewpoints before deciding. The council members are advisors, not decision-makers.

**When to use**: High-stakes decisions where multiple perspectives reduce the risk of blind spots. Security audits where different models may catch different vulnerability patterns. Architectural decisions where the cost of a wrong choice is high. Risk assessments where diverse viewpoints surface concerns that any single perspective would miss.

**Ecosystem example**: The Flatline Protocol. When a design document (PRD, SDD, or sprint plan) needs multi-model review, the Flatline Protocol solicits assessments from multiple models (currently Claude and GPT-5.2). Each model scores the document independently. HIGH_CONSENSUS findings (where both models agree) are auto-integrated. BLOCKERs halt autonomous workflows. DISPUTED findings (where models disagree) are presented to the human for resolution. The council's value is precisely in the disagreements — when two powerful models see the same document differently, the human learns something neither model could convey alone.

**Human-AI dynamics**: The council members are not peers — they are advisors to a human decision-maker. This is important because council members may disagree, and the system needs a resolution mechanism that does not depend on the council reaching consensus. The human's role shifts from "do the work" to "judge the advice" — a fundamentally different skill that requires understanding enough about the domain to evaluate competing recommendations.

---

## 6. Relay

**Description**: Sequential handoff between agents. Each agent picks up where the previous one left off. Work flows through a pipeline of specialized stages. Order matters — each agent builds on what the previous agent produced. The relay geometry creates a pipeline where quality compounds through stages.

**When to use**: Multi-stage workflows where each stage has different requirements. Planning followed by implementation followed by review followed by deployment. Translation pipelines where one agent drafts, another refines, and a third validates. Any workflow where the output of one phase becomes the input of the next, and each phase benefits from a different specialization.

**Ecosystem example**: The simstim workflow and the Loa development cycle itself. The cycle flows: requirements discovery (PRD) followed by architecture design (SDD) followed by sprint planning followed by implementation followed by review followed by audit. Each phase produces a structured artifact that the next phase consumes. The handoff is the artifact — each agent reads the previous phase's output and produces the next phase's input. The GPT-5.2 review at each phase boundary validates the handoff, ensuring the artifact is correctly understood by the next stage.

**Human-AI dynamics**: The relay works when handoff artifacts are well-defined. Ambiguous handoffs (an artifact open to multiple interpretations) cause the relay to drift — each subsequent agent may interpret the ambiguity differently, compounding misunderstanding. The human's role is to validate each handoff point. In the Loa framework, the phase review (GPT-5.2 approval or Flatline Protocol review) serves this validation function, catching drift before it propagates through the pipeline.

---

## 7. Mirror

**Description**: The AI reflects the human's work back with a different perspective. The AI does not create new work — it reinterprets, analyzes, and challenges what the human has already produced. The mirror does not replicate; it reveals what the original cannot see about itself. A code review is a mirror; a philosophical analysis of technical decisions is a mirror; a Bridgebuilder report that finds Ostrom's governance principles in a retry strategy is a mirror.

**When to use**: Code review, design review, writing feedback. Any situation where the human has produced something and needs a different viewpoint. Particularly valuable when the human has been working in isolation and may have developed blind spots. The mirror geometry is retrospective — it examines work already done, not work in progress.

**Ecosystem example**: The Bridgebuilder review model. The Bridgebuilder reads a pull request and reflects it back through the lens of a senior engineering mentor. It does not rewrite the code — it observes patterns, names them, draws parallels to established industry practice, and identifies opportunities the author may have missed. The field reports (`grimoires/oracle/bridgebuilder-reports.md`) are the mirror's reflections — observations about what the code reveals about the system being built. The Run Bridge extends this into an iterative mirror: the reflection is applied, the work is updated, and the mirror reflects again until convergence.

**Human-AI dynamics**: The mirror must be honest but constructive. A mirror that only praises is useless — it teaches nothing. A mirror that only criticizes is demoralizing — it discourages the work it reviews. The Bridgebuilder's persona balances these by leading with structural observations (what patterns does this code implement?), recognizing genuinely good decisions (the PRAISE finding type), and offering improvement through analogy and industry parallels. The human's role is to receive the reflection with openness while maintaining judgment about which observations to act on.

---

## 8. Swarm

**Description**: Many agents work in parallel on decomposed tasks. Each agent operates independently within a bounded scope. A coordinator (human or lead agent) decomposes the work, distributes tasks, and integrates results. The swarm geometry maximizes throughput at the cost of coordination overhead. Works best when tasks are independently decomposable with minimal inter-task dependencies.

**When to use**: Large implementation tasks that can be decomposed into independent units. Migration tasks where many files need similar changes. Test generation where different test categories can be written independently. Comprehensive analysis where different aspects can be examined in parallel. Any task where parallelism reduces total time without requiring tight coordination between workers.

**Ecosystem example**: Claude Code Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). When active, a team lead decomposes sprint tasks and distributes them to teammate agents. Each teammate implements its assigned task independently, communicating completion via `SendMessage`. The lead coordinates git operations (commits, pushes) and serializes access to shared mutable state (beads database, run state files, `.run/` directory). The Loa framework's constraints (lead-only git operations, serialized beads access, System Zone write protection) are governance rules that mitigate swarm coordination failures.

**Human-AI dynamics**: The swarm introduces coordination costs that do not exist in other geometries. Each agent works independently, but their outputs must be integrated. Merge conflicts, inconsistent assumptions, and duplicated work are real risks. The coordinator's role is to decompose tasks with clear boundaries, provide sufficient context to each agent, and resolve integration issues at the merge point. The swarm works best when tasks share a codebase but touch different files — when tasks modify the same files, the coordination cost may exceed the parallelism benefit.

---

## Geometry Selection Guide

| Task Characteristic | Favored Geometry | Key Benefit |
|---|---|---|
| Divergent thinking needed | Circle of Equals | Maximum idea generation |
| Knowledge transfer | Master-Apprentice Pair | Directed learning |
| Multiple specializations required | Constellation | Complementary expertise |
| Implementation with safety nets | Solo with Witnesses | Autonomy plus oversight |
| High-stakes architectural decision | Council | Diverse perspectives |
| Multi-phase pipeline | Relay | Compounding quality |
| Retrospective analysis | Mirror | Insight through reflection |
| Parallelizable implementation | Swarm | Maximum throughput |

## Geometry Transitions

Geometries are not static within a session. A conversation might begin in Circle of Equals (brainstorming), transition to Master-Apprentice Pair (the AI explains a pattern), shift to Solo with Witnesses (the human implements while the AI observes), and conclude in Mirror (the AI reviews the result). Recognizing these transitions — and being explicit about them — helps both human and AI participants adjust their behavior appropriately.

## Connection to Web4

Just as monetary pluralism recognizes that different communities need different currencies, collaboration pluralism recognizes that different tasks need different interaction geometries. The goal is not to find the one best way to collaborate with AI, but to develop fluency in choosing among many ways. The meeting geometries provide the vocabulary for that fluency.

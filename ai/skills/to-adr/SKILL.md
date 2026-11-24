---
name: to-adr
description: Record one architecture decision from the current conversation in the project's ADR log.
disable-model-invocation: true
---

Write and save a short [architecture decision record](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html) for the topic named after the command. Treat the argument as a topic hint, not a title or a decision. If it is omitted, use the decision only if the conversation clearly identifies one. If the topic is ambiguous or no concrete choice has been made or proposed, ask one focused question and wait.

1. Use the conversation as the source for what was decided and why. Check relevant repository files to verify context and find related ADRs. Do not invent consensus, rationale, alternatives, or consequences. Mark material unknowns as open.
2. Follow the applicable repository's ADR location, template, and naming conventions. If no convention exists, use `docs/adr/` at the repository root and name the file `0001-use-example-library.md` or similar: a four-digit sequence number and a short decision slug. Use one more than the highest existing number, starting at `0001` when the directory is empty. Create the directory if needed. If the decision spans repositories and no home is clear, ask where to save it.
3. Write one decision per Markdown file. Aim for 1/2 page, with the choice up front. Use this structure:
   - **Title:** State the choice, such as “Use Shiki for syntax highlighting”.
   - **Status:** Use `Accepted` for an agreed decision and `Proposed` for a concrete choice still under discussion. Invoking the skill does not imply acceptance.
   - **Decision:** State the choice and what it applies to.
   - **Context and rationale:** Explain the problem, constraints, and trade-offs that drove the choice. Include the pros and cons of alternatives actually considered.
   - **Consequences:** Capture significant benefits, costs, and risks. Include material uncertainties or conditions for revisiting the choice when known. Link to supporting material rather than reproducing it.
4. If an ADR already records the same decision, report its path instead of duplicating it. If this choice replaces an accepted decision, link to the earlier ADR from the new record. Once the replacement is accepted and saved, mark the earlier record `Superseded` and link to the replacement without rewriting its original decision or rationale.
5. Save the new ADR without overwriting an existing file. Verify that the record and any required supersession links were saved, then report the path and status. Leave implementation and commits untouched.

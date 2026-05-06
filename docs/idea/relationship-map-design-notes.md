# Relationship map design notes

Extracted from the older Benefit Assurance board prototype. That prototype used Benefits -> Objectives -> Risks -> Actions, but the interaction model maps well to PSPF Explorer's Requirements -> Risks/Directions -> Actions/Work evidence traceability problem.

## Useful patterns to reuse

### 1. Staged board as an alternative to force layout

The Benefit Assurance view used four fixed columns with connection lines between cards. For PSPF, a comparable mode could be:

- Compliance gaps
- Risks and Directions
- Actions and work logs
- Evidence and reporting outputs

This can be easier for executives to scan than a free-form graph because left-to-right position carries meaning. Cytoscape can remain the relationship explorer, while a future board mode could become the assurance narrative view.

### 2. Explicit path highlighting

The older view selected a card, then highlighted the full linked path and dimmed unrelated cards. PSPF equivalent:

- Select a requirement to highlight linked risks, Directions, actions, work logs, and evidence.
- Select an action to highlight the risks and requirements it treats.
- Allow multi-select for comparing two requirements or two work streams.

This is stronger than only showing a selected-node inspector because it answers: "what is connected to this, and what is not?"

### 3. Human-readable connection lines

The prototype labelled connection types visually through a legend and colour-coded SVG paths. PSPF equivalent connection classes:

- Requirement -> Risk: risk affects requirement
- Requirement -> Action: action remediates requirement
- Risk -> Action: action treats risk
- Requirement -> Direction: Direction modifies requirement
- Requirement -> Work log/Evidence: work supports compliance decision

The current map already uses human-readable labels in the fallback list. A next step is a visible legend plus coloured edge classes on the canvas.

### 4. Filter controls by status and linkage

The prototype had filters for stage, risk level, action status, completed visibility, and linked/unlinked mode. PSPF equivalent:

- Compliance state filter: Not yet implemented, Risk-managed, Not set, Fully implemented.
- Risk band/status filter: high/extreme, open/monitored/closed.
- Action status filter: blocked, overdue, in progress, done/cancelled.
- Direction response filter: needs response, not dealt with, risk-managed, dealt with.
- Linked mode: all, linked only, unlinked gaps only.

The most valuable filter for PSPF is likely "unlinked gaps only": requirements that are not implemented or not set and have no work connected.

### 5. Summary strip with operational KPIs

The prototype led with summary metrics before the graph. PSPF map metrics should continue in this direction:

- Compliance gaps with work
- Compliance gaps without work
- Blocked or overdue actions
- Directions needing response
- High/extreme risks connected to gaps
- Evidence coverage for non-compliant/risk-managed requirements

These are release-worthy because they turn the map from decoration into assurance reporting.

### 6. Card metadata and badges

The prototype cards showed status, owner, priority, due date, progress, and link counts. PSPF map inspector/card details could show:

- Requirement: compliance state, domain, evidence count, latest work-log timestamp.
- Risk: band, status, linked action count.
- Action: status, due date, overdue flag, linked requirement/risk count.
- Direction: response state, evidence count, linked requirement count.

The current inspector is a good first step; a board mode would make this metadata visible without needing selection.

### 7. Link coverage as a first-class metric

The prototype calculated benefit coverage from linked actions. PSPF equivalent:

- Gap coverage: percentage of non-compliant, risk-managed, or not-set requirements with at least one active work item.
- Treatment coverage: percentage of high/extreme risks with at least one active action.
- Direction response coverage: percentage of Directions dealt with or risk-managed.

These would be useful in the map summary and in copy/export outputs.

### 8. Exportable assurance paths

The older panel exported a PDF summary of paths. PSPF Explorer should avoid PDF for now, but the same structure is ideal for plain-text copy:

```text
Requirement GOV-001: Not yet implemented
Risk: Control gap remains untreated (extreme, open)
Action: Implement uplift plan (blocked, overdue)
Direction: PSPF Direction 123-2026 (needs response)
Evidence: 1 item
Work log: 1 entry
```

This can become `Copy map summary` without adding new dependencies.

## Recommended follow-up slices

1. Add map filters for compliance state, action status, Direction response, and linked/unlinked mode.
2. Add path highlighting in the Cytoscape map: selected node highlights directly and transitively connected nodes, unrelated nodes dim.
3. Add a visible legend for node colours and edge meanings.
4. Add `Copy map summary` using the existing pure `relationship-map` helper.
5. Consider a later "Assurance board" mode using fixed columns for gap -> risk/Direction -> action/work -> evidence, especially for executive reporting.

## Design caution

Do not replace the current Cytoscape map immediately. The board pattern is excellent for storytelling and assurance reporting, while the graph remains better for exploring dense cross-links. The best product shape is likely two modes sharing the same pure graph/summary helper.

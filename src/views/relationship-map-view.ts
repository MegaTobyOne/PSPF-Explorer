/**
 * Relationship map: Cytoscape-rendered network of requirements, risks,
 * actions and directions, edged by both stored `Relationship` records and
 * the implicit links carried by Risks (requirementIds, actionIds), Actions
 * (requirementIds, riskIds) and Directions (requirementIds).
 *
 * Cytoscape is loaded lazily so the main bundle stays slim.
 */

import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { consume } from '@lit/context';
import type { Core, EventObjectNode } from 'cytoscape';
import { designTokens } from '../app/design-tokens.ts';
import {
  buildRelationshipMapGraph,
  type MapNode,
  type RelationshipMapGraph,
} from '../domain/relationship-map.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';
import type { ComplianceState, DirectionResponseState } from '../data/types.ts';

function mapComplianceLabel(state: ComplianceState): string {
  switch (state) {
    case 'yes':
      return 'Fully implemented';
    case 'no':
      return 'Not yet implemented';
    case 'risk-managed':
      return 'Risk-managed';
    case 'not-applicable':
      return 'Not applicable';
    case 'not-set':
      return 'Not set';
  }
}

function mapDirectionResponseLabel(state: DirectionResponseState): string {
  switch (state) {
    case 'yes':
      return 'Dealt with';
    case 'no':
      return 'Not dealt with';
    case 'risk-managed':
      return 'Risk-managed';
    case 'not-set':
      return 'Needs response';
  }
}

@customElement('pspf-relationship-map-view')
export class RelationshipMapView extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: block;
      }
      h2 {
        margin: 0 0 var(--space-2) 0;
        font-size: var(--text-xl);
      }
      .intro {
        margin: 0 0 var(--space-3) 0;
        color: var(--colour-fg-muted);
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: var(--space-2);
        margin-bottom: var(--space-3);
      }
      .metric {
        padding: var(--space-2);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
      }
      .metric strong {
        display: block;
        font-size: var(--text-lg);
      }
      .metric span {
        color: var(--colour-fg-muted);
        font-size: var(--text-xs);
      }
      .toolbar {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: var(--space-2);
      }
      .map-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(17rem, 22rem);
        gap: var(--space-3);
        align-items: stretch;
      }
      label.row {
        display: inline-flex;
        gap: 4px;
        align-items: center;
        font-size: var(--text-sm);
      }
      .stage {
        position: relative;
        height: 520px;
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
        overflow: hidden;
      }
      .canvas {
        position: absolute;
        inset: 0;
      }
      .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--colour-fg-muted);
        font-size: var(--text-sm);
        text-align: center;
        padding: var(--space-3);
      }
      .inspector {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
        min-height: 520px;
      }
      .inspector h3 {
        margin: 0 0 var(--space-2) 0;
        font-size: var(--text-md);
      }
      .inspector p {
        margin: 0 0 var(--space-2) 0;
        font-size: var(--text-sm);
      }
      .inspector a {
        color: inherit;
      }
      .pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
        margin: var(--space-2) 0;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        padding: 2px var(--space-1);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        background: var(--colour-bg);
        font-size: var(--text-xs);
      }
      dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: var(--space-1) var(--space-2);
        margin: var(--space-2) 0 0 0;
        font-size: var(--text-sm);
      }
      dt {
        color: var(--colour-fg-muted);
      }
      dd {
        margin: 0;
      }
      details.fallback {
        margin-top: var(--space-3);
        font-size: var(--text-sm);
      }
      details.fallback summary {
        cursor: pointer;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: var(--space-2);
      }
      th,
      td {
        padding: var(--space-1) var(--space-2);
        text-align: left;
        border-bottom: 1px solid var(--colour-border);
        font-size: var(--text-sm);
      }
      th {
        color: var(--colour-fg-muted);
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      @media (max-width: 980px) {
        .summary,
        .map-layout {
          grid-template-columns: 1fr;
        }
        .inspector {
          min-height: 0;
        }
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () =>
    this.store
      ? [
          this.store.compliance,
          this.store.risks,
          this.store.actions,
          this.store.directions,
          this.store.relationships,
          this.store.workTracking,
        ]
      : [],
  );

  @state() private accessor showRequirements = true;
  @state() private accessor showRisks = true;
  @state() private accessor showActions = true;
  @state() private accessor showDirections = true;
  @state() private accessor selectedNodeId = '';

  #cy: Core | null = null;
  #canvas: HTMLDivElement | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cy?.destroy();
    this.#cy = null;
  }

  override render(): TemplateResult {
    const graph = this.#graph();
    const { nodes, edges, summary } = graph;
    const selected =
      nodes.find((node) => node.id === this.selectedNodeId) ??
      nodes.find((node) => node.kind === 'requirement') ??
      nodes[0];

    return html`
      <article>
        <h2>Relationship map</h2>
        <p class="intro">
          Shows how compliance posture connects to risks, remediation actions, Directions and logged
          work. Select a node to inspect the work-to-compliance trail.
        </p>
        <section class="summary" aria-label="Work and compliance summary">
          <div class="metric">
            <strong>${summary.requirements}</strong><span>Requirements</span>
          </div>
          <div class="metric">
            <strong>${summary.complianceGapsWithWork}</strong><span>Gaps with work</span>
          </div>
          <div class="metric">
            <strong>${summary.complianceGapsWithoutWork}</strong><span>Gaps without work</span>
          </div>
          <div class="metric">
            <strong>${summary.blockedOrOverdueActions}</strong><span>Blocked/overdue actions</span>
          </div>
          <div class="metric">
            <strong>${summary.directionsNeedingResponse}</strong
            ><span>Directions needing response</span>
          </div>
        </section>

        <div class="toolbar" role="group" aria-label="Visible node kinds">
          <label class="row">
            <input
              type="checkbox"
              ?checked=${this.showRequirements}
              @change=${(e: Event): void => {
                this.showRequirements = (e.target as HTMLInputElement).checked;
              }}
            />
            Requirements
          </label>
          <label class="row">
            <input
              type="checkbox"
              ?checked=${this.showRisks}
              @change=${(e: Event): void => {
                this.showRisks = (e.target as HTMLInputElement).checked;
              }}
            />
            Risks
          </label>
          <label class="row">
            <input
              type="checkbox"
              ?checked=${this.showActions}
              @change=${(e: Event): void => {
                this.showActions = (e.target as HTMLInputElement).checked;
              }}
            />
            Actions
          </label>
          <label class="row">
            <input
              type="checkbox"
              ?checked=${this.showDirections}
              @change=${(e: Event): void => {
                this.showDirections = (e.target as HTMLInputElement).checked;
              }}
            />
            Directions
          </label>
          <span
            data-testid="counts"
            style="margin-left:auto; color: var(--colour-fg-muted); font-size: var(--text-sm);"
          >
            ${nodes.length} nodes · ${edges.length} edges
          </span>
        </div>

        <div class="map-layout">
          <div class="stage">
            ${nodes.length === 0
              ? html`<div class="empty" data-testid="empty">
                  No work-to-compliance links to display. Link risks, actions or Directions to
                  requirements, or log work against a requirement.
                </div>`
              : html`<div class="canvas" data-testid="map-canvas" ${ref(this.#onCanvasRef)}></div>`}
          </div>
          ${this.#renderInspector(selected)}
        </div>

        <details class="fallback" ?open=${nodes.length > 0 && nodes.length <= 40}>
          <summary>Connection list (text fallback)</summary>
          <table aria-label="Connection list">
            <thead>
              <tr>
                <th>From</th>
                <th>Connection</th>
                <th>To</th>
                <th>Context</th>
              </tr>
            </thead>
            <tbody data-testid="adjacency">
              ${edges.map((e) => {
                const src = nodes.find((n) => n.id === e.source);
                const tgt = nodes.find((n) => n.id === e.target);
                return html`<tr>
                  <td>${src?.label ?? e.source}</td>
                  <td>${e.label}</td>
                  <td>${tgt?.label ?? e.target}</td>
                  <td>${src?.detail ?? ''}${tgt?.detail ? html` → ${tgt.detail}` : ''}</td>
                </tr>`;
              })}
            </tbody>
          </table>
        </details>
      </article>
    `;
  }

  #onCanvasRef = (el: Element | undefined): void => {
    if (!(el instanceof HTMLDivElement)) return;
    this.#canvas = el;
    void this.#renderCytoscape();
  };

  async #renderCytoscape(): Promise<void> {
    if (!this.#canvas) return;
    const { nodes, edges } = this.#graph();
    if (nodes.length === 0) {
      this.#cy?.destroy();
      this.#cy = null;
      return;
    }

    const cytoscapeModule = await import('cytoscape');
    const cytoscape = cytoscapeModule.default;
    this.#cy?.destroy();

    const elements = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          kind: n.kind,
          complianceState: n.complianceState,
          riskBand: n.riskBand,
          actionStatus: n.actionStatus,
          actionOverdue: n.actionOverdue ? 'true' : 'false',
          directionResponseState: n.directionResponseState,
        },
      })),
      ...edges.map((e) => ({
        data: { id: e.id, source: e.source, target: e.target, kind: e.kind, label: e.label },
      })),
    ];

    this.#cy = cytoscape({
      container: this.#canvas,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#2563eb',
            label: 'data(label)',
            color: '#0f172a',
            'font-size': 11,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            width: 22,
            height: 22,
          },
        },
        {
          selector: 'node[kind = "requirement"]',
          style: { 'background-color': '#475569', 'border-width': 3, 'border-color': '#0f172a' },
        },
        {
          selector: 'node[kind = "requirement"][complianceState = "yes"]',
          style: { 'background-color': '#2dd4bf' },
        },
        {
          selector: 'node[kind = "requirement"][complianceState = "no"]',
          style: { 'background-color': '#ef4444' },
        },
        {
          selector: 'node[kind = "requirement"][complianceState = "risk-managed"]',
          style: { 'background-color': '#facc15' },
        },
        {
          selector: 'node[kind = "requirement"][complianceState = "not-applicable"]',
          style: { 'background-color': '#94a3b8' },
        },
        {
          selector: 'node[kind = "risk"]',
          style: { 'background-color': '#b34a00', shape: 'diamond' },
        },
        {
          selector: 'node[kind = "risk"][riskBand = "extreme"]',
          style: { 'background-color': '#99182c', width: 28, height: 28 },
        },
        {
          selector: 'node[kind = "risk"][riskBand = "low"]',
          style: { 'background-color': '#2f6f3a' },
        },
        {
          selector: 'node[kind = "action"]',
          style: { 'background-color': '#059669', shape: 'round-rectangle' },
        },
        {
          selector:
            'node[kind = "action"][actionStatus = "blocked"], node[kind = "action"][actionOverdue = "true"]',
          style: { 'background-color': '#b34a00', width: 28, height: 20 },
        },
        {
          selector:
            'node[kind = "action"][actionStatus = "done"], node[kind = "action"][actionStatus = "cancelled"]',
          style: { 'background-color': '#94a3b8' },
        },
        {
          selector: 'node[kind = "direction"]',
          style: { 'background-color': '#7c3aed', shape: 'triangle' },
        },
        {
          selector:
            'node[kind = "direction"][directionResponseState = "not-set"], node[kind = "direction"][directionResponseState = "no"]',
          style: { 'background-color': '#ef4444', width: 28, height: 28 },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#94a3b8',
            'curve-style': 'bezier',
            'target-arrow-shape': 'none',
          },
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 5, 'border-color': '#0f172a' },
        },
      ],
      layout: { name: 'cose', animate: false, fit: true, padding: 16 },
    });

    this.#cy.on('tap', 'node', (event: EventObjectNode): void => {
      this.selectedNodeId = event.target.id();
    });
  }

  override updated(): void {
    void this.#renderCytoscape();
  }

  #graph(): RelationshipMapGraph {
    const store = this.store;
    if (!store) {
      return {
        nodes: [],
        edges: [],
        summary: {
          requirements: 0,
          complianceGapsWithWork: 0,
          complianceGapsWithoutWork: 0,
          blockedOrOverdueActions: 0,
          directionsNeedingResponse: 0,
        },
      };
    }

    return buildRelationshipMapGraph({
      compliance: store.compliance.value,
      risks: store.risks.value,
      actions: store.actions.value,
      directions: store.directions.value,
      relationships: store.relationships.value,
      workTracking: store.workTracking.value,
      visibility: {
        requirements: this.showRequirements,
        risks: this.showRisks,
        actions: this.showActions,
        directions: this.showDirections,
      },
    });
  }

  #renderInspector(node: MapNode | undefined): TemplateResult {
    if (!node) {
      return html`<aside class="inspector" aria-label="Selected map item">
        <h3>Selection</h3>
        <p>Select a node to inspect compliance and connected work.</p>
      </aside>`;
    }

    return html`<aside class="inspector" aria-label="Selected map item" data-testid="map-inspector">
      <h3>${node.label}</h3>
      <p>${node.detail}</p>
      <div class="pill-row">${this.#nodePills(node)}</div>
      ${node.kind === 'requirement' ? this.#requirementDetails(node) : this.#workNodeDetails(node)}
      <p><a href=${node.href}>Open source record</a></p>
    </aside>`;
  }

  #nodePills(node: MapNode): TemplateResult {
    if (node.kind === 'requirement') {
      return html`<span class="pill"
        >${mapComplianceLabel(node.complianceState ?? 'not-set')}</span
      >`;
    }
    if (node.kind === 'risk') {
      return html`<span class="pill">${node.riskStatus}</span
        ><span class="pill">${node.riskBand}</span>`;
    }
    if (node.kind === 'action') {
      return html`<span class="pill">${node.actionStatus}</span>${node.actionOverdue
          ? html`<span class="pill">Overdue</span>`
          : ''}`;
    }
    return html`<span class="pill"
      >${mapDirectionResponseLabel(node.directionResponseState ?? 'not-set')}</span
    >`;
  }

  #requirementDetails(node: MapNode): TemplateResult {
    const work = node.work;
    if (!work) return html``;
    return html`<dl>
      <dt>Risks</dt>
      <dd>${work.openRiskCount} open / ${work.riskCount} total</dd>
      <dt>Actions</dt>
      <dd>${work.activeActionCount} active / ${work.actionCount} total</dd>
      <dt>Blocked/overdue</dt>
      <dd>${work.blockedOrOverdueActionCount}</dd>
      <dt>Directions</dt>
      <dd>
        ${work.directionsNeedingResponseCount} needing response / ${work.directionCount} total
      </dd>
      <dt>Work log</dt>
      <dd>${work.workLogCount} entries</dd>
      <dt>Evidence</dt>
      <dd>${work.evidenceCount} items</dd>
    </dl>`;
  }

  #workNodeDetails(node: MapNode): TemplateResult {
    return html`<dl>
      <dt>Type</dt>
      <dd>${node.kind}</dd>
      <dt>Connection</dt>
      <dd>Use the connection list to see the linked requirements and work items.</dd>
    </dl>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-relationship-map-view': RelationshipMapView;
  }
}

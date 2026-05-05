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
import { designTokens } from '../app/design-tokens.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';

type NodeKind = 'requirement' | 'risk' | 'action' | 'direction';

interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
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
        margin: 0 0 var(--space-3) 0;
        font-size: var(--text-xl);
      }
      .toolbar {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: var(--space-2);
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
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () =>
    this.store
      ? [this.store.risks, this.store.actions, this.store.directions, this.store.relationships]
      : [],
  );

  @state() private accessor showRequirements = true;
  @state() private accessor showRisks = true;
  @state() private accessor showActions = true;
  @state() private accessor showDirections = true;

  #cy: { destroy: () => void } | null = null;
  #canvas: HTMLDivElement | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cy?.destroy();
    this.#cy = null;
  }

  override render(): TemplateResult {
    const { nodes, edges } = this.#buildGraph();

    return html`
      <article>
        <h2>Relationship map</h2>
        <p>
          Visualises cross-links between requirements, risks, actions and directions. Use the
          keyboard-accessible adjacency list at the bottom if you prefer text.
        </p>

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

        <div class="stage">
          ${nodes.length === 0
            ? html`<div class="empty" data-testid="empty">
                No relationships to display. Link risks/actions to requirements, or add
                relationships from the Relationships page.
              </div>`
            : html`<div class="canvas" data-testid="map-canvas" ${ref(this.#onCanvasRef)}></div>`}
        </div>

        <details class="fallback" ?open=${nodes.length > 0 && nodes.length <= 30}>
          <summary>Adjacency list (text fallback)</summary>
          <table aria-label="Adjacency list">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Kind</th>
              </tr>
            </thead>
            <tbody data-testid="adjacency">
              ${edges.map((e) => {
                const src = nodes.find((n) => n.id === e.source);
                const tgt = nodes.find((n) => n.id === e.target);
                return html`<tr>
                  <td>${src?.label ?? e.source}</td>
                  <td>${tgt?.label ?? e.target}</td>
                  <td>${e.kind}</td>
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
    const { nodes, edges } = this.#buildGraph();
    if (nodes.length === 0) return;

    const cytoscapeModule = await import('cytoscape');
    const cytoscape = cytoscapeModule.default;
    this.#cy?.destroy();

    const elements = [
      ...nodes.map((n) => ({ data: { id: n.id, label: n.label, kind: n.kind } })),
      ...edges.map((e) => ({
        data: { id: e.id, source: e.source, target: e.target, kind: e.kind },
      })),
    ];

    this.#cy = cytoscape({
      container: this.#canvas,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1d4ed8',
            label: 'data(label)',
            color: '#0f172a',
            'font-size': 11,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            width: 18,
            height: 18,
          },
        },
        {
          selector: 'node[kind = "requirement"]',
          style: { 'background-color': '#1d4ed8' },
        },
        {
          selector: 'node[kind = "risk"]',
          style: { 'background-color': '#dc2626', shape: 'diamond' },
        },
        {
          selector: 'node[kind = "action"]',
          style: { 'background-color': '#059669', shape: 'round-rectangle' },
        },
        {
          selector: 'node[kind = "direction"]',
          style: { 'background-color': '#7c3aed', shape: 'triangle' },
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
      ],
      layout: { name: 'cose', animate: false, fit: true, padding: 16 },
    });
  }

  override updated(): void {
    void this.#renderCytoscape();
  }

  #buildGraph(): { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] } {
    const store = this.store;
    if (!store) return { nodes: [], edges: [] };

    const risks = store.risks.value;
    const actions = store.actions.value;
    const directions = store.directions.value;
    const relationships = store.relationships.value;

    const nodeMap = new Map<string, GraphNode>();
    const addNode = (n: GraphNode): void => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
    };

    if (this.showRisks) {
      for (const r of risks) addNode({ id: r.id, label: r.title, kind: 'risk' });
    }
    if (this.showActions) {
      for (const a of actions) addNode({ id: a.id, label: a.title, kind: 'action' });
    }
    if (this.showDirections) {
      for (const d of directions) addNode({ id: d.id, label: d.reference, kind: 'direction' });
    }

    const edgeMap = new Map<string, GraphEdge>();
    const addEdge = (source: string, target: string, kind: string): void => {
      const id = `${kind}:${source}->${target}`;
      if (edgeMap.has(id)) return;
      edgeMap.set(id, { id, source, target, kind });
    };

    const ensureRequirementNode = (reqId: string): void => {
      if (!this.showRequirements) return;
      addNode({ id: reqId, label: reqId, kind: 'requirement' });
    };

    if (this.showRisks) {
      for (const r of risks) {
        if (this.showRequirements) {
          for (const rid of r.requirementIds) {
            ensureRequirementNode(rid);
            addEdge(rid, r.id, 'requirement-risk');
          }
        }
        if (this.showActions) {
          for (const aid of r.actionIds) addEdge(r.id, aid, 'risk-action');
        }
      }
    }
    if (this.showActions) {
      for (const a of actions) {
        if (this.showRequirements) {
          for (const rid of a.requirementIds) {
            ensureRequirementNode(rid);
            addEdge(rid, a.id, 'requirement-action');
          }
        }
        if (this.showRisks) {
          for (const riskId of a.riskIds) addEdge(riskId, a.id, 'risk-action');
        }
      }
    }
    if (this.showDirections && this.showRequirements) {
      for (const d of directions) {
        for (const rid of d.requirementIds) {
          ensureRequirementNode(rid);
          addEdge(rid, d.id, 'requirement-direction');
        }
      }
    }

    // Stored Relationship records
    for (const rel of relationships) {
      const [a, b] = rel.endpoints;
      // Only render if both endpoints exist as visible nodes (or are
      // requirements & visible).
      const isReq = (s: string): boolean => /^[A-Z]+-\d+$/.test(s);
      if (isReq(a)) ensureRequirementNode(a);
      if (isReq(b)) ensureRequirementNode(b);
      if (nodeMap.has(a) && nodeMap.has(b)) {
        addEdge(a, b, rel.kind);
      }
    }

    return { nodes: [...nodeMap.values()], edges: [...edgeMap.values()] };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-relationship-map-view': RelationshipMapView;
  }
}

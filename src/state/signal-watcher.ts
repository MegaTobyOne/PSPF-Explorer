/**
 * SignalWatcher: a Lit ReactiveController that re-renders the host when any
 * of the supplied signals change.
 *
 * Usage:
 *   class MyView extends LitElement {
 *     #watcher = new SignalWatcher(this, () => [appStore.compliance, appStore.risks]);
 *     render() { ... appStore.compliance.value ... }
 *   }
 */

import { effect, type ReadonlySignal } from '@preact/signals-core';
import type { ReactiveController, ReactiveControllerHost } from 'lit';

type SignalList = readonly ReadonlySignal<unknown>[];

export class SignalWatcher implements ReactiveController {
  #host: ReactiveControllerHost;
  #read: () => SignalList;
  #dispose: (() => void) | undefined;
  #initialised = false;

  constructor(host: ReactiveControllerHost, read: () => SignalList) {
    this.#host = host;
    this.#read = read;
    host.addController(this);
  }

  hostConnected(): void {
    this.#dispose = effect(() => {
      // Read each signal's value to register a dependency.
      for (const s of this.#read()) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- intentional dependency read
        s.value;
      }
      if (this.#initialised) this.#host.requestUpdate();
      this.#initialised = true;
    });
  }

  hostDisconnected(): void {
    this.#dispose?.();
    this.#dispose = undefined;
    this.#initialised = false;
  }
}

import type { SwarmStepEvent } from "@nexus/shared";

/**
 * Event bus for the live terminal.
 * Every meaningful action the swarm takes is emitted so the UI can show
 * exactly what is being built, by whom, and why — in real time.
 */
export type SwarmEventHandler = (event: SwarmStepEvent) => void | Promise<void>;

export class SwarmEventBus {
  private handlers: SwarmEventHandler[] = [];

  on(handler: SwarmEventHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  async emit(event: Omit<SwarmStepEvent, "timestamp"> & { timestamp?: string }) {
    const full: SwarmStepEvent = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
    for (const h of this.handlers) {
      await h(full);
    }
  }
}

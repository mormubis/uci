type EventMap = {
  [key: string]: (...args: any[]) => void;
};

class EventEmitter<Events extends EventMap = EventMap> {
  private callbacks: Partial<{ [key in keyof Events]: Events[key][] }> = {};

  off<E extends keyof Events>(event: E, listener: Events[E]): void {
    const events = this.callbacks[event];

    this.callbacks[event] = events?.filter((cb) => cb !== listener);
  }

  on<E extends keyof Events>(event: E, listener: Events[E]): void {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }

    this.callbacks[event]?.push(listener);
  }

  emit<E extends keyof Events>(event: E, ...argv: Parameters<Events[E]>): void {
    this.callbacks[event]?.forEach((cb) => cb(...argv));
  }
}

export default EventEmitter;

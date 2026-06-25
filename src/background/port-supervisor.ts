export interface PortSupervisorOptions {
  maxQueuedMessages: number;
  maxReconnectAttempts: number;
  reconnectBaseDelayMs: number;
}

export class PortSupervisor {
  private port: chrome.runtime.Port | null = null;
  private disconnected = true;
  private reconnectAttempts = 0;
  private readonly queue: unknown[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    private readonly connect: () => chrome.runtime.Port,
    private readonly options: PortSupervisorOptions
  ) {
    if (
      !Number.isInteger(options.maxQueuedMessages) ||
      options.maxQueuedMessages < 1 ||
      !Number.isInteger(options.maxReconnectAttempts) ||
      options.maxReconnectAttempts < 0 ||
      !Number.isFinite(options.reconnectBaseDelayMs) ||
      options.reconnectBaseDelayMs < 0
    )
      throw new Error('Invalid port supervisor options');
  }

  public start(): void {
    if (this.port) return;
    this.attach();
  }

  public post(message: unknown): boolean {
    if (this.port && !this.disconnected) {
      try {
        this.port.postMessage(message);
        return true;
      } catch {
        this.handleDisconnect();
      }
    }
    if (this.queue.length >= this.options.maxQueuedMessages) this.queue.shift();
    this.queue.push(message);
    return false;
  }

  public stop(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const port = this.port;
    this.port = null;
    this.disconnected = true;
    this.queue.length = 0;
    if (port) {
      try {
        port.disconnect();
      } catch {
        // Idempotent cleanup: already-disconnected ports are harmless.
      }
    }
  }

  public snapshot(): Readonly<{
    connected: boolean;
    queuedMessages: number;
    reconnectAttempts: number;
  }> {
    return Object.freeze({
      connected: this.port !== null && !this.disconnected,
      queuedMessages: this.queue.length,
      reconnectAttempts: this.reconnectAttempts,
    });
  }

  private attach(): void {
    try {
      const port = this.connect();
      this.port = port;
      this.disconnected = false;
      this.reconnectAttempts = 0;
      port.onDisconnect.addListener(() => this.handleDisconnect());
      this.flush();
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(): void {
    if (this.disconnected) return;
    this.disconnected = true;
    this.port = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.options.maxReconnectAttempts) return;
    this.reconnectAttempts += 1;
    const delay = this.options.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1);
    this.reconnectTimer = setTimeout(
      () => {
        this.reconnectTimer = null;
        this.attach();
      },
      Math.min(delay, 30_000)
    );
  }

  private flush(): void {
    while (this.port && !this.disconnected && this.queue.length > 0) {
      const message = this.queue.shift();
      try {
        this.port.postMessage(message);
      } catch {
        if (message !== undefined) this.queue.unshift(message);
        this.handleDisconnect();
        break;
      }
    }
  }
}

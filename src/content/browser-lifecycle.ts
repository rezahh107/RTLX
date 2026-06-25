export type BrowserLifecycleState =
  | 'active'
  | 'passive'
  | 'hidden'
  | 'frozen'
  | 'resumed'
  | 'destroyed';

export interface BrowserLifecycleCallbacks {
  onSuspend(reason: 'hidden' | 'prerender'): void;
  onFreeze(reason: 'pagehide' | 'freeze'): void;
  onResume(reason: 'pageshow' | 'resume' | 'visible' | 'activation'): void;
  onDestroy(): void;
}

interface PrerenderDocument extends Document {
  readonly prerendering?: boolean;
}

export class BrowserLifecycleCoordinator {
  private stateValue: BrowserLifecycleState = 'passive';
  private generationValue = 0;
  private registered = false;

  public constructor(
    private readonly callbacks: BrowserLifecycleCallbacks,
    private readonly documentRef: PrerenderDocument = document,
    private readonly windowRef: Window = window
  ) {}

  public start(): void {
    if (this.stateValue === 'destroyed') return;
    this.register();
    if (this.documentRef.prerendering === true) {
      this.transition('passive');
      this.callbacks.onSuspend('prerender');
      return;
    }
    if (this.documentRef.visibilityState === 'hidden') {
      this.transition('hidden');
      this.callbacks.onSuspend('hidden');
      return;
    }
    this.transition('active');
  }

  public state(): BrowserLifecycleState {
    return this.stateValue;
  }

  public generation(): number {
    return this.generationValue;
  }

  public isCurrentGeneration(generation: number): boolean {
    return generation === this.generationValue && this.stateValue !== 'destroyed';
  }

  public canMutate(): boolean {
    return this.stateValue === 'active' || this.stateValue === 'resumed';
  }

  public destroy(): void {
    if (this.stateValue === 'destroyed') return;
    this.generationValue += 1;
    this.transition('destroyed');
    this.unregister();
    this.callbacks.onDestroy();
  }

  private register(): void {
    if (this.registered) return;
    this.documentRef.addEventListener('visibilitychange', this.onVisibilityChange);
    this.documentRef.addEventListener('freeze', this.onFreezeEvent);
    this.documentRef.addEventListener('resume', this.onResumeEvent);
    this.documentRef.addEventListener('prerenderingchange', this.onPrerenderingChange);
    this.windowRef.addEventListener('pagehide', this.onPageHide);
    this.windowRef.addEventListener('pageshow', this.onPageShow);
    this.registered = true;
  }

  private unregister(): void {
    if (!this.registered) return;
    this.documentRef.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.documentRef.removeEventListener('freeze', this.onFreezeEvent);
    this.documentRef.removeEventListener('resume', this.onResumeEvent);
    this.documentRef.removeEventListener('prerenderingchange', this.onPrerenderingChange);
    this.windowRef.removeEventListener('pagehide', this.onPageHide);
    this.windowRef.removeEventListener('pageshow', this.onPageShow);
    this.registered = false;
  }

  private readonly onVisibilityChange = (): void => {
    if (this.stateValue === 'destroyed' || this.stateValue === 'frozen') return;
    if (this.documentRef.visibilityState === 'hidden') {
      this.generationValue += 1;
      this.transition('hidden');
      this.callbacks.onSuspend('hidden');
      return;
    }
    this.resume('visible');
  };

  private readonly onPageHide = (event: Event): void => {
    if (this.stateValue === 'destroyed') return;
    const persisted = 'persisted' in event && event.persisted === true;
    if (!persisted) {
      this.destroy();
      return;
    }
    this.freeze('pagehide');
  };

  private readonly onPageShow = (event: Event): void => {
    if (this.stateValue === 'destroyed') return;
    const persisted = 'persisted' in event && event.persisted === true;
    if (persisted) this.resume('pageshow');
  };

  private readonly onFreezeEvent = (): void => this.freeze('freeze');
  private readonly onResumeEvent = (): void => this.resume('resume');
  private readonly onPrerenderingChange = (): void => {
    if (this.documentRef.prerendering !== true) this.resume('activation');
  };

  private freeze(reason: 'pagehide' | 'freeze'): void {
    if (this.stateValue === 'destroyed' || this.stateValue === 'frozen') return;
    this.generationValue += 1;
    this.transition('frozen');
    this.callbacks.onFreeze(reason);
  }

  private resume(reason: 'pageshow' | 'resume' | 'visible' | 'activation'): void {
    if (this.stateValue === 'destroyed') return;
    if (this.documentRef.prerendering === true) {
      this.transition('passive');
      return;
    }
    this.generationValue += 1;
    this.transition('resumed');
    this.callbacks.onResume(reason);
    if ((this.stateValue as BrowserLifecycleState) !== 'destroyed') this.transition('active');
  }

  private transition(next: BrowserLifecycleState): void {
    this.stateValue = next;
  }
}

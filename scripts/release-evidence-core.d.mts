export type ReleaseGate = Readonly<{ status: string }>;
export declare function normalizeEvidenceStatus(value: unknown): string;
export declare function evaluateReleaseEvidence(gates: readonly ReleaseGate[]): Readonly<{
  status: 'passed' | 'failed' | 'blocked';
  productionReady: boolean;
  exitCode: 0 | 1 | 2;
}>;

export interface SimAdapter {
    readonly name: string;
    readonly displayName: string;
    isAvailable(): boolean;
    connect(): Promise<void>;
    disconnect(): void;
    onTelemetry(callback: (data: unknown) => void): () => void;
    onSessionData(callback: (data: unknown) => void): () => void;
    onConnectionState(callback: (state: string) => void): () => void;
    destroy(): void;
}
//# sourceMappingURL=base.d.ts.map
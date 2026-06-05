export interface Profile {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    overlays: Record<string, OverlayConfig>;
    themeId: string;
}
export interface OverlayConfig {
    visible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    enabled: boolean;
    settings: Record<string, unknown>;
}
//# sourceMappingURL=profile.d.ts.map
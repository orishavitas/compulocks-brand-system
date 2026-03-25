// adapters/types.ts
// Canonical entity types and adapter protocol for the Compulocks Sync Platform.
// All platform adapters normalize their native data into these forms.

export type EntityType = "token" | "component" | "textStyle";

// ---------------------------------------------------------------------------
// Canonical entity shapes
// ---------------------------------------------------------------------------

export interface Token {
  id: string;             // e.g. "color.brand.primary"
  type: "color" | "dimension" | "fontFamily" | "fontWeight" | "other";
  value: string | number;
  description?: string;
  group?: string;
}

export interface Component {
  id: string;             // e.g. "Button"
  variants: string[];
  states: string[];
  hash: string;
}

export interface TextStyle {
  id: string;             // e.g. "textStyle.bigShortTitle"
  fontFamily: string;
  fontWeight: number;
  fontSize?: number;
  lineHeight?: number;
}

export type CanonicalEntity = Token | Component | TextStyle;

// ---------------------------------------------------------------------------
// EntitySnapshot — what agents report to the Librarian
// ---------------------------------------------------------------------------

export interface EntitySnapshot {
  entityId: string;
  entityType: EntityType;
  source: string;           // adapter name: "figma" | "storybook" | "github"
  capturedAt: string;       // ISO8601
  hash: string;             // SHA-1 of stable JSON stringification
  value: CanonicalEntity;
  raw?: unknown;            // platform-native form, for debugging
}

// ---------------------------------------------------------------------------
// Adapter protocol
// ---------------------------------------------------------------------------

export interface AdapterCapabilities {
  canRead: boolean;
  canWrite: boolean;
  entityTypes: EntityType[];
}

export interface PlatformAdapter {
  readonly name: string;
  readonly capabilities: AdapterCapabilities;

  /** Fetch all entities from this source, normalized to canonical form. */
  fetchAll(): Promise<EntitySnapshot[]>;

  /** Write an entity back to this source. Only valid if canWrite === true. */
  write(entity: CanonicalEntity, entityType: EntityType): Promise<void>;

  /** Health check — is this source reachable? */
  ping(): Promise<{ ok: boolean; message?: string }>;
}

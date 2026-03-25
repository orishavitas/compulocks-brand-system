// adapters/figma/types.ts
// Raw Figma API / Plugin API response shapes.
// These are NOT canonical — they get transformed before entering the system.

export interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  defaultModeId: string;
  variableIds: string[];
}

export interface FigmaVariable {
  id: string;
  name: string;           // e.g. "color/brand/primary"
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  valuesByMode: Record<string, FigmaVariableValue>;
  description: string;
  hiddenFromPublishing: boolean;
}

export type FigmaVariableValue =
  | { r: number; g: number; b: number; a: number }   // COLOR
  | number                                              // FLOAT
  | string                                              // STRING
  | boolean;                                            // BOOLEAN

export interface FigmaTextStyle {
  id: string;
  name: string;
  fontName: { family: string; style: string };
  fontSize: number;
  lineHeightUnit: "AUTO" | "PIXELS" | "PERCENT";
  lineHeightValue?: number;
  letterSpacing: { unit: "PERCENT" | "PIXELS"; value: number };
}

export interface FigmaComponentNode {
  id: string;
  name: string;
  type: "COMPONENT" | "COMPONENT_SET";
  variantProperties?: Record<string, string> | null;
  description: string;
}

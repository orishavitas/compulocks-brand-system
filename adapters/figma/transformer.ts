// adapters/figma/transformer.ts
// Transforms raw Figma API shapes into canonical entity types.
// All functions are stubs — real logic fills in per session.

import type { Token, TextStyle, Component } from "../types";
import type { FigmaVariable, FigmaTextStyle, FigmaComponentNode } from "./types";

/** Convert a Figma COLOR variable value to a CSS hex string. */
function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function figmaVariableToToken(
  variable: FigmaVariable,
  modeId: string
): Token | null {
  // TODO: implement full resolution including variable aliases
  const rawValue = variable.valuesByMode[modeId];
  if (rawValue === undefined) return null;

  const id = variable.name.replace(/\//g, ".");

  if (variable.resolvedType === "COLOR" && typeof rawValue === "object" && "r" in rawValue) {
    return {
      id,
      type: "color",
      value: rgbaToHex(rawValue.r, rawValue.g, rawValue.b),
      description: variable.description || undefined,
    };
  }

  if (variable.resolvedType === "FLOAT" && typeof rawValue === "number") {
    return {
      id,
      type: "dimension",
      value: rawValue,
      description: variable.description || undefined,
    };
  }

  if (variable.resolvedType === "STRING" && typeof rawValue === "string") {
    return {
      id,
      type: "other",
      value: rawValue,
      description: variable.description || undefined,
    };
  }

  return null;
}

export function figmaTextStyleToTextStyle(style: FigmaTextStyle): TextStyle | null {
  // TODO: full implementation
  return {
    id: `textStyle.${style.name.replace(/\s+/g, "")}`,
    fontFamily: style.fontName.family,
    fontWeight: style.fontName.style === "Bold" ? 700 : 400,
    fontSize: style.fontSize,
    lineHeight: style.lineHeightUnit === "PIXELS" ? style.lineHeightValue : undefined,
  };
}

export function figmaComponentToComponent(node: FigmaComponentNode): Component | null {
  // TODO: full implementation
  return {
    id: node.name,
    variants: node.variantProperties ? Object.keys(node.variantProperties) : [],
    states: [],
    hash: "",   // computed by hashEntity() in diff.ts
  };
}

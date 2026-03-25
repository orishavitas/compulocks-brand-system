// adapters/github/transformer.ts
// Transforms DTCG token JSON entries into canonical Token entities.

import type { Token } from "../types";

/** W3C DTCG 2025.10 token shape */
export interface DTCGToken {
  $value: string | number;
  $type?: string;
  $description?: string;
}

/** Flat map of token path → DTCGToken, as produced by tokens/*.json */
export type DTCGTokenFile = Record<string, DTCGToken | Record<string, unknown>>;

function mapDtcgType(dtcgType?: string): Token["type"] {
  switch (dtcgType) {
    case "color": return "color";
    case "dimension": return "dimension";
    case "fontFamily": return "fontFamily";
    case "fontWeight": return "fontWeight";
    default: return "other";
  }
}

/**
 * Convert a flat DTCG token entry to a canonical Token.
 * @param id   Dot-path token id, e.g. "color.brand.primary"
 * @param token The DTCG token object
 */
export function dtcgTokenToToken(id: string, token: DTCGToken): Token {
  return {
    id,
    type: mapDtcgType(token.$type),
    value: token.$value,
    description: token.$description,
  };
}

/**
 * Flatten a nested DTCG token file into a flat id → DTCGToken map.
 * Recursively traverses until it finds objects with a $value key.
 */
export function flattenDTCG(
  obj: Record<string, unknown>,
  prefix = ""
): Map<string, DTCGToken> {
  const result = new Map<string, DTCGToken>();

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;   // skip metadata keys at root
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      typeof val === "object" &&
      val !== null &&
      "$value" in val
    ) {
      result.set(path, val as DTCGToken);
    } else if (typeof val === "object" && val !== null) {
      for (const [subPath, subToken] of flattenDTCG(
        val as Record<string, unknown>,
        path
      )) {
        result.set(subPath, subToken);
      }
    }
  }

  return result;
}

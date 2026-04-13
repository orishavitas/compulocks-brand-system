"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // figma-plugin/code.ts
  var require_code = __commonJS({
    "figma-plugin/code.ts"(exports) {
      figma.showUI(__html__, { width: 320, height: 360 });
      function applyVariables(data) {
        return __async(this, null, function* () {
          let count = 0;
          if (!data || !data.collections) throw new Error("No collections in pull response");
          for (const collection of data.collections) {
            const existingCollections = figma.variables.getLocalVariableCollections();
            let varCollection = existingCollections.find((c) => c.name === collection.name);
            if (!varCollection) {
              varCollection = figma.variables.createVariableCollection(collection.name);
            }
            const modeId = varCollection.modes[0].modeId;
            for (const v of collection.variables) {
              const existing = figma.variables.getLocalVariables().find(
                (lv) => lv.name === v.name && lv.variableCollectionId === varCollection.id
              );
              let figmaVar;
              if (existing) {
                figmaVar = existing;
              } else {
                const resolvedType = v.type === "COLOR" ? "COLOR" : "FLOAT";
                figmaVar = figma.variables.createVariable(v.name, varCollection, resolvedType);
              }
              if (v.type === "COLOR") {
                figmaVar.setValueForMode(modeId, v.value);
              } else {
                figmaVar.setValueForMode(modeId, v.value);
              }
              figmaVar.description = v.description;
              count++;
            }
          }
          if (data.textStyles) {
            for (const ts of data.textStyles) {
              const existing = figma.getLocalTextStyles().find((s) => s.name === ts.name);
              let style;
              if (existing) {
                style = existing;
              } else {
                style = figma.createTextStyle();
                style.name = ts.name;
              }
              const figmaWeight = ts.fontWeight >= 600 ? "SemiBold" : ts.fontWeight >= 500 ? "Medium" : "Regular";
              const figmaStyle = ts.italic ? `${figmaWeight} Italic`.trim() : figmaWeight;
              yield figma.loadFontAsync({ family: ts.fontFamily, style: figmaStyle });
              style.fontName = { family: ts.fontFamily, style: figmaStyle };
              if (ts.fontSize) style.fontSize = ts.fontSize;
              style.description = ts.description;
              count++;
            }
          }
          return count;
        });
      }
      function readVariables() {
        const collections = [];
        for (const vc of figma.variables.getLocalVariableCollections()) {
          const variables = [];
          const modeId = vc.modes[0].modeId;
          for (const varId of vc.variableIds) {
            const v = figma.variables.getVariableById(varId);
            if (!v) continue;
            const value = v.valuesByMode[modeId];
            variables.push({
              name: v.name,
              type: v.resolvedType,
              value,
              description: v.description
            });
          }
          collections.push({ name: vc.name, variables });
        }
        const textStyles = figma.getLocalTextStyles().map((s) => ({
          name: s.name,
          fontFamily: s.fontName.family,
          fontWeight: 400,
          description: s.description
        }));
        return { collections, textStyles };
      }
      function ensurePage(name) {
        const existing = figma.root.children.find(
          (n) => n.type === "PAGE" && n.name === name
        );
        if (existing) return existing;
        const page = figma.createPage();
        page.name = name;
        return page;
      }
      function buildStyleGuidePage(page) {
        return __async(this, null, function* () {
          yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
          for (const node of [...page.children]) {
            if (node.getPluginData("styleGuideSection") !== "") node.remove();
          }
          let yOffset = 0;
          const GAP = 40;
          const colorFrame = figma.createFrame();
          colorFrame.name = "Colors";
          colorFrame.setPluginData("styleGuideSection", "colors");
          colorFrame.layoutMode = "HORIZONTAL";
          colorFrame.itemSpacing = 16;
          colorFrame.paddingLeft = colorFrame.paddingRight = 16;
          colorFrame.paddingTop = colorFrame.paddingBottom = 16;
          colorFrame.fills = [{ type: "SOLID", color: { r: 0.12, g: 0.12, b: 0.12 } }];
          colorFrame.primaryAxisSizingMode = "AUTO";
          colorFrame.counterAxisSizingMode = "AUTO";
          const colorVars = figma.variables.getLocalVariables().filter((v) => v.resolvedType === "COLOR");
          for (const v of colorVars) {
            const value = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
            const rgba = value;
            const swatch = figma.createFrame();
            swatch.name = v.name;
            swatch.resize(80, 80);
            swatch.fills = [{ type: "SOLID", color: { r: rgba.r, g: rgba.g, b: rgba.b }, opacity: rgba.a }];
            swatch.cornerRadius = 6;
            const label = figma.createText();
            label.fontName = { family: "Inter", style: "Regular" };
            label.characters = v.name;
            label.fontSize = 8;
            label.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            label.x = 4;
            label.y = 60;
            swatch.appendChild(label);
            colorFrame.appendChild(swatch);
          }
          page.appendChild(colorFrame);
          colorFrame.x = 0;
          colorFrame.y = yOffset;
          yOffset += colorFrame.height + GAP;
          const BARLOW_CONDENSED = "Barlow Condensed";
          const BARLOW = "Barlow";
          const typoSpecs = [
            { name: "bigShortTitle", family: BARLOW_CONDENSED, style: "Medium", size: 40, label: "bigShortTitle \u2014 BIG SHORT TITLE" },
            { name: "bigLongTitle", family: BARLOW_CONDENSED, style: "Medium", size: 32, label: "bigLongTitle \u2014 Big Long Title" },
            { name: "bigParagraph", family: BARLOW_CONDENSED, style: "Regular", size: 24, label: "bigParagraph \u2014 big paragraph text" },
            { name: "smallParagraph", family: BARLOW, style: "Regular", size: 16, label: "smallParagraph \u2014 small paragraph text" },
            { name: "smallText", family: BARLOW, style: "Italic", size: 12, label: "smallText \u2014 small italic caption" }
          ];
          for (const spec of typoSpecs) {
            yield figma.loadFontAsync({ family: spec.family, style: spec.style });
          }
          const typoFrame = figma.createFrame();
          typoFrame.name = "Typography";
          typoFrame.setPluginData("styleGuideSection", "typography");
          typoFrame.layoutMode = "VERTICAL";
          typoFrame.itemSpacing = 24;
          typoFrame.paddingLeft = typoFrame.paddingRight = 24;
          typoFrame.paddingTop = typoFrame.paddingBottom = 24;
          typoFrame.fills = [{ type: "SOLID", color: { r: 0.12, g: 0.12, b: 0.12 } }];
          typoFrame.primaryAxisSizingMode = "AUTO";
          typoFrame.counterAxisSizingMode = "AUTO";
          for (const spec of typoSpecs) {
            const textNode = figma.createText();
            textNode.fontName = { family: spec.family, style: spec.style };
            textNode.fontSize = spec.size;
            textNode.characters = spec.label;
            textNode.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            typoFrame.appendChild(textNode);
          }
          page.appendChild(typoFrame);
          typoFrame.x = 0;
          typoFrame.y = yOffset;
          yOffset += typoFrame.height + GAP;
          const spacingFrame = figma.createFrame();
          spacingFrame.name = "Spacing Scale";
          spacingFrame.setPluginData("styleGuideSection", "spacing");
          spacingFrame.layoutMode = "HORIZONTAL";
          spacingFrame.itemSpacing = 8;
          spacingFrame.paddingLeft = spacingFrame.paddingRight = 16;
          spacingFrame.paddingTop = spacingFrame.paddingBottom = 16;
          spacingFrame.fills = [{ type: "SOLID", color: { r: 0.12, g: 0.12, b: 0.12 } }];
          spacingFrame.primaryAxisSizingMode = "AUTO";
          spacingFrame.counterAxisSizingMode = "AUTO";
          const floatVars = figma.variables.getLocalVariables().filter((v) => v.resolvedType === "FLOAT");
          for (const v of floatVars) {
            const value = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
            const px = value;
            const bar = figma.createFrame();
            bar.name = v.name;
            bar.resize(Math.max(4, px), Math.max(4, px));
            bar.fills = [{ type: "SOLID", color: { r: 0.11, g: 0.63, b: 0.49 } }];
            const barLabel = figma.createText();
            barLabel.fontName = { family: "Inter", style: "Regular" };
            barLabel.characters = v.name;
            barLabel.fontSize = 8;
            barLabel.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            barLabel.x = 2;
            barLabel.y = 2;
            bar.appendChild(barLabel);
            spacingFrame.appendChild(bar);
          }
          page.appendChild(spacingFrame);
          spacingFrame.x = 0;
          spacingFrame.y = yOffset;
        });
      }
      function getColorToken(name) {
        const v = figma.variables.getLocalVariables().find(
          (lv) => lv.resolvedType === "COLOR" && lv.name === name
        );
        if (!v) return null;
        const modeId = Object.keys(v.valuesByMode)[0];
        return v.valuesByMode[modeId];
      }
      function hexToRgba(hex) {
        const h = hex.replace("#", "");
        return {
          r: parseInt(h.slice(0, 2), 16) / 255,
          g: parseInt(h.slice(2, 4), 16) / 255,
          b: parseInt(h.slice(4, 6), 16) / 255,
          a: 1
        };
      }
      var COLOR = {
        navy: hexToRgba("#1D1F4A"),
        green: hexToRgba("#009966"),
        surface: hexToRgba("#F2F2F2"),
        white: hexToRgba("#FFFFFF"),
        outline: hexToRgba("#E0E0E0"),
        purple: hexToRgba("#7B61FF"),
        error: hexToRgba("#B00020"),
        neutral: hexToRgba("#555555")
      };
      function resolveColor(tokenName, fallback) {
        var _a;
        return (_a = getColorToken(tokenName)) != null ? _a : fallback;
      }
      function solidFill(color) {
        return { type: "SOLID", color: { r: color.r, g: color.g, b: color.b }, opacity: color.a };
      }
      function renderComponentNode(componentName, variant) {
        return __async(this, null, function* () {
          const node = figma.createComponent();
          node.name = `variant=${variant}`;
          node.layoutMode = "HORIZONTAL";
          node.primaryAxisAlignItems = "CENTER";
          node.counterAxisAlignItems = "CENTER";
          node.primaryAxisSizingMode = "AUTO";
          node.counterAxisSizingMode = "AUTO";
          const lowerName = componentName.toLowerCase();
          const lowerVariant = variant.toLowerCase();
          const isDisabled = lowerVariant === "disabled";
          const isSelected = lowerVariant === "selected";
          const isError = lowerVariant === "error";
          if (lowerName === "button") {
            node.cornerRadius = 9999;
            node.paddingLeft = node.paddingRight = 20;
            node.paddingTop = node.paddingBottom = 10;
            let bg;
            let fg = COLOR.white;
            let hasStroke = false;
            if (lowerVariant === "cta") {
              bg = resolveColor("color/brand/green-dark", COLOR.green);
            } else if (lowerVariant === "secondary") {
              bg = { r: 1, g: 1, b: 1, a: 0 };
              fg = resolveColor("color/brand/primary", COLOR.navy);
              hasStroke = true;
            } else if (lowerVariant === "ghost") {
              bg = { r: 0, g: 0, b: 0, a: 0 };
              fg = resolveColor("color/brand/primary", COLOR.navy);
            } else {
              bg = resolveColor("color/brand/primary", COLOR.navy);
            }
            node.fills = [solidFill(bg)];
            if (hasStroke) {
              node.strokes = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
              node.strokeWeight = 1.5;
            }
            const label = figma.createText();
            label.fontName = { family: "Inter", style: "SemiBold" };
            label.characters = lowerVariant === "loading" ? "Loading..." : variant;
            label.fontSize = 14;
            label.fills = [solidFill(fg)];
            node.appendChild(label);
            if (isDisabled) node.opacity = 0.5;
          } else if (lowerName === "badge") {
            node.resize(80, 28);
            node.cornerRadius = 9999;
            node.paddingLeft = node.paddingRight = 12;
            node.paddingTop = node.paddingBottom = 4;
            let bg;
            let fg = COLOR.white;
            if (lowerVariant === "success") {
              bg = resolveColor("color/brand/green-dark", COLOR.green);
            } else if (lowerVariant === "error") {
              bg = COLOR.error;
            } else if (lowerVariant === "neutral") {
              bg = COLOR.neutral;
            } else if (lowerVariant === "tonal") {
              bg = __spreadProps(__spreadValues({}, resolveColor("color/brand/primary", COLOR.navy)), { a: 0.12 });
              fg = resolveColor("color/brand/primary", COLOR.navy);
            } else {
              bg = resolveColor("color/brand/primary", COLOR.navy);
            }
            node.fills = [solidFill(bg)];
            const label = figma.createText();
            label.fontName = { family: "Inter", style: "Medium" };
            label.characters = variant.charAt(0).toUpperCase() + variant.slice(1);
            label.fontSize = 12;
            label.fills = [solidFill(fg)];
            node.appendChild(label);
          } else if (lowerName === "tag") {
            node.resize(80, 32);
            node.cornerRadius = 9999;
            node.paddingLeft = node.paddingRight = 12;
            node.paddingTop = node.paddingBottom = 6;
            node.fills = [solidFill(resolveColor("color/brand/surface", COLOR.surface))];
            node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = 1;
            const label = figma.createText();
            label.fontName = { family: "Inter", style: "Regular" };
            label.characters = variant.charAt(0).toUpperCase() + variant.slice(1);
            label.fontSize = 12;
            label.fills = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
            node.appendChild(label);
          } else if (lowerName === "chip") {
            node.resize(90, 32);
            node.cornerRadius = 9999;
            node.paddingLeft = node.paddingRight = 16;
            node.paddingTop = node.paddingBottom = 6;
            const selected = isSelected;
            const bg = selected ? resolveColor("color/brand/primary", COLOR.navy) : resolveColor("color/brand/surface", COLOR.surface);
            const fg = selected ? COLOR.white : resolveColor("color/brand/primary", COLOR.navy);
            node.fills = [solidFill(bg)];
            if (!selected) {
              node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
              node.strokeWeight = 1;
            }
            const label = figma.createText();
            label.fontName = { family: "Inter", style: "Regular" };
            label.characters = variant.charAt(0).toUpperCase() + variant.slice(1);
            label.fontSize = 12;
            label.fills = [solidFill(fg)];
            node.appendChild(label);
          } else if (lowerName === "card") {
            node.resize(240, 120);
            node.cornerRadius = 24;
            node.paddingLeft = node.paddingRight = 24;
            node.paddingTop = node.paddingBottom = 24;
            node.layoutMode = "VERTICAL";
            node.itemSpacing = 8;
            node.primaryAxisSizingMode = "FIXED";
            node.counterAxisSizingMode = "FIXED";
            node.fills = [solidFill(resolveColor("color/brand/surface", COLOR.surface))];
            node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = 1;
            if (lowerVariant === "elevated") {
              node.effects = [{
                type: "DROP_SHADOW",
                color: { r: 0.11, g: 0.13, b: 0.29, a: 0.12 },
                offset: { x: 0, y: 2 },
                radius: 8,
                spread: 0,
                visible: true,
                blendMode: "NORMAL"
              }];
            }
            const title = figma.createText();
            title.fontName = { family: "Inter", style: "SemiBold" };
            title.characters = `Card \u2014 ${variant}`;
            title.fontSize = 14;
            title.fills = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
            node.appendChild(title);
            const sub = figma.createText();
            sub.fontName = { family: "Inter", style: "Regular" };
            sub.characters = lowerVariant === "elevated" ? "With drop shadow" : "Default surface";
            sub.fontSize = 12;
            sub.fills = [solidFill(COLOR.neutral)];
            node.appendChild(sub);
          } else if (lowerName === "input") {
            node.resize(200, 48);
            node.cornerRadius = 8;
            node.paddingLeft = node.paddingRight = 12;
            node.paddingTop = node.paddingBottom = 12;
            node.layoutMode = "HORIZONTAL";
            node.fills = [solidFill(hexToRgba("#FDFBFF"))];
            node.strokes = [solidFill(isError ? COLOR.error : resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = isError ? 2 : 1;
            const placeholder = figma.createText();
            placeholder.fontName = { family: "Inter", style: "Regular" };
            placeholder.characters = isError ? "Error state" : "Placeholder text";
            placeholder.fontSize = 14;
            placeholder.fills = [solidFill(__spreadProps(__spreadValues({}, COLOR.neutral), { a: isError ? 1 : 0.5 }))];
            node.appendChild(placeholder);
          } else {
            node.resize(160, 48);
            node.cornerRadius = 6;
            node.fills = [solidFill(resolveColor("color/brand/surface", COLOR.surface))];
            node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = 1;
            const label = figma.createText();
            label.fontName = { family: "Inter", style: "Regular" };
            label.characters = `${componentName} / ${variant}`;
            label.fontSize = 10;
            label.fills = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
            label.x = 8;
            label.y = 16;
            node.appendChild(label);
          }
          return node;
        });
      }
      function buildComponentsPage(page, manifest, force = false) {
        return __async(this, null, function* () {
          const result = { created: 0, updated: 0, skipped: 0 };
          let xCursor = 0;
          const COL_GAP = 60;
          yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
          yield figma.loadFontAsync({ family: "Inter", style: "Medium" });
          yield figma.loadFontAsync({ family: "Inter", style: "SemiBold" });
          for (const component of manifest.components) {
            const existing = page.children.find(
              (n) => n.type === "COMPONENT_SET" && n.name === component.name
            );
            if (existing) {
              const storedHash = existing.getPluginData("manifestHash");
              if (!force && storedHash === component.hash) {
                result.skipped++;
                xCursor += existing.width + COL_GAP;
                continue;
              }
              existing.remove();
            }
            const childNodes = [];
            const variantList = component.variants.length > 0 ? component.variants : ["Default"];
            for (const variant of variantList) {
              const node = yield renderComponentNode(component.name, variant);
              page.appendChild(node);
              childNodes.push(node);
            }
            let setWidth;
            if (childNodes.length === 1) {
              childNodes[0].setPluginData("manifestHash", component.hash);
              childNodes[0].x = xCursor;
              childNodes[0].y = 0;
              setWidth = childNodes[0].width;
            } else {
              const componentSet = figma.combineAsVariants(childNodes, page);
              componentSet.name = component.name;
              componentSet.setPluginData("manifestHash", component.hash);
              componentSet.x = xCursor;
              componentSet.y = 0;
              setWidth = componentSet.width;
            }
            xCursor += setWidth + COL_GAP;
            if (existing) {
              result.updated++;
            } else {
              result.created++;
            }
          }
          return result;
        });
      }
      figma.ui.onmessage = (msg) => __async(null, null, function* () {
        var _a;
        if (msg.type === "pull") {
          try {
            const count = yield applyVariables(msg.data);
            figma.ui.postMessage({ type: "pull-complete", count });
          } catch (err) {
            figma.ui.postMessage({ type: "error", message: `Pull error: ${err.message}` });
          }
        }
        if (msg.type === "push-request") {
          try {
            const data = readVariables();
            figma.ui.postMessage({ type: "push-data", data });
          } catch (err) {
            figma.ui.postMessage({ type: "error", message: `Push error: ${err.message}` });
          }
        }
        if (msg.type === "sync-components") {
          try {
            const manifest = msg.manifest;
            const mode = (_a = msg.mode) != null ? _a : "all";
            if (!manifest || !Array.isArray(manifest.components)) {
              throw new Error("Invalid manifest: missing components array");
            }
            const result = { created: 0, updated: 0, skipped: 0 };
            if (mode === "style-guide" || mode === "all") {
              const styleGuidePage = ensurePage("\u{1F3A8} Style Guide");
              figma.currentPage = styleGuidePage;
              yield buildStyleGuidePage(styleGuidePage);
            }
            if (mode === "components" || mode === "all") {
              const componentsPage = ensurePage("\u{1F9E9} Components");
              figma.currentPage = componentsPage;
              const syncResult = yield buildComponentsPage(componentsPage, manifest, true);
              result.created += syncResult.created;
              result.updated += syncResult.updated;
              result.skipped += syncResult.skipped;
            }
            figma.ui.postMessage({
              type: "sync-complete",
              created: result.created,
              updated: result.updated,
              skipped: result.skipped
            });
          } catch (err) {
            figma.ui.postMessage({ type: "sync-error", message: err.message });
          }
        }
      });
    }
  });
  require_code();
})();

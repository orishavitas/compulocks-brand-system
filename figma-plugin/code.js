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
          const lowerName = componentName.toLowerCase();
          const lowerVariant = variant.toLowerCase();
          const isDisabled = lowerVariant === "disabled";
          const isError = lowerVariant === "error";
          const isSelected = lowerVariant === "selected";
          if (lowerName === "button") {
            node.layoutMode = "HORIZONTAL";
            node.primaryAxisAlignItems = "CENTER";
            node.counterAxisAlignItems = "CENTER";
            node.primaryAxisSizingMode = "FIXED";
            node.counterAxisSizingMode = "FIXED";
            node.resize(140, 40);
            node.cornerRadius = 9999;
            node.paddingLeft = node.paddingRight = 20;
            node.paddingTop = node.paddingBottom = 10;
            let bg;
            let fg = COLOR.white;
            if (lowerVariant === "cta") {
              bg = resolveColor("color/brand/green-dark", COLOR.green);
            } else if (lowerVariant === "secondary") {
              bg = { r: 1, g: 1, b: 1, a: 0 };
              fg = resolveColor("color/brand/primary", COLOR.navy);
            } else if (lowerVariant === "ghost") {
              bg = { r: 0, g: 0, b: 0, a: 0 };
              fg = resolveColor("color/brand/primary", COLOR.navy);
            } else {
              bg = resolveColor("color/brand/primary", COLOR.navy);
            }
            node.fills = [solidFill(bg)];
            if (lowerVariant === "secondary") {
              node.strokes = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
              node.strokeWeight = 1.5;
            }
            const t = figma.createText();
            t.fontName = { family: "Inter", style: "SemiBold" };
            t.characters = lowerVariant === "loading" ? "Loading..." : variant;
            t.fontSize = 14;
            t.fills = [solidFill(fg)];
            node.appendChild(t);
            if (isDisabled) node.opacity = 0.5;
          } else if (lowerName === "badge") {
            node.layoutMode = "HORIZONTAL";
            node.primaryAxisAlignItems = "CENTER";
            node.counterAxisAlignItems = "CENTER";
            node.primaryAxisSizingMode = "FIXED";
            node.counterAxisSizingMode = "FIXED";
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
            const t = figma.createText();
            t.fontName = { family: "Inter", style: "Medium" };
            t.characters = variant;
            t.fontSize = 11;
            t.fills = [solidFill(fg)];
            node.appendChild(t);
          } else if (lowerName === "tag") {
            node.layoutMode = "HORIZONTAL";
            node.primaryAxisAlignItems = "CENTER";
            node.counterAxisAlignItems = "CENTER";
            node.primaryAxisSizingMode = "FIXED";
            node.counterAxisSizingMode = "FIXED";
            node.resize(100, 32);
            node.cornerRadius = 9999;
            node.paddingLeft = node.paddingRight = 12;
            node.paddingTop = node.paddingBottom = 6;
            node.fills = [solidFill(resolveColor("color/brand/surface", COLOR.surface))];
            node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = 1;
            const t = figma.createText();
            t.fontName = { family: "Inter", style: "Regular" };
            t.characters = lowerVariant === "removable" ? `${variant}  \xD7` : variant;
            t.fontSize = 12;
            t.fills = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
            node.appendChild(t);
          } else if (lowerName === "chip") {
            node.layoutMode = "HORIZONTAL";
            node.primaryAxisAlignItems = "CENTER";
            node.counterAxisAlignItems = "CENTER";
            node.primaryAxisSizingMode = "FIXED";
            node.counterAxisSizingMode = "FIXED";
            node.resize(100, 32);
            node.cornerRadius = 9999;
            node.paddingLeft = node.paddingRight = 16;
            node.paddingTop = node.paddingBottom = 6;
            const bg = isSelected ? resolveColor("color/brand/primary", COLOR.navy) : resolveColor("color/brand/surface", COLOR.surface);
            const fg = isSelected ? COLOR.white : resolveColor("color/brand/primary", COLOR.navy);
            node.fills = [solidFill(bg)];
            if (!isSelected) {
              node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
              node.strokeWeight = 1;
            }
            const t = figma.createText();
            t.fontName = { family: "Inter", style: "Regular" };
            t.characters = variant;
            t.fontSize = 12;
            t.fills = [solidFill(fg)];
            node.appendChild(t);
            if (isDisabled) node.opacity = 0.4;
          } else if (lowerName === "card") {
            node.layoutMode = "VERTICAL";
            node.primaryAxisAlignItems = "MIN";
            node.counterAxisAlignItems = "MIN";
            node.primaryAxisSizingMode = "FIXED";
            node.counterAxisSizingMode = "FIXED";
            node.resize(240, 120);
            node.cornerRadius = 24;
            node.paddingLeft = node.paddingRight = 24;
            node.paddingTop = node.paddingBottom = 24;
            node.itemSpacing = 8;
            node.fills = [solidFill(resolveColor("color/brand/surface", COLOR.surface))];
            node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = 1;
            if (lowerVariant === "elevated") {
              node.effects = [{ type: "DROP_SHADOW", color: { r: 0.11, g: 0.13, b: 0.29, a: 0.12 }, offset: { x: 0, y: 2 }, radius: 8, spread: 0, visible: true, blendMode: "NORMAL" }];
            }
            const t1 = figma.createText();
            t1.fontName = { family: "Inter", style: "SemiBold" };
            t1.characters = `Card \u2014 ${variant}`;
            t1.fontSize = 14;
            t1.fills = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
            node.appendChild(t1);
            const t2 = figma.createText();
            t2.fontName = { family: "Inter", style: "Regular" };
            t2.characters = lowerVariant === "elevated" ? "With drop shadow" : "Default surface";
            t2.fontSize = 12;
            t2.fills = [solidFill(COLOR.neutral)];
            node.appendChild(t2);
          } else if (lowerName === "input") {
            node.layoutMode = "HORIZONTAL";
            node.primaryAxisAlignItems = "CENTER";
            node.counterAxisAlignItems = "CENTER";
            node.primaryAxisSizingMode = "FIXED";
            node.counterAxisSizingMode = "FIXED";
            node.resize(200, 48);
            node.cornerRadius = 8;
            node.paddingLeft = node.paddingRight = 12;
            node.paddingTop = node.paddingBottom = 12;
            node.fills = [solidFill(hexToRgba("#FDFBFF"))];
            node.strokes = [solidFill(isError ? COLOR.error : resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = isError ? 2 : 1;
            const t = figma.createText();
            t.fontName = { family: "Inter", style: "Regular" };
            t.characters = isError ? "Error \u2014 invalid value" : "Placeholder text";
            t.fontSize = 14;
            t.fills = [solidFill(__spreadProps(__spreadValues({}, COLOR.neutral), { a: isError ? 1 : 0.5 }))];
            node.appendChild(t);
            if (isDisabled) node.opacity = 0.4;
          } else {
            node.layoutMode = "NONE";
            node.resize(160, 48);
            node.cornerRadius = 6;
            node.fills = [solidFill(resolveColor("color/brand/surface", COLOR.surface))];
            node.strokes = [solidFill(resolveColor("color/brand/outline", COLOR.outline))];
            node.strokeWeight = 1;
            const t = figma.createText();
            t.fontName = { family: "Inter", style: "Regular" };
            t.characters = `${componentName} / ${variant}`;
            t.fontSize = 10;
            t.fills = [solidFill(resolveColor("color/brand/primary", COLOR.navy))];
            t.x = 8;
            t.y = 16;
            node.appendChild(t);
          }
          return node;
        });
      }
      function buildComponentsPage(page, manifest, force = false) {
        return __async(this, null, function* () {
          var _a;
          const result = { created: 0, updated: 0, skipped: 0 };
          let xCursor = 0;
          const COL_GAP = 60;
          yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
          yield figma.loadFontAsync({ family: "Inter", style: "Medium" });
          yield figma.loadFontAsync({ family: "Inter", style: "SemiBold" });
          for (const component of manifest.components) {
            try {
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
              const variantList = component.variants.length > 0 ? component.variants : ["Default"];
              const childNodes = [];
              for (const variant of variantList) {
                const node = yield renderComponentNode(component.name, variant);
                page.appendChild(node);
                childNodes.push(node);
              }
              let setWidth;
              if (childNodes.length === 1) {
                childNodes[0].name = component.name;
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
            } catch (err) {
              figma.ui.postMessage({ type: "sync-error", message: `${component.name}: ${(_a = err == null ? void 0 : err.message) != null ? _a : String(err)}` });
              return result;
            }
          }
          return result;
        });
      }
      figma.ui.onmessage = (msg) => __async(null, null, function* () {
        var _a, _b;
        if (msg.type === "full-pull") {
          try {
            const pullData = {
              collections: msg.collections,
              textStyles: msg.textStyles
            };
            const varCount = yield applyVariables(pullData);
            const manifest = msg.manifest;
            if (!manifest || !Array.isArray(manifest.components)) {
              throw new Error("Invalid manifest: missing components array");
            }
            const styleGuidePage = ensurePage("\u{1F3A8} Style Guide");
            figma.currentPage = styleGuidePage;
            yield buildStyleGuidePage(styleGuidePage);
            const componentsPage = ensurePage("\u{1F9E9} Components");
            figma.currentPage = componentsPage;
            const syncResult = yield buildComponentsPage(componentsPage, manifest, true);
            figma.ui.postMessage({
              type: "full-pull-complete",
              vars: varCount,
              styles: (_b = (_a = pullData.textStyles) == null ? void 0 : _a.length) != null ? _b : 0,
              created: syncResult.created,
              updated: syncResult.updated,
              skipped: syncResult.skipped
            });
          } catch (err) {
            figma.ui.postMessage({ type: "full-pull-error", message: err.message });
          }
        }
      });
    }
  });
  require_code();
})();

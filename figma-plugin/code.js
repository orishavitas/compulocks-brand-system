"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
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
      figma.showUI(__html__, { width: 320, height: 280 });
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
              yield figma.loadFontAsync({ family: ts.fontFamily, style: "Regular" });
              style.fontName = { family: ts.fontFamily, style: "Regular" };
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
          const typoFrame = figma.createFrame();
          typoFrame.name = "Typography";
          typoFrame.setPluginData("styleGuideSection", "typography");
          typoFrame.layoutMode = "VERTICAL";
          typoFrame.itemSpacing = 16;
          typoFrame.paddingLeft = typoFrame.paddingRight = 16;
          typoFrame.paddingTop = typoFrame.paddingBottom = 16;
          typoFrame.fills = [{ type: "SOLID", color: { r: 0.12, g: 0.12, b: 0.12 } }];
          typoFrame.primaryAxisSizingMode = "AUTO";
          typoFrame.counterAxisSizingMode = "AUTO";
          const textStyles = figma.getLocalTextStyles();
          for (const ts of textStyles) {
            yield figma.loadFontAsync(ts.fontName);
            const textNode = figma.createText();
            textNode.fontName = ts.fontName;
            textNode.textStyleId = ts.id;
            textNode.characters = ts.name + " \u2014 The quick brown fox";
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
      function buildComponentsPage(page, manifest) {
        return __async(this, null, function* () {
          const result = { created: 0, updated: 0, skipped: 0 };
          let xCursor = 0;
          const COL_GAP = 60;
          yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
          for (const component of manifest.components) {
            const existing = page.children.find(
              (n) => n.type === "COMPONENT_SET" && n.name === component.name
            );
            if (existing) {
              const storedHash = existing.getPluginData("manifestHash");
              if (storedHash === component.hash) {
                result.skipped++;
                xCursor += existing.width + COL_GAP;
                continue;
              }
              existing.remove();
            }
            const childNodes = [];
            const variantList = component.variants.length > 0 ? component.variants : ["default"];
            const stateList = component.states.length > 0 ? component.states : ["default"];
            for (const variant of variantList) {
              for (const state of stateList) {
                const node = figma.createComponent();
                node.name = `variant=${variant}, state=${state}`;
                node.resize(160, 48);
                node.fills = [{ type: "SOLID", color: { r: 0.11, g: 0.13, b: 0.29 } }];
                const label = figma.createText();
                label.fontName = { family: "Inter", style: "Regular" };
                label.characters = `${component.name} / ${variant} / ${state}`;
                label.fontSize = 10;
                label.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
                label.x = 8;
                label.y = 16;
                node.appendChild(label);
                page.appendChild(node);
                childNodes.push(node);
              }
            }
            const componentSet = figma.combineAsVariants(childNodes, page);
            componentSet.name = component.name;
            componentSet.setPluginData("manifestHash", component.hash);
            componentSet.x = xCursor;
            componentSet.y = 0;
            xCursor += componentSet.width + COL_GAP;
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
            if (!manifest || !Array.isArray(manifest.components)) {
              throw new Error("Invalid manifest: missing components array");
            }
            const styleGuidePage = ensurePage("\u{1F3A8} Style Guide");
            const componentsPage = ensurePage("\u{1F9E9} Components");
            figma.currentPage = styleGuidePage;
            yield buildStyleGuidePage(styleGuidePage);
            figma.currentPage = componentsPage;
            const syncResult = yield buildComponentsPage(componentsPage, manifest);
            figma.ui.postMessage({
              type: "sync-complete",
              created: syncResult.created,
              updated: syncResult.updated,
              skipped: syncResult.skipped
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

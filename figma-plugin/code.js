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
            const value = v.resolveForConsumer({ mode: modeId }).value;
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
      });
    }
  });
  require_code();
})();

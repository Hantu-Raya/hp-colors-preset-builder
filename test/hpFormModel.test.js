import assert from "node:assert/strict";
import test from "node:test";
import { HP_SCHEMA } from "../src/hpSchema.js";
import { buildCategoryGroups, createDefaultFormState, isFieldVisible } from "../src/hpFormModel.js";
import { renderHpForm } from "../src/hpFormRenderer.js";

test("schema groups follow registrar categories", () => {
  const groups = buildCategoryGroups(HP_SCHEMA);
  assert.deepEqual(groups.map((g) => g.category), [
    "GENERAL|Core Behavior",
    "HEALTH BARS|Enemy Colors",
    "VISUAL EFFECTS|Low HP Pulse",
    "HEALTH BARS|Number Overlay",
    "HEALTH BARS|Ally Colors",
    "VISUAL EFFECTS|Kill Marker"
  ]);
  assert.equal(groups[0].fields[0].id, "hp_enabled");
});

test("default state includes all schema ids", () => {
  const state = createDefaultFormState(HP_SCHEMA);
  assert.deepEqual(Object.keys(state), Object.keys(HP_SCHEMA));
});

test("visibility follows visibleWhen rules", () => {
  const state = createDefaultFormState(HP_SCHEMA);
  assert.equal(isFieldVisible(HP_SCHEMA.hp_text_color_low, state), false);
  state.hp_text_color_mode = 1;
  assert.equal(isFieldVisible(HP_SCHEMA.hp_text_color_low, state), true);
});

test("renderer creates grouped DOM controls for schema entries", () => {
  const calls = [];
  const form = makeFakeElement("div", calls);
  const preview = makeFakeElement("pre", calls);
  const document = makeFakeDocument(form, preview, calls);
  const api = renderHpForm({ document, formRoot: form, previewNode: preview, schema: HP_SCHEMA });
  const activeGroupSize = buildCategoryGroups(HP_SCHEMA)[0].fields.length;

  assert.ok(form.children.length > 0);
  assert.ok(form.querySelectorAll("[data-category]").length >= 6);
  assert.equal(form.querySelectorAll("[data-field-id]").length, activeGroupSize);
  assert.ok(preview.textContent.includes("hp_enabled"));
  assert.equal(typeof api.getState, "function");
});

test("renderer setState syncs inputs and visibility", () => {
  const calls = [];
  const form = makeFakeElement("div", calls);
  const preview = makeFakeElement("pre", calls);
  const document = makeFakeDocument(form, preview, calls);
  const api = renderHpForm({ document, formRoot: form, previewNode: preview, schema: HP_SCHEMA });

  const healthBarsBtn = form.querySelectorAll("[data-category]").find((node) => node.attributes?.["data-category"] === "HEALTH BARS");
  healthBarsBtn.listeners.click();
  const enemyColorsBtn = form.querySelectorAll("[data-category]").find((node) => node.attributes?.["data-category"] === "HEALTH BARS|Enemy Colors");
  enemyColorsBtn.listeners.click();
  api.setState({ hp_ult_color_enabled: false, hp_friend_enabled: false, hp_friend_pulse_enabled: true, hp_friend_pulse_color_enabled: true });

  const ultEnabled = findFieldNode(form, "hp_ult_color_enabled");
  const ultCustom = findFieldNode(form, "hp_ult_color_custom");
  assert.equal(ultEnabled.children[1].checked, false);
  assert.equal(ultCustom.hidden, false);
});

function makeFakeDocument(form, preview, calls) {
  return {
    createElement(tag) {
      return makeFakeElement(tag, calls);
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: String(text) };
    },
    querySelector(selector) {
      if (selector === "#builderForm") return form;
      if (selector === "#preview") return preview;
      return null;
    }
  };
}

function makeFakeElement(tagName, calls) {
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    attributes: {},
    dataset: {},
    style: {},
    textContent: "",
    value: "",
    checked: false,
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    replaceChildren(...nextChildren) {
      this.children = [...nextChildren];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name.startsWith("data-")) {
        this.dataset[name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = String(value);
      }
    },
    querySelectorAll(selector) {
      const matches = [];
      const visit = (node) => {
        if (!node || typeof node !== "object") return;
        if (selector === "[data-category]" && node.attributes && node.attributes["data-category"] !== undefined) matches.push(node);
        if (selector === "[data-field-id]" && node.attributes && node.attributes["data-field-id"] !== undefined) matches.push(node);
        if (Array.isArray(node.children)) node.children.forEach(visit);
      };
      visit(this);
      return matches;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    addEventListener(type, handler) {
      calls.push(["listen", tagName, type, typeof handler]);
      if (!this.listeners) this.listeners = {};
      this.listeners[type] = handler;
    }
  };
  return element;
}

function findFieldNode(root, fieldId) {
  return root.querySelector(`[data-field-id]` ) && root.querySelectorAll("[data-field-id]").find((node) => node.attributes?.["data-field-id"] === fieldId);
}

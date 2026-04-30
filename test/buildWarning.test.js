import assert from "node:assert/strict";
import test from "node:test";

import { installBuildWarningGate } from "../src/buildWarning.js";

test("build warning blocks build until acknowledge", async () => {
  const calls = [];
  const document = makeFakeDocument(calls);
  const buildButton = makeFakeElement("button", calls);
  const runBuild = async () => { calls.push("build"); };

  installBuildWarningGate({ document, buildButton, runBuild });

  assert.equal(document.body.children.length, 0);
  buildButton.listeners.click({ preventDefault() {} });
  assert.equal(runBuild.calls, undefined);
  assert.equal(document.body.children.length, 1);
  assert.equal(document.body.children[0].hidden, false);

  const ackButton = document.body.querySelectorAll("[data-action=acknowledge]")[0];
  ackButton.listeners.click({ preventDefault() {} });

  assert.equal(calls.includes("build"), true);
  assert.equal(document.body.children.length, 0);
});

test("build warning copy mentions base_hud override", () => {
  const calls = [];
  const document = makeFakeDocument(calls);
  const buildButton = makeFakeElement("button", calls);

  installBuildWarningGate({ document, buildButton, runBuild: () => {} });

  buildButton.listeners.click({ preventDefault() {} });

  const modal = document.body.children[0];
  assert.match(modal.textContent, /base_hud/i);
  assert.match(modal.textContent, /acknowledge/i);
  assert.match(modal.textContent, /pak number of the preset must be lower than the custom color mod/i);
});

function makeFakeDocument(calls) {
  const body = makeFakeElement("body", calls);
  return {
    body,
    createElement(tag) {
      return makeFakeElement(tag, calls);
    }
  };
}

function makeFakeElement(tagName, calls) {
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    attributes: {},
    hidden: false,
    textContent: "",
    listeners: {},
    appendChild(child) {
      this.children.push(child);
      if (child && typeof child === "object") child.parentNode = this;
      if (child && typeof child.textContent === "string") {
        this.textContent += child.textContent;
      }
      return child;
    },
    replaceChildren(...nextChildren) {
      this.children = [...nextChildren];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    querySelectorAll(selector) {
      const matches = [];
      const visit = (node) => {
        if (!node || typeof node !== "object") return;
        if (selector === "[data-action=acknowledge]" && node.attributes?.["data-action"] === "acknowledge") matches.push(node);
        if (Array.isArray(node.children)) node.children.forEach(visit);
      };
      visit(this);
      return matches;
    },
    addEventListener(type, handler) {
      calls.push(["listen", tagName, type]);
      this.listeners[type] = handler;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      if (child && typeof child === "object") child.parentNode = null;
      return child;
    },
    remove() {
      if (this.parentNode?.removeChild) this.parentNode.removeChild(this);
    }
  };
  return element;
}

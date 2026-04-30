const DEFAULT_WARNING_LINES = [
  "This builder writes an override for base_hud.",
  "pak number of the preset must be lower than the custom color mod.",
  "Acknowledge to continue building pak96_dir.vpk."
];

export function installBuildWarningGate({ document, buildButton, runBuild, warningLines = DEFAULT_WARNING_LINES } = {}) {
  const doc = document || globalThis.document;
  if (!doc || !buildButton || typeof runBuild !== "function") {
    throw new Error("Missing build warning gate dependencies");
  }

  let modal = null;
  let modalMounted = false;

  let isOpen = false;

  function ensureModal() {
    if (!modal) modal = createBuildWarningModal(doc, warningLines);
    return modal;
  }

  function mountModal() {
    const currentModal = ensureModal();
    if (!modalMounted) {
      doc.body?.appendChild?.(currentModal.root);
      modalMounted = true;
    }
    return currentModal;
  }

  function unmountModal() {
    const currentModal = ensureModal();
    currentModal.root.hidden = true;
    currentModal.root.setAttribute("aria-hidden", "true");
    if (typeof currentModal.root.remove === "function") {
      currentModal.root.remove();
    } else if (currentModal.root.parentNode?.removeChild) {
      currentModal.root.parentNode.removeChild(currentModal.root);
    }
    modalMounted = false;
  }

  function openWarning(event) {
    event?.preventDefault?.();
    if (isOpen) return;
    isOpen = true;
    const currentModal = mountModal();
    currentModal.root.hidden = false;
    currentModal.root.setAttribute("aria-hidden", "false");
  }

  async function acknowledgeWarning(event) {
    event?.preventDefault?.();
    if (!isOpen) return;
    isOpen = false;
    unmountModal();
    return runBuild();
  }

  buildButton.addEventListener("click", openWarning);
  ensureModal().acknowledgeButton.addEventListener("click", acknowledgeWarning);

  return { openWarning, acknowledgeWarning, get modal() { return ensureModal(); } };
}

export function createBuildWarningModal(document, warningLines = DEFAULT_WARNING_LINES) {
  const root = document.createElement("section");
  root.className = "build-warning-modal";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "buildWarningTitle");
  root.setAttribute("aria-hidden", "true");

  const backdrop = document.createElement("div");
  backdrop.className = "build-warning-backdrop";

  const panel = document.createElement("div");
  panel.className = "build-warning-panel panel";

  const badge = document.createElement("div");
  badge.className = "build-warning-badge";
  badge.textContent = "Warning";

  const title = document.createElement("h3");
  title.id = "buildWarningTitle";
  title.textContent = "Check load order before build";

  const copy = document.createElement("div");
  copy.className = "build-warning-copy";

  for (const line of warningLines) {
    const paragraph = document.createElement("p");
    paragraph.textContent = String(line);
    copy.appendChild(paragraph);
  }

  const actions = document.createElement("div");
  actions.className = "build-warning-actions";

  const acknowledgeButton = document.createElement("button");
  acknowledgeButton.type = "button";
  acknowledgeButton.className = "build-warning-ack";
  acknowledgeButton.setAttribute("data-action", "acknowledge");
  acknowledgeButton.setAttribute("aria-label", "Acknowledge build warning");
  acknowledgeButton.textContent = "Acknowledge";

  actions.appendChild(acknowledgeButton);
  panel.appendChild(badge);
  panel.appendChild(title);
  panel.appendChild(copy);
  panel.appendChild(actions);
  root.appendChild(backdrop);
  root.appendChild(panel);

  return { root, acknowledgeButton };
}

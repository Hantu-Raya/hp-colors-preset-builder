import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
import { Fragment as Fragment2 } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Braces,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileJson,
  GitCommitHorizontal,
  GripVertical,
  Heart,
  Layers3,
  Plus,
  RotateCcw,
  ShieldCheck,
  Star,
  Trash2,
  Upload
} from "lucide-preact";
import { HP_FIELD_CATALOG, REWRITE_FIELD_CATALOG } from "../hpSchema.js";
import { createHpMenuGroups } from "../hpMenuNavigation.js";
import {
  getHpHeroById,
  HP_HEROES,
  HP_HERO_SCOPE_ALL,
  HP_HERO_SCOPE_OFF
} from "../hpHeroData.js";
import { HP_COLORS_MOD_VARIANTS } from "../hpModVariants.js";
import { buildGitCommitInfoRequestUrl, isGitCommitInfoPayload } from "../gitCommitInfoRefresh.js";
import { TARGET_MODE_CHOICES, isRewriteQollockTarget } from "../targetModeStore.js";
import { copyText, downloadText } from "../download.js";
import {
  cleanProfileName,
  createProfilePersistenceSnapshot,
  migrateLegacyV2ProfileState,
  saveProfileState,
  V2_STORAGE_KEY
} from "../profileStore.js";
import {
  createProfilesJsonExport,
  createProfilesJsonFileName
} from "../presetBuilderExport.js";
import {
  createRewritePresetBundle,
  createRewritePresetCode,
  createRewriteSettingsCode,
  decodeRewriteTransfer
} from "../rewritePresetCodec.js";
import {
  createPresetBuilderSession,
  loadPresetBuilderSession,
  reducePresetBuilderSession,
  selectPresetBuilderSession
} from "../presetBuilderSession.js";
import {
  commitPresetBuilderTargetMode,
  commitShowranksCompatibleState,
  createBaseHudXmlLoader,
  createRewritePresetTemplateLoader,
  createRewriteQollockPresetTemplateLoader,
  runPresetBuildWorkflow,
  runPresetConvertWorkflow,
  runPresetImportWorkflow,
  runRewritePresetBuildWorkflow,
  runRewriteQollockPresetBuildWorkflow
} from "../presetBuilderWorkflow.js";
import { SchemaField } from "./schema-field.jsx";
import { SchemaTabs, SchemaTree } from "./schema-tree-v2.jsx";
const PRECISE_PIPS_COMMAND = [
  '"citadel_unit_status_health_per_minor_pip" "10"',
  '"citadel_unit_status_health_per_pip" "10"',
  '"citadel_unit_status_minor_pip_per_major_pip" "10"'
].join("\n");
const RESET_PIPS_COMMAND = [
  '"citadel_unit_status_health_per_minor_pip" "100"',
  '"citadel_unit_status_health_per_pip" "100"',
  '"citadel_unit_status_minor_pip_per_major_pip" "5"'
].join("\n");
const PRECISE_PIPS_FIELD = Object.freeze({
  id: "hp_precise_pips_enabled",
  label: "More Precise HP Pips",
  type: "toggle",
  defaultValue: false
});
function scheduleIdleWork(callback) {
  if (typeof window === "undefined") return () => {
  };
  if (typeof window.requestIdleCallback === "function") {
    const id2 = window.requestIdleCallback(callback, { timeout: 800 });
    return () => window.cancelIdleCallback?.(id2);
  }
  const id = window.setTimeout(callback, 160);
  return () => window.clearTimeout(id);
}
function useDialogA11y(open, onClose) {
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return void 0;
    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusable = () => Array.from(panel?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []);
    focusable()[0]?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [onClose, open]);
  return panelRef;
}
function moveRovingFocus(event, refs, currentIndex, itemCount) {
  let nextIndex = null;
  if (event.key === "ArrowDown") nextIndex = Math.min(itemCount - 1, currentIndex + 1);
  if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = itemCount - 1;
  if (nextIndex === null) return null;
  event.preventDefault();
  refs.current.forEach((node, index) => {
    if (node) node.tabIndex = index === nextIndex ? 0 : -1;
  });
  refs.current[nextIndex]?.focus();
  return nextIndex;
}
function SignatureConditionDialog({ field, baseValue, rule, onClose, onSave }) {
  const [enabled, setEnabled] = useState(Boolean(rule));
  const [slot, setSlot] = useState(rule?.slot || 1);
  const [minTier, setMinTier] = useState(rule?.minTier || 1);
  const [value, setValue] = useState(rule?.value ?? baseValue);
  const dialogRef = useDialogA11y(true, onClose);
  const editorField = { ...field, id: `conditional-${field.id}` };
  return /* @__PURE__ */ jsxs("div", { className: "build-warning-modal signature-condition-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "signatureConditionTitle", children: [
    /* @__PURE__ */ jsx("button", { type: "button", className: "build-warning-backdrop", onClick: onClose, "aria-label": "Cancel" }),
    /* @__PURE__ */ jsxs("div", { ref: dialogRef, className: "build-warning-panel signature-condition-panel", tabIndex: -1, children: [
      /* @__PURE__ */ jsx("div", { className: "build-warning-badge", children: "Signature condition" }),
      /* @__PURE__ */ jsx("h3", { id: "signatureConditionTitle", children: field.label }),
      /* @__PURE__ */ jsx("p", { children: "Use a different value when an ability reaches the selected signature tier." }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          role: "switch",
          "aria-checked": enabled,
          className: `signature-condition-toggle${enabled ? " is-checked" : ""}`,
          onClick: () => setEnabled((current) => !current),
          children: [
            /* @__PURE__ */ jsx("span", { children: "Use signature tier" }),
            /* @__PURE__ */ jsx("strong", { children: enabled ? "On" : "Off" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("fieldset", { className: "signature-condition-group", disabled: !enabled, children: [
        /* @__PURE__ */ jsx("legend", { children: "Ability slot" }),
        /* @__PURE__ */ jsx("div", { className: "signature-condition-options", role: "radiogroup", "aria-label": "Ability slot", children: [1, 2, 3, 4].map((option) => /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            role: "radio",
            className: slot === option ? "is-selected" : "",
            "aria-checked": slot === option,
            onClick: () => setSlot(option),
            children: [
              "Ability ",
              option
            ]
          },
          option
        )) })
      ] }),
      /* @__PURE__ */ jsxs("fieldset", { className: "signature-condition-group", disabled: !enabled, children: [
        /* @__PURE__ */ jsx("legend", { children: "Minimum tier" }),
        /* @__PURE__ */ jsx("div", { className: "signature-condition-options", role: "radiogroup", "aria-label": "Minimum tier", children: [1, 2, 3].map((option) => /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            role: "radio",
            className: minTier === option ? "is-selected" : "",
            "aria-checked": minTier === option,
            onClick: () => setMinTier(option),
            children: [
              "Tier ",
              option,
              "+"
            ]
          },
          option
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: `signature-condition-value${enabled ? "" : " is-disabled"}`, children: [
        /* @__PURE__ */ jsx("span", { children: "Conditional value" }),
        /* @__PURE__ */ jsx(
          SchemaField,
          {
            field: editorField,
            value,
            onChange: (_id, nextValue) => setValue(nextValue),
            showConditionButton: false
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "build-warning-actions", children: [
        rule ? /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action signature-condition-remove", onClick: () => onSave(null), children: [
          /* @__PURE__ */ jsx(Trash2, { "aria-hidden": "true" }),
          "Remove"
        ] }) : null,
        /* @__PURE__ */ jsx("button", { type: "button", className: "secondary-action", onClick: onClose, children: "Cancel" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "primary-action",
            onClick: () => onSave(enabled ? { slot, minTier, value } : null),
            children: "Apply"
          }
        )
      ] })
    ] })
  ] });
}
function PrecisePipsDialog({ initialMode = "precise", onModeChange = null, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [copyState, setCopyState] = useState("ready");
  const dialogRef = useDialogA11y(true, onClose);
  const precise = mode === "precise";
  const command = precise ? PRECISE_PIPS_COMMAND : RESET_PIPS_COMMAND;
  async function handleCopyCommand() {
    try {
      await copyText(command);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }
  function chooseMode(nextMode) {
    setMode(nextMode);
    setCopyState("ready");
    onModeChange?.(nextMode);
  }
  return /* @__PURE__ */ jsxs("div", { className: "build-warning-modal precise-pips-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "precisePipsTitle", "aria-describedby": "precisePipsWarning", children: [
    /* @__PURE__ */ jsx("button", { type: "button", className: "build-warning-backdrop", onClick: onClose, "aria-label": "Close precise pips dialog" }),
    /* @__PURE__ */ jsxs("div", { ref: dialogRef, className: "build-warning-panel precise-pips-panel", tabIndex: -1, children: [
      /* @__PURE__ */ jsx("div", { className: "build-warning-badge", children: "Game settings required" }),
      /* @__PURE__ */ jsx("h3", { id: "precisePipsTitle", children: "More Precise HP Pips" }),
      /* @__PURE__ */ jsx("p", { id: "precisePipsWarning", className: "precise-pips-warning", children: precise ? "Copy these commands and paste them under your convar block. HP Colors cannot apply or verify these game settings." : "Copy these reset commands and paste them under your convar block to restore the default pip scale." }),
      /* @__PURE__ */ jsxs("div", { className: "precise-pips-mode", role: "radiogroup", "aria-label": "Pip scale", children: [
        /* @__PURE__ */ jsx("button", { type: "button", role: "radio", "aria-checked": precise, className: precise ? "is-selected" : "", onClick: () => chooseMode("precise"), children: "More precise" }),
        /* @__PURE__ */ jsx("button", { type: "button", role: "radio", "aria-checked": !precise, className: !precise ? "is-selected" : "", onClick: () => chooseMode("default"), children: "Game default" })
      ] }),
      /* @__PURE__ */ jsx("pre", { className: "precise-pips-command", children: /* @__PURE__ */ jsx("code", { children: command }) }),
      /* @__PURE__ */ jsxs("div", { className: "build-warning-actions", children: [
        /* @__PURE__ */ jsx("button", { type: "button", className: "secondary-action", onClick: onClose, children: "Close" }),
        /* @__PURE__ */ jsxs("button", { type: "button", className: "primary-action", onClick: handleCopyCommand, children: [
          copyState === "copied" ? /* @__PURE__ */ jsx(Check, { "aria-hidden": "true" }) : /* @__PURE__ */ jsx(Copy, { "aria-hidden": "true" }),
          copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy command"
        ] })
      ] })
    ] })
  ] });
}
export default function PresetBuilderIsland({ gitCommitInfo = null }) {
  const defaultState = useMemo(() => HP_FIELD_CATALOG.createDefaultState(), []);
  const rewriteDefaultState = useMemo(() => REWRITE_FIELD_CATALOG.createDefaultState(), []);
  const [freshGitCommitInfo, setFreshGitCommitInfo] = useState(gitCommitInfo);
  const [session, setSession] = useState(() => createPresetBuilderSession(defaultState));
  const latestProfileSnapshot = useRef(createProfilePersistenceSnapshot(session));
  const containsRewriteProfiles = (session.profiles || []).some((profile) => Boolean(profile?.rewrite));
  const rewriteQollockTarget = isRewriteQollockTarget(session.targetMode);
  const rewriteBuildTarget = containsRewriteProfiles || rewriteQollockTarget;
  const activeCatalog = rewriteBuildTarget ? REWRITE_FIELD_CATALOG : HP_FIELD_CATALOG;
  const activeDefaultState = rewriteBuildTarget ? rewriteDefaultState : defaultState;
  const groups = useMemo(
    () => activeCatalog.variant === "rewrite" ? createHpMenuGroups(activeCatalog) : createHpMenuGroups(HP_FIELD_CATALOG.schema),
    [activeCatalog]
  );
  const sharedGroups = useMemo(() => createHpMenuGroups(HP_FIELD_CATALOG.schema), []);
  const initialSelection = useMemo(
    () => selectPresetBuilderSession(session, activeDefaultState, groups, null, activeCatalog),
    [activeCatalog, activeDefaultState, groups, session]
  );
  const [activeKey, setActiveKey] = useState(() => initialSelection.firstLeafKey);
  const selectedSession = useMemo(
    () => selectPresetBuilderSession(session, activeDefaultState, groups, activeKey, activeCatalog),
    [activeCatalog, activeKey, activeDefaultState, groups, session]
  );
  const {
    activeProfile,
    activeProfileIndex,
    presetName,
    state,
    activeHeroMode,
    selectedHeroIds,
    selectedHeroSet,
    activeOverrides,
    heroSelectionLabel,
    currentGroup,
    visibleFields,
    visibleCount,
    activeOverrideCount,
    changedSettingCount,
    profileScopeCounts,
    allProfilesOff,
    profileLimit,
    targetModeDetails,
    fullTargetMode,
    canConfirmBuildVariant,
    presetVpkFileName,
    installDirectory,
    buildVariantWarning
  } = selectedSession;
  const activeGitCommitInfo = freshGitCommitInfo || gitCommitInfo;
  const {
    importText,
    feedback,
    busy,
    busyOperation,
    buildResult,
    status,
    profiles,
    activeProfileId,
    profilesLoaded,
    profileMenuOpen,
    heroMenuOpen,
    dragIndex,
    importOpen,
    convertOpen,
    convertFile,
    convertStatus,
    previewOpen,
    warningOpen,
    installValidated,
    targetMode,
    targetModeLoaded,
    modePickerOpen,
    modePickerUpgrade,
    conditionalFieldId
  } = session;
  const conditionalField = conditionalFieldId ? { id: conditionalFieldId, ...activeCatalog.schema[conditionalFieldId] } : null;
  const showPrecisePipsControl = currentGroup?.pageId === "health-pips-levels";
  const showPresetTools = currentGroup?.pageId === "overview-presets";
  const profileOptionRefs = useRef([]);
  const heroOptionRefs = useRef([]);
  const operationLockRef = useRef(false);
  const [precisePipsOpen, setPrecisePipsOpen] = useState(false);
  const [precisePipsDialogMode, setPrecisePipsDialogMode] = useState("precise");
  const [rewriteInstallValidated, setRewriteInstallValidated] = useState(false);
  const loadBaseHudXml = useMemo(
    () => createBaseHudXmlLoader({ baseUrl: import.meta.env.BASE_URL }),
    []
  );
  const loadRewritePresetTemplate = useMemo(
    () => createRewritePresetTemplateLoader({ baseUrl: import.meta.env.BASE_URL }),
    []
  );
  const loadRewriteQollockPresetTemplate = useMemo(
    () => createRewriteQollockPresetTemplateLoader({ baseUrl: import.meta.env.BASE_URL }),
    []
  );
  useEffect(() => {
    setRewriteInstallValidated(false);
  }, [rewriteBuildTarget, targetMode]);
  const dispatchSessionIntent = useCallback((intent, context = {}) => {
    setSession((prev) => reducePresetBuilderSession(prev, intent, {
      catalog: activeCatalog,
      defaultState: activeDefaultState,
      groups,
      activeKey,
      ...context
    }));
  }, [activeCatalog, activeDefaultState, activeKey, groups]);
  useEffect(() => {
    if (!rewriteBuildTarget || profiles.every((profile) => profile?.rewrite)) return;
    dispatchSessionIntent({ type: "ENSURE_REWRITE_PROFILES" });
  }, [dispatchSessionIntent, profiles, rewriteBuildTarget]);
  const openBuildWarning = useCallback(() => {
    dispatchSessionIntent({ type: "OPEN_BUILD_WARNING" });
  }, [dispatchSessionIntent]);
  const closeBuildWarning = useCallback(() => {
    dispatchSessionIntent({ type: "CLOSE_BUILD_WARNING" });
  }, [dispatchSessionIntent]);
  const closeTargetModePicker = useCallback(() => {
    dispatchSessionIntent({ type: "CLOSE_TARGET_MODE_PICKER" });
  }, [dispatchSessionIntent]);
  const closeSignatureCondition = useCallback(() => {
    dispatchSessionIntent({ type: "CLOSE_SIGNATURE_CONDITION" });
  }, [dispatchSessionIntent]);
  const saveSignatureCondition = useCallback((rule) => {
    if (!conditionalFieldId) return;
    dispatchSessionIntent({ type: "SET_SIGNATURE_CONDITION", id: conditionalFieldId, rule });
  }, [conditionalFieldId, dispatchSessionIntent]);
  const buildDialogRef = useDialogA11y(warningOpen, closeBuildWarning);
  const targetDialogRef = useDialogA11y(modePickerOpen && targetModeLoaded, closeTargetModePicker);
  function commitTargetMode(nextMode) {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    setSession((previous) => commitPresetBuilderTargetMode({
      session: previous,
      targetMode: nextMode,
      storage
    }));
  }
  function commitShowranksCompatible(nextValue) {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    setSession((previous) => commitShowranksCompatibleState({
      session: previous,
      showranksCompatible: nextValue,
      storage
    }));
  }
  function openTargetModePicker() {
    dispatchSessionIntent({ type: "OPEN_TARGET_MODE_PICKER" });
  }
  useEffect(() => {
    latestProfileSnapshot.current = createProfilePersistenceSnapshot(session);
  }, [session]);
  useEffect(() => {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    const migration = migrateLegacyV2ProfileState(storage, defaultState);
    const loaded = loadPresetBuilderSession(storage, defaultState, { profileStorageKey: V2_STORAGE_KEY });
    if (migration.error) loaded.feedback = { type: "error", message: migration.error };
    setSession(loaded);
  }, [defaultState]);
  useEffect(() => {
    if (!profilesLoaded) return void 0;
    return scheduleIdleWork(() => {
      const storage = typeof window !== "undefined" ? window.localStorage : null;
      const saved = saveProfileState(storage, latestProfileSnapshot.current, V2_STORAGE_KEY);
      if (!saved.ok) dispatchSessionIntent({ type: "SET_FEEDBACK", feedback: { type: "error", message: saved.error } });
    });
  }, [activeProfileId, dispatchSessionIntent, profiles, profilesLoaded]);
  useEffect(() => {
    if (!profilesLoaded || typeof window === "undefined") return;
    const flushProfileState = () => {
      saveProfileState(window.localStorage, latestProfileSnapshot.current, V2_STORAGE_KEY);
    };
    window.addEventListener("pagehide", flushProfileState);
    return () => {
      window.removeEventListener("pagehide", flushProfileState);
      flushProfileState();
    };
  }, [profilesLoaded]);
  useEffect(() => {
    let ignore = false;
    const refreshCommitInfo = async () => {
      try {
        const response = await fetch(buildGitCommitInfoRequestUrl(import.meta.env.BASE_URL), { cache: "no-store" });
        if (!response.ok) return;
        const nextGitCommitInfo = await response.json();
        if (!ignore && isGitCommitInfoPayload(nextGitCommitInfo)) {
          setFreshGitCommitInfo(nextGitCommitInfo);
        }
      } catch {
      }
    };
    refreshCommitInfo();
    return () => {
      ignore = true;
    };
  }, []);
  useEffect(() => {
    const handleShortcut = (event) => {
      const dialogOpen = warningOpen || modePickerOpen || precisePipsOpen || Boolean(conditionalFieldId);
      if (event.key === "Escape" && !dialogOpen) {
        dispatchSessionIntent({ type: "CLOSE_MENUS" });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !busy && !dialogOpen) {
        event.preventDefault();
        openBuildWarning();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [busy, conditionalFieldId, dispatchSessionIntent, modePickerOpen, openBuildWarning, precisePipsOpen, warningOpen]);
  function updateField(id, value) {
    dispatchSessionIntent({ type: "UPDATE_FIELD", id, value });
  }
  function handleMinimalPrecisePipsChange(id, value) {
    updateField(id, value);
    setPrecisePipsDialogMode(value ? "precise" : "default");
    setPrecisePipsOpen(true);
  }
  function renameActiveProfile(name) {
    dispatchSessionIntent({ type: "RENAME_ACTIVE_PROFILE", name });
  }
  function handleHeroToggle(heroId) {
    dispatchSessionIntent({ type: "TOGGLE_HERO", heroId });
  }
  function handleClearHeroes() {
    dispatchSessionIntent({ type: "CLEAR_HEROES" });
  }
  function handleDisableHeroSelection() {
    dispatchSessionIntent({ type: "DISABLE_HERO_SELECTION" });
  }
  function handleSelectGroup(group) {
    let cursor = group;
    while (cursor?.children?.length) cursor = cursor.children[0];
    setActiveKey(activeCatalog.getCategoryKey(cursor || group));
  }
  const handleImport = useCallback(async () => {
    if (busy || operationLockRef.current) return;
    operationLockRef.current = true;
    dispatchSessionIntent({ type: "OPERATION_STARTED", operation: "import" });
    try {
      const rewriteTransfer = decodeRewriteTransfer(importText, { defaultState: activeDefaultState });
      if (rewriteTransfer) {
        dispatchSessionIntent(
          { type: "IMPORT_PROFILES_SUCCEEDED", importedProfiles: rewriteTransfer.profiles },
          { defaultState: activeDefaultState, groups, activeKey, catalog: activeCatalog }
        );
        dispatchSessionIntent({ type: "SET_IMPORT_TEXT", text: "" });
      } else {
        await runPresetImportWorkflow({ importText, defaultState, groups: sharedGroups, activeKey, dispatch: dispatchSessionIntent });
      }
      dispatchSessionIntent({ type: "OPERATION_SUCCEEDED" });
    } catch (error) {
      dispatchSessionIntent({ type: "IMPORT_FAILED", message: error?.message || String(error) });
    } finally {
      operationLockRef.current = false;
    }
  }, [activeCatalog, activeDefaultState, activeKey, busy, defaultState, dispatchSessionIntent, groups, importText, sharedGroups]);
  function handleResetPage() {
    dispatchSessionIntent({
      type: "RESET_FIELDS",
      fieldIds: (currentGroup?.fields || []).map((field) => field.id),
      defaultState: activeDefaultState
    });
  }
  function handleResetAll() {
    dispatchSessionIntent({ type: "RESET_ALL_FIELDS", defaultState: activeDefaultState });
  }
  function handleAddProfile() {
    dispatchSessionIntent({ type: "ADD_PROFILE", defaultState: activeDefaultState });
  }
  function handleDeleteProfile() {
    dispatchSessionIntent({ type: "DELETE_ACTIVE_PROFILE" }, { presetName });
  }
  function handleSelectProfile(profileId) {
    dispatchSessionIntent({ type: "SELECT_PROFILE", profileId });
  }
  function handleDropProfile(event, toIndex) {
    event.preventDefault();
    const rawIndex = event.dataTransfer.getData("text/plain");
    const fromIndex = rawIndex === "" ? dragIndex : Number(rawIndex);
    dispatchSessionIntent({ type: "DROP_PROFILE", fromIndex, toIndex });
  }
  const performBuild = useCallback(async (modVariant) => {
    if (busy || operationLockRef.current) return;
    operationLockRef.current = true;
    try {
      await runPresetBuildWorkflow({
        selection: selectedSession,
        targetMode: modVariant || targetMode,
        loadBaseHudXml,
        dispatch: dispatchSessionIntent
      });
    } finally {
      operationLockRef.current = false;
    }
  }, [busy, dispatchSessionIntent, loadBaseHudXml, selectedSession, targetMode]);
  const performRewriteBuild = useCallback(async (qollock = false) => {
    if (busy || operationLockRef.current) return;
    operationLockRef.current = true;
    try {
      if (qollock) {
        await runRewriteQollockPresetBuildWorkflow({
          profiles,
          activeProfileId,
          loadRewriteQollockPresetTemplate,
          dispatch: dispatchSessionIntent
        });
      } else {
        await runRewritePresetBuildWorkflow({
          profiles,
          activeProfileId,
          loadRewritePresetTemplate,
          showranksCompatible: session.showranksCompatible,
          dispatch: dispatchSessionIntent
        });
      }
    } finally {
      operationLockRef.current = false;
    }
  }, [activeProfileId, busy, dispatchSessionIntent, loadRewritePresetTemplate, loadRewriteQollockPresetTemplate, profiles, session.showranksCompatible]);
  const performConvert = useCallback(async (targetModVariant) => {
    if (busy || operationLockRef.current) return;
    operationLockRef.current = true;
    dispatchSessionIntent({ type: "OPERATION_STARTED", operation: "convert" });
    try {
      await runPresetConvertWorkflow({ convertFile, targetModVariant, loadBaseHudXml, dispatch: dispatchSessionIntent });
      dispatchSessionIntent({ type: "OPERATION_SUCCEEDED" });
    } finally {
      operationLockRef.current = false;
    }
  }, [busy, convertFile, dispatchSessionIntent, loadBaseHudXml]);
  const handleExport = useCallback(async (operation, value, successMessage) => {
    if (busy || operationLockRef.current) return;
    operationLockRef.current = true;
    dispatchSessionIntent({ type: "OPERATION_STARTED", operation });
    try {
      await value();
      dispatchSessionIntent({ type: "OPERATION_SUCCEEDED", message: successMessage });
    } catch (error) {
      dispatchSessionIntent({ type: "OPERATION_FAILED", message: error?.message || String(error) });
    } finally {
      operationLockRef.current = false;
    }
  }, [busy, dispatchSessionIntent]);
  const heroOptions = [
    { id: "off", label: "Hero select off", avatar: "Off", selected: activeHeroMode === HP_HERO_SCOPE_OFF, onSelect: handleDisableHeroSelection },
    { id: "all", label: "All heroes", avatar: "All", selected: activeHeroMode === HP_HERO_SCOPE_ALL, onSelect: handleClearHeroes },
    ...HP_HEROES.map((hero) => ({
      id: hero.id,
      label: hero.name,
      hero,
      selected: selectedHeroSet.has(hero.id),
      onSelect: () => handleHeroToggle(hero.id)
    }))
  ];
  return /* @__PURE__ */ jsxs("div", { className: "panorama-page", children: [
    /* @__PURE__ */ jsxs("div", { className: "panorama-shell", role: "region", "aria-label": "HP Colors preset builder", children: [
      /* @__PURE__ */ jsxs("header", { className: "panorama-topbar", children: [
        /* @__PURE__ */ jsxs("div", { className: "panorama-brand-block", children: [
          /* @__PURE__ */ jsx("span", { className: "panorama-kicker", children: "Deadlock preset builder" }),
          /* @__PURE__ */ jsxs("div", { className: "panorama-title-row", children: [
            /* @__PURE__ */ jsx("span", { className: "panorama-brand", children: "HP Colors" }),
            activeGitCommitInfo?.url && activeGitCommitInfo?.shortHash ? /* @__PURE__ */ jsxs(
              "a",
              {
                className: "commit-version-link",
                href: activeGitCommitInfo.url,
                target: "_blank",
                rel: "noreferrer",
                "aria-label": activeGitCommitInfo.title || `Latest commit ${activeGitCommitInfo.shortHash}`,
                "data-tooltip": activeGitCommitInfo.title || `Latest commit ${activeGitCommitInfo.shortHash}`,
                children: [
                  /* @__PURE__ */ jsx(GitCommitHorizontal, { "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Commit" }),
                  /* @__PURE__ */ jsx("code", { children: activeGitCommitInfo.shortHash })
                ]
              }
            ) : null
          ] }),
          /* @__PURE__ */ jsxs("nav", { className: "similar-tools", "aria-label": "Builder versions and similar tools", children: [
            /* @__PURE__ */ jsx("span", { className: "similar-tools-label", children: "Versions" }),
            /* @__PURE__ */ jsx("a", { className: "similar-tool-link", href: import.meta.env.BASE_URL, children: "V1 original" }),
            /* @__PURE__ */ jsx("a", { className: "similar-tool-link", href: `${import.meta.env.BASE_URL}v2/`, children: "V2 game menu" }),
            /* @__PURE__ */ jsx("a", { className: "similar-tool-link", href: "https://hantu-raya.github.io/color-blind-web-builder/", target: "_blank", rel: "noreferrer", children: "Color Blind Builder" }),
            /* @__PURE__ */ jsx("a", { className: "similar-tool-link", href: "https://hantu-raya.github.io/3d-hud-web-merger/", target: "_blank", rel: "noreferrer", children: "3D HUD VPK Merger" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "panorama-header-actions", children: [
          /* @__PURE__ */ jsxs("a", { className: "support-button top-support-button", href: "https://ko-fi.com/hantuaraya", target: "_blank", rel: "noreferrer", "aria-label": "Donate on Ko-fi", children: [
            /* @__PURE__ */ jsx(Heart, { "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "Donate" })
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "support-button star-repo-button", href: "https://github.com/Hantu-Raya/hp-colors-preset-builder", target: "_blank", rel: "noreferrer", "aria-label": "Star the repository on GitHub", children: [
            /* @__PURE__ */ jsx(Star, { "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "Star" })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "target-mode-trigger",
              onClick: openTargetModePicker,
              children: [
                /* @__PURE__ */ jsx(Layers3, { "aria-hidden": "true" }),
                /* @__PURE__ */ jsxs("span", { className: "target-mode-text", children: [
                  /* @__PURE__ */ jsx("span", { children: "Preset target" }),
                  /* @__PURE__ */ jsx("strong", { children: containsRewriteProfiles && !rewriteQollockTarget ? "Rewrite" : targetModeDetails.label })
                ] })
              ]
            }
          ),
          rewriteBuildTarget && !rewriteQollockTarget ? /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: session.showranksCompatible ? "showranks-toggle is-active" : "showranks-toggle",
              onClick: () => commitShowranksCompatible(!session.showranksCompatible),
              "aria-pressed": session.showranksCompatible,
              children: [
                /* @__PURE__ */ jsx(ShieldCheck, { "aria-hidden": "true" }),
                /* @__PURE__ */ jsxs("span", { className: "target-mode-text", children: [
                  /* @__PURE__ */ jsx("span", { children: "Showranks compatible" }),
                  /* @__PURE__ */ jsx("strong", { children: session.showranksCompatible ? "On" : "Off" })
                ] })
              ]
            }
          ) : null,
          /* @__PURE__ */ jsxs("div", { className: "topbar-profile-controls", "aria-label": "Preset profiles", children: [
            /* @__PURE__ */ jsx("button", { type: "button", className: "profile-icon-action", onClick: handleAddProfile, disabled: profiles.length >= profileLimit, "aria-label": "Add preset", children: /* @__PURE__ */ jsx(Plus, { "aria-hidden": "true" }) }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "profile-icon-action", onClick: handleDeleteProfile, disabled: profiles.length <= 1, "aria-label": "Remove preset", children: /* @__PURE__ */ jsx(Trash2, { "aria-hidden": "true" }) }),
            /* @__PURE__ */ jsxs("div", { className: "profile-selector", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  className: "profile-selector-trigger",
                  onClick: () => dispatchSessionIntent({ type: "TOGGLE_PROFILE_MENU" }),
                  "aria-expanded": profileMenuOpen,
                  "aria-haspopup": "listbox",
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "profile-selector-title", children: presetName }),
                    /* @__PURE__ */ jsxs("span", { className: "profile-selector-meta", children: [
                      activeOverrideCount,
                      " override",
                      activeOverrideCount === 1 ? "" : "s",
                      " / ",
                      profiles.length
                    ] }),
                    /* @__PURE__ */ jsx(ChevronDown, { "aria-hidden": "true" })
                  ]
                }
              ),
              profileMenuOpen && /* @__PURE__ */ jsx("div", { className: "profile-selector-menu", role: "listbox", "aria-label": "Preset profiles", children: profiles.map((profile, index) => {
                const label = cleanProfileName(profile.name, index);
                const profileState = activeCatalog.variant === "rewrite" ? activeCatalog.sanitizeState(profile.rewrite?.webValues || {}) : profile.values;
                const overrides = activeCatalog.countOverrides(profileState, activeDefaultState) + Object.keys(profile.overrides || {}).length;
                const active = profile.id === activeProfile.id;
                return /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: "profile-menu-entry",
                    draggable: true,
                    onDragStart: (event) => {
                      dispatchSessionIntent({ type: "SET_DRAG_INDEX", dragIndex: index });
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                    },
                    onDragOver: (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    },
                    onDrop: (event) => handleDropProfile(event, index),
                    onDragEnd: () => dispatchSessionIntent({ type: "SET_DRAG_INDEX", dragIndex: null }),
                    children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          ref: (node) => {
                            profileOptionRefs.current[index] = node;
                          },
                          type: "button",
                          className: active ? "profile-menu-row is-active" : "profile-menu-row",
                          role: "option",
                          tabIndex: active ? 0 : -1,
                          "aria-selected": active,
                          onClick: () => handleSelectProfile(profile.id),
                          onKeyDown: (event) => {
                            if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                              event.preventDefault();
                              dispatchSessionIntent({ type: "MOVE_PROFILE", profileId: profile.id, direction: event.key === "ArrowUp" ? -1 : 1 });
                              return;
                            }
                            const nextIndex = moveRovingFocus(event, profileOptionRefs, index, profiles.length);
                            if (nextIndex !== null) dispatchSessionIntent({ type: "NAVIGATE_PROFILE", profileId: profiles[nextIndex].id });
                          },
                          children: [
                            /* @__PURE__ */ jsx(GripVertical, { className: "profile-drag-handle", "aria-hidden": "true" }),
                            /* @__PURE__ */ jsxs("span", { className: "profile-menu-text", children: [
                              /* @__PURE__ */ jsx("span", { className: "profile-row-name", children: label }),
                              /* @__PURE__ */ jsxs("span", { className: "profile-row-meta", children: [
                                overrides,
                                " override",
                                overrides === 1 ? "" : "s",
                                " / priority ",
                                index + 1
                              ] })
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { className: "profile-move-actions", "aria-label": `Move ${label}`, children: [
                        /* @__PURE__ */ jsx("button", { type: "button", disabled: index === 0, onClick: () => dispatchSessionIntent({ type: "MOVE_PROFILE", profileId: profile.id, direction: -1 }), "aria-label": `Move ${label} up`, children: /* @__PURE__ */ jsx(ArrowUp, { "aria-hidden": "true" }) }),
                        /* @__PURE__ */ jsx("button", { type: "button", disabled: index === profiles.length - 1, onClick: () => dispatchSessionIntent({ type: "MOVE_PROFILE", profileId: profile.id, direction: 1 }), "aria-label": `Move ${label} down`, children: /* @__PURE__ */ jsx(ArrowDown, { "aria-hidden": "true" }) })
                      ] })
                    ]
                  },
                  profile.id
                );
              }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "preset-name-control", htmlFor: "presetName", children: [
            /* @__PURE__ */ jsx("span", { children: "Profile" }),
            /* @__PURE__ */ jsx("input", { id: "presetName", className: "builder-input", value: activeProfile.name, onChange: (e) => renameActiveProfile(e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "hero-selector", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                className: "hero-selector-trigger",
                onClick: () => dispatchSessionIntent({ type: "TOGGLE_HERO_MENU" }),
                "aria-expanded": heroMenuOpen,
                "aria-haspopup": "listbox",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "hero-selector-stack", "aria-hidden": "true", children: activeHeroMode === HP_HERO_SCOPE_OFF ? /* @__PURE__ */ jsx("span", { className: "hero-avatar hero-avatar-all", "aria-hidden": "true", children: "Off" }) : (selectedHeroIds.length ? selectedHeroIds.slice(0, 3) : HP_HEROES.slice(0, 3).map((hero) => hero.id)).map((heroId) => /* @__PURE__ */ jsx(HeroAvatar, { hero: getHpHeroById(heroId) }, heroId)) }),
                  /* @__PURE__ */ jsxs("span", { className: "hero-selector-text", children: [
                    /* @__PURE__ */ jsx("span", { className: "hero-selector-label", children: "Heroes" }),
                    /* @__PURE__ */ jsx("span", { className: "hero-selector-value", children: heroSelectionLabel })
                  ] }),
                  /* @__PURE__ */ jsx(ChevronDown, { "aria-hidden": "true" })
                ]
              }
            ),
            heroMenuOpen ? /* @__PURE__ */ jsx("div", { className: "hero-selector-menu", role: "listbox", "aria-label": "Target heroes", "aria-multiselectable": "true", children: heroOptions.map((option, index) => /* @__PURE__ */ jsxs(
              "button",
              {
                ref: (node) => {
                  heroOptionRefs.current[index] = node;
                },
                type: "button",
                className: option.selected ? "hero-menu-row is-active" : "hero-menu-row",
                role: "option",
                tabIndex: index === Math.max(0, heroOptions.findIndex((item) => item.selected)) ? 0 : -1,
                "aria-selected": option.selected,
                onClick: option.onSelect,
                onKeyDown: (event) => moveRovingFocus(event, heroOptionRefs, index, heroOptions.length),
                children: [
                  option.hero ? /* @__PURE__ */ jsx(HeroAvatar, { hero: option.hero }) : /* @__PURE__ */ jsx("span", { className: "hero-avatar hero-avatar-all", "aria-hidden": "true", children: option.avatar }),
                  /* @__PURE__ */ jsx("span", { className: "hero-menu-name", children: option.label }),
                  option.selected ? /* @__PURE__ */ jsx(Check, { "aria-hidden": "true" }) : null
                ]
              },
              option.id
            )) }) : null
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "build-action",
              onClick: openBuildWarning,
              disabled: busy,
              title: rewriteBuildTarget ? `Build ${presetVpkFileName} for ${rewriteQollockTarget ? "hp_colors_rewrite_qollock" : "hp_colors_rewrite"}.` : void 0,
              children: [
                /* @__PURE__ */ jsx(Download, { "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: busyOperation === "build" ? "Building\u2026" : "Build VPK" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "mobile-workspace-nav", "aria-label": "Mobile builder navigation", children: [
        /* @__PURE__ */ jsx("a", { href: "#builderCategories", children: "Sections" }),
        /* @__PURE__ */ jsx("a", { href: "#builderSettings", children: "Current page" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "panorama-workspace", children: [
        /* @__PURE__ */ jsx(SchemaTree, { groups, activeKey, state, defaultState: activeDefaultState, onSelect: handleSelectGroup }),
        /* @__PURE__ */ jsxs("div", { id: "builderSettings", className: "anita-menu-content", children: [
          /* @__PURE__ */ jsx(SchemaTabs, { groups, activeKey, onSelect: handleSelectGroup }),
          /* @__PURE__ */ jsxs("div", { className: showPresetTools ? "anita-page-body has-tools" : "anita-page-body", children: [
            /* @__PURE__ */ jsxs("section", { className: "anita-detail-panel", children: [
              /* @__PURE__ */ jsxs("div", { className: "anita-detail-header-row", children: [
                /* @__PURE__ */ jsxs("div", { className: "anita-page-heading", children: [
                  /* @__PURE__ */ jsx("span", { className: "anita-page-eyebrow", children: currentGroup?.path?.[0] || "SETTINGS" }),
                  /* @__PURE__ */ jsx("h2", { children: currentGroup?.title || currentGroup?.name }),
                  /* @__PURE__ */ jsx("div", { className: "anita-page-rule" }),
                  /* @__PURE__ */ jsx("p", { className: "anita-page-description", children: currentGroup?.description }),
                  !showPresetTools ? /* @__PURE__ */ jsxs("p", { className: "anita-detail-hint", children: [
                    visibleCount + (showPrecisePipsControl ? 1 : 0),
                    " visible controls / ",
                    profiles.length,
                    " profile",
                    profiles.length === 1 ? "" : "s"
                  ] }) : null
                ] }),
                !showPresetTools ? /* @__PURE__ */ jsxs("div", { className: "reset-actions", children: [
                  /* @__PURE__ */ jsxs("button", { type: "button", className: "quiet-action", onClick: handleResetPage, children: [
                    /* @__PURE__ */ jsx(RotateCcw, { "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { children: "Reset Section" })
                  ] }),
                  /* @__PURE__ */ jsxs("button", { type: "button", className: "quiet-action", onClick: handleResetAll, children: [
                    /* @__PURE__ */ jsx(RotateCcw, { "aria-hidden": "true" }),
                    /* @__PURE__ */ jsx("span", { children: "Reset All" })
                  ] })
                ] }) : null
              ] }),
              /* @__PURE__ */ jsx("div", { className: "detail-scroll", children: showPresetTools ? /* @__PURE__ */ jsxs("div", { className: "preset-overview", children: [
                /* @__PURE__ */ jsxs("article", { className: "preset-overview-card", children: [
                  /* @__PURE__ */ jsx("span", { className: "panorama-kicker", children: "CURRENT PRESET" }),
                  /* @__PURE__ */ jsx("strong", { children: presetName }),
                  /* @__PURE__ */ jsxs("p", { children: [
                    activeOverrideCount,
                    " override",
                    activeOverrideCount === 1 ? "" : "s",
                    " routed to ",
                    heroSelectionLabel.toLowerCase(),
                    "."
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("article", { className: "preset-overview-card", children: [
                  /* @__PURE__ */ jsx("span", { className: "panorama-kicker", children: rewriteBuildTarget ? "REWRITE TRANSFER" : "BUILD TARGET" }),
                  /* @__PURE__ */ jsx("strong", { children: rewriteBuildTarget ? "HPCRP1 / HPCR2" : targetModeDetails.title }),
                  /* @__PURE__ */ jsx("p", { children: rewriteBuildTarget ? `${profiles.length} profile${profiles.length === 1 ? "" : "s"} will build ${presetVpkFileName} for ${rewriteQollockTarget ? "hp_colors_rewrite_qollock" : "hp_colors_rewrite"}${!rewriteQollockTarget && session.showranksCompatible ? " with ShowRank escape-menu hooks merged in" : ""}. Code-copy actions remain available below.` : `${profiles.length} profile${profiles.length === 1 ? "" : "s"} will be packaged as ${presetVpkFileName}.` })
                ] }),
                /* @__PURE__ */ jsxs("article", { className: "preset-overview-card preset-overview-actions", children: [
                  /* @__PURE__ */ jsx("span", { className: "panorama-kicker", children: "PRESET ACTIONS" }),
                  /* @__PURE__ */ jsx("strong", { children: "Add or remove presets" }),
                  /* @__PURE__ */ jsx("p", { children: "Create another preset or remove the currently selected one." }),
                  /* @__PURE__ */ jsxs("div", { className: "preset-overview-action-row", children: [
                    /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", onClick: handleAddProfile, disabled: profiles.length >= profileLimit, children: [
                      /* @__PURE__ */ jsx(Plus, { "aria-hidden": "true" }),
                      /* @__PURE__ */ jsx("span", { children: "Add preset" })
                    ] }),
                    /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", onClick: handleDeleteProfile, disabled: profiles.length <= 1, children: [
                      /* @__PURE__ */ jsx(Trash2, { "aria-hidden": "true" }),
                      /* @__PURE__ */ jsx("span", { children: "Remove selected" })
                    ] })
                  ] })
                ] })
              ] }) : /* @__PURE__ */ jsxs("div", { className: "schema-field-list", children: [
                visibleFields.map((field) => /* @__PURE__ */ jsxs(Fragment2, { children: [
                  /* @__PURE__ */ jsx(
                    SchemaField,
                    {
                      field,
                      value: state[field.id],
                      onChange: updateField,
                      conditionRule: activeOverrides[field.id],
                      onEditCondition: (id) => dispatchSessionIntent({ type: "OPEN_SIGNATURE_CONDITION", id }),
                      showConditionButton: true
                    }
                  ),
                  showPrecisePipsControl && field.id === "hp_pip_visible" ? fullTargetMode ? /* @__PURE__ */ jsxs("div", { className: "schema-field-row precise-pips-row", children: [
                    /* @__PURE__ */ jsxs("div", { className: "schema-field-meta", children: [
                      /* @__PURE__ */ jsx("span", { id: "precise-pips-label", className: "schema-field-label", children: "More Precise HP Pips" }),
                      /* @__PURE__ */ jsx("span", { className: "precise-pips-field-hint", children: "Requires game convars; not stored in the Full preset VPK." })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "schema-field-control precise-pips-field-control", children: /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        className: "secondary-action precise-pips-open",
                        onClick: () => {
                          setPrecisePipsDialogMode("precise");
                          setPrecisePipsOpen(true);
                        },
                        children: "Configure"
                      }
                    ) })
                  ] }) : /* @__PURE__ */ jsxs("div", { className: "precise-pips-row", children: [
                    /* @__PURE__ */ jsx(
                      SchemaField,
                      {
                        field: PRECISE_PIPS_FIELD,
                        value: state.hp_precise_pips_enabled,
                        onChange: handleMinimalPrecisePipsChange,
                        showConditionButton: false
                      }
                    ),
                    /* @__PURE__ */ jsx("span", { className: "precise-pips-field-hint", children: "Stored in this Minimal preset." })
                  ] }) : null
                ] }, field.id)),
                visibleFields.length === 0 && !showPrecisePipsControl ? /* @__PURE__ */ jsxs("div", { className: "empty-panel", children: [
                  /* @__PURE__ */ jsx("strong", { children: "No visible controls" }),
                  /* @__PURE__ */ jsx("span", { children: "Enable the related setting in this preset to reveal the dependent options." })
                ] }) : null
              ] }) })
            ] }),
            showPresetTools ? /* @__PURE__ */ jsxs("aside", { className: "anita-right-rail", id: "builderBuild", children: [
              /* @__PURE__ */ jsxs("div", { className: "rail-heading", children: [
                /* @__PURE__ */ jsx("span", { className: "panorama-kicker", children: "Tools" }),
                /* @__PURE__ */ jsx("strong", { children: "Preset utility" })
              ] }),
              /* @__PURE__ */ jsx(DisclosurePanel, { title: "Import game preset codes", open: importOpen, onOpenChange: (open) => dispatchSessionIntent({ type: "SET_IMPORT_OPEN", open }), children: /* @__PURE__ */ jsxs("div", { className: "import-panel-body", children: [
                /* @__PURE__ */ jsx("p", { className: "panel-helper", children: "Paste an HPCRP1 preset or bundle from the rewrite menu. HPCRP1 and HPCR2 copy-code actions remain supported." }),
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    id: "importText",
                    className: "builder-textarea",
                    rows: 5,
                    value: importText,
                    onInput: (e) => dispatchSessionIntent({ type: "SET_IMPORT_TEXT", text: e.currentTarget.value }),
                    placeholder: "Paste COPY ALL or HP Colors import codes here"
                  }
                ),
                /* @__PURE__ */ jsx("div", { className: "rail-actions", children: /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", onClick: handleImport, disabled: busy || !importText.trim(), children: [
                  /* @__PURE__ */ jsx(Upload, { "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Import codes" })
                ] }) })
              ] }) }),
              !rewriteBuildTarget ? /* @__PURE__ */ jsx(DisclosurePanel, { title: "Convert VPK", open: convertOpen, onOpenChange: (open) => dispatchSessionIntent({ type: "SET_CONVERT_OPEN", open }), children: /* @__PURE__ */ jsxs("div", { className: "convert-panel-body", children: [
                /* @__PURE__ */ jsxs("label", { className: "builder-file-control", children: [
                  /* @__PURE__ */ jsx("span", { children: "Preset VPK" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "file",
                      accept: ".vpk",
                      onChange: (event) => {
                        const nextFile = event.target.files?.[0] || null;
                        dispatchSessionIntent({ type: "SET_CONVERT_FILE", file: nextFile });
                        dispatchSessionIntent({ type: "SET_CONVERT_STATUS", status: nextFile ? `Ready: ${nextFile.name}` : "" });
                      }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("p", { className: "panel-helper", children: "Rebuild a generated HP Colors preset VPK for the other base mod." }),
                /* @__PURE__ */ jsxs("div", { className: "convert-action-grid", children: [
                  !fullTargetMode ? /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      className: "secondary-action",
                      disabled: !convertFile || busy,
                      onClick: () => performConvert(HP_COLORS_MOD_VARIANTS.FULL),
                      children: [
                        /* @__PURE__ */ jsx(RotateCcw, { "aria-hidden": "true" }),
                        /* @__PURE__ */ jsx("span", { children: "To Full" })
                      ]
                    }
                  ) : null,
                  fullTargetMode ? /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      className: "secondary-action",
                      disabled: !convertFile || busy,
                      onClick: () => performConvert(HP_COLORS_MOD_VARIANTS.MINIMAL),
                      children: [
                        /* @__PURE__ */ jsx(RotateCcw, { "aria-hidden": "true" }),
                        /* @__PURE__ */ jsx("span", { children: "To Minimal" })
                      ]
                    }
                  ) : null
                ] }),
                convertStatus ? /* @__PURE__ */ jsx("p", { className: "convert-status", children: convertStatus }) : null
              ] }) }) : null,
              /* @__PURE__ */ jsx(DisclosurePanel, { title: "Export profiles", open: previewOpen, onOpenChange: (open) => dispatchSessionIntent({ type: "SET_PREVIEW_OPEN", open }), children: /* @__PURE__ */ jsxs("div", { className: "export-action-list", children: [
                /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => handleExport("copy-rewrite-settings", () => copyText(createRewriteSettingsCode(activeProfile)), "Copied rewrite settings code."), children: [
                  /* @__PURE__ */ jsx(Copy, { "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Copy rewrite settings" })
                ] }),
                /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => handleExport("copy-current", () => copyText(createRewritePresetCode(activeProfile, activeProfileIndex)), `Copied ${presetName} for the rewrite.`), children: [
                  /* @__PURE__ */ jsx(Copy, { "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Copy rewrite preset" })
                ] }),
                /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => handleExport("copy-all", () => copyText(createRewritePresetBundle(profiles, activeProfile?.id)), `Copied ${profiles.length} rewrite preset${profiles.length === 1 ? "" : "s"}.`), children: [
                  /* @__PURE__ */ jsx(Copy, { "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Copy all rewrite presets" })
                ] }),
                /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => handleExport("export-json", () => downloadText(createProfilesJsonFileName(presetName), createProfilesJsonExport(profiles, session.targetMode), "application/json;charset=utf-8"), "Downloaded profile JSON."), children: [
                  /* @__PURE__ */ jsx(FileJson, { "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx("span", { children: "Download builder JSON" })
                ] })
              ] }) })
            ] }) : null
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "builder-status-dock", "aria-label": "Builder status", children: [
        feedback ? /* @__PURE__ */ jsxs("div", { className: `operation-feedback is-${feedback.type}`, role: feedback.type === "error" ? "alert" : "status", children: [
          feedback.type === "error" ? /* @__PURE__ */ jsx(AlertTriangle, { "aria-hidden": "true" }) : /* @__PURE__ */ jsx(Check, { "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("span", { children: feedback.message })
        ] }) : null,
        buildResult ? /* @__PURE__ */ jsxs("div", { className: "build-result-card", role: "status", children: [
          /* @__PURE__ */ jsx("strong", { children: buildResult.filename }),
          /* @__PURE__ */ jsxs("dl", { children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "Size" }),
              /* @__PURE__ */ jsxs("dd", { children: [
                Number(buildResult.byteLength || 0).toLocaleString(),
                " bytes"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "SHA-256" }),
              /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx("code", { children: buildResult.sha256 }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            "Move the file into ",
            /* @__PURE__ */ jsx("code", { children: buildResult.installDirectory || installDirectory }),
            "."
          ] }),
          /* @__PURE__ */ jsx("p", { children: buildResult.targetLabel === "hp_colors_rewrite_qollock" ? "Keep hp_colors_rewrite_qollock pak02 and pinned QOLLOCK pak03 installed beside this generated pak01." : buildResult.targetLabel === "hp_colors_rewrite" ? buildResult.showranksCompatible ? "Keep hp_colors_rewrite as pak02 and showrank_barebones as pak03 below this generated pak01 (lower pak numbers win)." : "Keep hp_colors_rewrite installed as the rewrite runtime." : `Keep the selected ${targetModeDetails.title.toLowerCase()} installed as the base runtime.` })
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { className: "status-card", role: "status", children: [
          /* @__PURE__ */ jsx(Braces, { "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("span", { children: status })
        ] })
      ] })
    ] }),
    conditionalField ? /* @__PURE__ */ jsx(
      SignatureConditionDialog,
      {
        field: conditionalField,
        baseValue: state[conditionalField.id],
        rule: activeOverrides[conditionalField.id],
        onClose: closeSignatureCondition,
        onSave: saveSignatureCondition
      },
      conditionalField.id
    ) : null,
    precisePipsOpen ? /* @__PURE__ */ jsx(
      PrecisePipsDialog,
      {
        initialMode: precisePipsDialogMode,
        onModeChange: fullTargetMode ? null : (mode) => updateField(PRECISE_PIPS_FIELD.id, mode === "precise"),
        onClose: () => setPrecisePipsOpen(false)
      }
    ) : null,
    modePickerOpen && targetModeLoaded ? /* @__PURE__ */ jsxs("div", { className: "build-warning-modal target-mode-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "targetModeTitle", children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "build-warning-backdrop", onClick: closeTargetModePicker, "aria-label": "Cancel" }),
      /* @__PURE__ */ jsxs("div", { ref: targetDialogRef, className: "build-warning-panel target-mode-panel", tabIndex: -1, children: [
        /* @__PURE__ */ jsx("div", { className: "build-warning-badge", children: modePickerUpgrade ? "New setup step" : "Setup" }),
        /* @__PURE__ */ jsx("h3", { id: "targetModeTitle", children: "Choose your HP Colors mod" }),
        /* @__PURE__ */ jsx("p", { children: modePickerUpgrade ? "This update needs to know which base mod your preset VPK is for. Your saved presets are still here." : "Pick the base mod that will read the preset VPK. You can change this later from the top bar." }),
        /* @__PURE__ */ jsx("div", { className: "target-mode-choice-grid", role: "group", "aria-label": "HP Colors target mod", children: TARGET_MODE_CHOICES.map((choice) => {
          const selected = targetMode === choice.id;
          return /* @__PURE__ */ jsxs("div", { className: selected ? "target-mode-choice is-selected" : "target-mode-choice", children: [
            /* @__PURE__ */ jsxs("button", { type: "button", className: "target-mode-choice-select", onClick: () => commitTargetMode(choice.id), children: [
              /* @__PURE__ */ jsxs("span", { className: "target-mode-choice-title", children: [
                /* @__PURE__ */ jsx(Layers3, { "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("strong", { children: choice.title }),
                selected ? /* @__PURE__ */ jsx(Check, { "aria-hidden": "true" }) : null
              ] }),
              /* @__PURE__ */ jsx("span", { className: "target-mode-choice-summary", children: choice.summary }),
              /* @__PURE__ */ jsx("span", { className: "target-mode-choice-description", children: choice.description })
            ] }),
            choice.downloadDisabledInV2 ? /* @__PURE__ */ jsxs("button", { type: "button", className: "target-mode-choice-download is-disabled", disabled: true, children: [
              /* @__PURE__ */ jsx(Download, { "aria-hidden": "true" }),
              /* @__PURE__ */ jsx("span", { children: "Download this mod" }),
              /* @__PURE__ */ jsx("span", { className: "target-mode-choice-download-flag", children: "Not ready" })
            ] }) : /* @__PURE__ */ jsxs("a", { className: "target-mode-choice-download", href: choice.downloadHref, target: "_blank", rel: "noreferrer", children: [
              /* @__PURE__ */ jsx(Download, { "aria-hidden": "true" }),
              /* @__PURE__ */ jsx("span", { children: "Download this mod" })
            ] })
          ] }, choice.id);
        }) }),
        /* @__PURE__ */ jsx("div", { className: "build-warning-actions", children: /* @__PURE__ */ jsx("button", { type: "button", className: "secondary-action", onClick: closeTargetModePicker, children: "Cancel" }) })
      ] })
    ] }) : null,
    warningOpen && /* @__PURE__ */ jsxs("div", { className: "build-warning-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "buildWarningTitle", children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "build-warning-backdrop", onClick: closeBuildWarning, "aria-label": "Cancel" }),
      /* @__PURE__ */ jsxs("div", { ref: buildDialogRef, className: "build-warning-panel", tabIndex: -1, children: [
        /* @__PURE__ */ jsx("div", { className: "build-warning-badge", children: rewriteBuildTarget ? "Rewrite install" : "Build target" }),
        /* @__PURE__ */ jsx("h3", { id: "buildWarningTitle", children: rewriteBuildTarget ? `Confirm ${rewriteQollockTarget ? "hp_colors_rewrite_qollock" : "hp_colors_rewrite"} preset VPK` : `Confirm ${targetModeDetails.label} preset VPK` }),
        /* @__PURE__ */ jsxs("div", { className: "build-warning-summary", "aria-label": "Build summary", children: [
          /* @__PURE__ */ jsxs("div", { className: "build-warning-item", children: [
            /* @__PURE__ */ jsx("span", { className: "build-warning-item-icon", children: /* @__PURE__ */ jsx(Layers3, { "aria-hidden": "true" }) }),
            /* @__PURE__ */ jsxs("span", { className: "build-warning-item-copy", children: [
              /* @__PURE__ */ jsx("span", { children: "Target / profiles" }),
              /* @__PURE__ */ jsx("strong", { children: rewriteBuildTarget ? `${rewriteQollockTarget ? "hp_colors_rewrite_qollock" : "hp_colors_rewrite"} / ${profiles.length} total` : `${targetModeDetails.title} / ${profiles.length} total` })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "build-warning-item", children: [
            /* @__PURE__ */ jsx("span", { className: "build-warning-item-icon", children: /* @__PURE__ */ jsx(Braces, { "aria-hidden": "true" }) }),
            /* @__PURE__ */ jsxs("span", { className: "build-warning-item-copy", children: [
              /* @__PURE__ */ jsx("span", { children: "Routing" }),
              /* @__PURE__ */ jsxs("strong", { children: [
                profileScopeCounts.all,
                " global / ",
                profileScopeCounts.selected,
                " selected / ",
                profileScopeCounts.off,
                " off"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "build-warning-item", children: [
            /* @__PURE__ */ jsx("span", { className: "build-warning-item-icon", children: /* @__PURE__ */ jsx(Check, { "aria-hidden": "true" }) }),
            /* @__PURE__ */ jsxs("span", { className: "build-warning-item-copy", children: [
              /* @__PURE__ */ jsx("span", { children: "Changed settings" }),
              /* @__PURE__ */ jsx("strong", { children: changedSettingCount })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "build-warning-item is-output", children: [
            /* @__PURE__ */ jsx("span", { className: "build-warning-item-icon", children: /* @__PURE__ */ jsx(PakFileIcon, { showLabel: true, "aria-hidden": "true" }) }),
            /* @__PURE__ */ jsxs("span", { className: "build-warning-item-copy", children: [
              /* @__PURE__ */ jsx("span", { children: "Fixed output" }),
              /* @__PURE__ */ jsx("strong", { children: presetVpkFileName }),
              /* @__PURE__ */ jsx("code", { children: "\u2026/SteamLibrary/steamapps/common/Deadlock/game/citadel/addons" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "target-mode-summary-card", children: rewriteBuildTarget ? /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "target-mode-summary-label", children: rewriteQollockTarget ? "Rewrite + QOLLOCK runtime" : "Rewrite runtime" }),
          /* @__PURE__ */ jsx("strong", { children: rewriteQollockTarget ? "hp_colors_rewrite_qollock" : "hp_colors_rewrite" }),
          /* @__PURE__ */ jsx("p", { children: rewriteQollockTarget ? "Install the hp_colors_rewrite_qollock support pak02 and pinned QOLLOCK pak03 first. This generated pak01 contains only the composite Escape-menu layout with the HPCRP1 preset." : session.showranksCompatible ? "Install order (lower pak numbers win): this generated pak01 preset, then hp_colors_rewrite as pak02, then showrank_barebones as pak03. The preset layout merges the ShowRank escape-menu hooks." : "Install the hp_colors_rewrite base package first. This VPK replaces its escape-menu layout and stores HPCRP1 in a hidden XML label." }),
          rewriteQollockTarget ? /* @__PURE__ */ jsx("div", { className: "target-mode-summary-actions", children: /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", onClick: () => {
            closeBuildWarning();
            openTargetModePicker();
          }, children: [
            /* @__PURE__ */ jsx(Layers3, { "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "Change target" })
          ] }) }) : null
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "target-mode-summary-label", children: "Selected base mod" }),
            /* @__PURE__ */ jsx("strong", { children: targetModeDetails.title }),
            /* @__PURE__ */ jsx("p", { children: targetModeDetails.summary }),
            targetModeDetails.downloadDisabledInV2 ? /* @__PURE__ */ jsx("span", { className: "target-mode-summary-download-link is-disabled", "aria-disabled": "true", children: "Base mod download is not ready yet." }) : /* @__PURE__ */ jsx("a", { className: "target-mode-summary-download-link", href: targetModeDetails.downloadHref, target: "_blank", rel: "noreferrer", children: "Need the base mod? Download it first." })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "target-mode-summary-actions", children: /* @__PURE__ */ jsxs("button", { type: "button", className: "secondary-action", onClick: () => {
            closeBuildWarning();
            openTargetModePicker();
          }, children: [
            /* @__PURE__ */ jsx(Layers3, { "aria-hidden": "true" }),
            /* @__PURE__ */ jsx("span", { children: "Change target" })
          ] }) })
        ] }) }),
        allProfilesOff ? /* @__PURE__ */ jsxs("div", { className: "build-mod-warning", role: "alert", children: [
          /* @__PURE__ */ jsx("span", { className: "build-mod-warning-icon", children: /* @__PURE__ */ jsx(AlertTriangle, { "aria-hidden": "true" }) }),
          /* @__PURE__ */ jsxs("span", { className: "build-mod-warning-copy", children: [
            /* @__PURE__ */ jsx("strong", { children: "Every profile is off" }),
            /* @__PURE__ */ jsx("span", { children: "The VPK will build, but no profile will be routed to a hero." })
          ] })
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { className: (rewriteBuildTarget ? rewriteInstallValidated : installValidated) ? "build-validation-card is-valid" : "build-validation-card", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "build-validation-label", children: "Install check" }),
            (rewriteBuildTarget ? rewriteInstallValidated : installValidated) ? null : /* @__PURE__ */ jsx("strong", { children: rewriteBuildTarget ? rewriteQollockTarget ? "Validate the Rewrite + QOLLOCK install order first" : "Validate hp_colors_rewrite first" : "Validate the base mod first" })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "secondary-action build-validation-action",
              onClick: () => {
                if (rewriteBuildTarget) setRewriteInstallValidated((value) => !value);
                else dispatchSessionIntent({ type: "TOGGLE_INSTALL_VALIDATION" });
              },
              children: [
                /* @__PURE__ */ jsx(ShieldCheck, { "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: rewriteBuildTarget ? rewriteInstallValidated ? "Undo Rewrite install confirmation" : rewriteQollockTarget ? "I installed Rewrite + QOLLOCK pak02 and pak03" : "I installed hp_colors_rewrite" : installValidated ? "Undo install confirmation" : "I installed the selected base mod" })
              ]
            }
          )
        ] }),
        buildVariantWarning ? /* @__PURE__ */ jsxs("div", { className: "build-mod-warning", role: "alert", "aria-live": "polite", children: [
          /* @__PURE__ */ jsx("span", { className: "build-mod-warning-icon", children: /* @__PURE__ */ jsx(AlertTriangle, { "aria-hidden": "true" }) }),
          /* @__PURE__ */ jsxs("span", { className: "build-mod-warning-copy", children: [
            /* @__PURE__ */ jsx("strong", { children: buildVariantWarning.title }),
            /* @__PURE__ */ jsx("span", { children: buildVariantWarning.message })
          ] })
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { className: "build-warning-actions", children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "secondary-action", onClick: closeBuildWarning, children: "Cancel" }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "primary-action build-confirm-action",
              disabled: rewriteBuildTarget ? !rewriteInstallValidated || busy : !canConfirmBuildVariant || busy,
              onClick: () => {
                if (busy) return;
                if (rewriteBuildTarget) {
                  if (!rewriteInstallValidated) return;
                  performRewriteBuild(rewriteQollockTarget);
                } else {
                  if (!canConfirmBuildVariant) return;
                  performBuild(targetMode);
                }
              },
              children: [
                /* @__PURE__ */ jsx(Download, { "aria-hidden": "true" }),
                /* @__PURE__ */ jsx("span", { children: busy ? "Building\u2026" : "Confirm build" })
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "page-footer", "aria-label": "Project notices", children: /* @__PURE__ */ jsxs("p", { children: [
      "Unofficial fan-made tool. Not affiliated with Valve. Runs locally; preset files are not uploaded. Built by",
      " ",
      /* @__PURE__ */ jsx("a", { href: "https://github.com/Hantu-Raya", target: "_blank", rel: "noreferrer", children: "Hantu-Raya" }),
      ".",
      " ",
      "Source on",
      " ",
      /* @__PURE__ */ jsx("a", { href: "https://github.com/Hantu-Raya/hp-colors-preset-builder", target: "_blank", rel: "noreferrer", children: "GitHub" }),
      ".",
      " ",
      "Apache-2.0 licensed; see LICENSE and NOTICE."
    ] }) })
  ] });
}
function PakFileIcon({ showLabel = false, ...props }) {
  return /* @__PURE__ */ jsxs("svg", { className: showLabel ? "pak-file-icon has-label" : "pak-file-icon", viewBox: "0 0 96 96", fill: "none", ...props, children: [
    /* @__PURE__ */ jsx(
      "path",
      {
        d: "M32 14h23l15 15v40c0 4.8-3.8 8.6-8.6 8.6H32c-4.8 0-8.6-3.8-8.6-8.6V22.6c0-4.8 3.8-8.6 8.6-8.6Z",
        stroke: "#07110d",
        strokeWidth: "2.1",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ jsx(
      "path",
      {
        d: "M55 15v15h15",
        stroke: "#07110d",
        strokeWidth: "2.1",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ jsx(
      "path",
      {
        d: "M32 14h23l15 15v40c0 4.8-3.8 8.6-8.6 8.6H32c-4.8 0-8.6-3.8-8.6-8.6V22.6c0-4.8 3.8-8.6 8.6-8.6Z",
        stroke: "currentColor",
        strokeWidth: "2.4",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ jsx(
      "path",
      {
        d: "M55 15v15h15",
        stroke: "currentColor",
        strokeWidth: "2.4",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    ),
    showLabel ? /* @__PURE__ */ jsx(
      "text",
      {
        x: "4",
        y: "90",
        fill: "currentColor",
        stroke: "#07110d",
        strokeWidth: "2.8",
        paintOrder: "stroke fill",
        strokeLinejoin: "round",
        fontFamily: "Consolas, 'Courier New', monospace",
        fontSize: "34",
        fontWeight: "900",
        children: "VPK"
      }
    ) : null
  ] });
}
function HeroAvatar({ hero }) {
  if (!hero) return /* @__PURE__ */ jsx("span", { className: "hero-avatar hero-avatar-fallback", "aria-hidden": "true", children: "?" });
  if (hero.icon?.src) {
    return /* @__PURE__ */ jsx("span", { className: "hero-avatar", "aria-hidden": "true", children: /* @__PURE__ */ jsx("img", { src: hero.icon.src, alt: "", loading: "lazy" }) });
  }
  return /* @__PURE__ */ jsx(
    "span",
    {
      className: "hero-avatar",
      "aria-hidden": "true",
      children: hero.name.slice(0, 2).toUpperCase()
    }
  );
}
function DisclosurePanel({ title, open, onOpenChange, children }) {
  return /* @__PURE__ */ jsxs("section", { className: open ? "disclosure-panel is-open" : "disclosure-panel", children: [
    /* @__PURE__ */ jsxs("button", { type: "button", className: "disclosure-trigger", onClick: () => onOpenChange(!open), "aria-expanded": open, children: [
      /* @__PURE__ */ jsx("span", { children: title }),
      /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: open ? "-" : "+" })
    ] }),
    open ? /* @__PURE__ */ jsx("div", { className: "disclosure-body", children }) : null
  ] });
}

import { Fragment } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
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
  Library,
  Plus,
  RotateCcw,
  ShieldCheck,
  Star,
  Trash2,
  Upload
} from 'lucide-preact';
import { HP_FIELD_CATALOG, REWRITE_FIELD_CATALOG } from '../hpv2HpSchema.js';
import { createHpMenuGroups } from '../hpv2HpMenuNavigation.js';
import {
  getHpHeroById,
  HP_HEROES,
  HP_HERO_SCOPE_ALL,
  HP_HERO_SCOPE_OFF
} from '../hpHeroData.js';
import { HP_COLORS_MOD_VARIANTS } from '../hpModVariants.js';
import { buildGitCommitInfoRequestUrl, isGitCommitInfoPayload } from '../gitCommitInfoRefresh.js';
import {
  TARGET_MODE_CHOICES,
  V2_TARGET_MODE_STORAGE_KEY,
  isFullTargetMode,
  isRewriteQollockTarget
} from '../targetModeStore.js';
import { copyText, downloadText } from '../download.js';
import {
  cleanProfileName,
  createProfilePersistenceSnapshot,
  migrateLegacyV2ProfileState,
  saveProfileState,
  V2_STORAGE_KEY
} from '../profileStore.js';
import {
  createProfilesJsonExport,
  createProfilesJsonFileName
} from '../presetBuilderExport.js';
import {
  createRewritePresetBundle,
  createRewritePresetCode,
  createRewriteSettingsCode,
  decodeRewriteTransfer
} from '../hpv2RewritePresetCodec.js';
import {
  createPresetBuilderSession,
  loadPresetBuilderSession,
  reducePresetBuilderSession,
  selectPresetBuilderSession
} from '../hpv2PresetBuilderSession.js';
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
} from '../hpv2PresetBuilderWorkflow.js';
import { SchemaField } from './schema-field.jsx';
import { SchemaTabs, SchemaTree } from './schema-tree-v2.jsx';
import HealthbarPreview from './HealthbarHPV2Preview.jsx';
import KofiLeaderboardTicker from './KofiLeaderboardTicker.jsx';

const PRECISE_PIPS_COMMAND = [
  '"citadel_unit_status_health_per_minor_pip" "10"',
  '"citadel_unit_status_health_per_pip" "10"',
  '"citadel_unit_status_minor_pip_per_major_pip" "10"'
].join('\n');
const RESET_PIPS_COMMAND = [
  '"citadel_unit_status_health_per_minor_pip" "100"',
  '"citadel_unit_status_health_per_pip" "100"',
  '"citadel_unit_status_minor_pip_per_major_pip" "5"'
].join('\n');
const PRECISE_PIPS_FIELD = Object.freeze({
  id: 'hp_precise_pips_enabled',
  label: 'More Precise HP Pips',
  type: 'toggle',
  defaultValue: false
});



function scheduleIdleWork(callback) {
  if (typeof window === 'undefined') return () => {};
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 800 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 160);
  return () => window.clearTimeout(id);
}

function useDialogA11y(open, onClose) {
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusable = () => Array.from(panel?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])'
    ) || []);
    focusable()[0]?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [onClose, open]);
  return panelRef;
}

function moveRovingFocus(event, refs, currentIndex, itemCount) {
  let nextIndex = null;
  if (event.key === 'ArrowDown') nextIndex = Math.min(itemCount - 1, currentIndex + 1);
  if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = itemCount - 1;
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

  return (
    <div className="build-warning-modal signature-condition-modal" role="dialog" aria-modal="true" aria-labelledby="signatureConditionTitle">
      <button type="button" className="build-warning-backdrop" onClick={onClose} aria-label="Cancel" />
      <div ref={dialogRef} className="build-warning-panel signature-condition-panel" tabIndex={-1}>
        <div className="build-warning-badge">Signature condition</div>
        <h3 id="signatureConditionTitle">{field.label}</h3>
        <p>Use a different value when an ability reaches the selected signature tier.</p>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`signature-condition-toggle${enabled ? ' is-checked' : ''}`}
          onClick={() => setEnabled((current) => !current)}
        >
          <span>Use signature tier</span>
          <strong>{enabled ? 'On' : 'Off'}</strong>
        </button>
        <fieldset className="signature-condition-group" disabled={!enabled}>
          <legend>Ability slot</legend>
          <div className="signature-condition-options" role="radiogroup" aria-label="Ability slot">
            {[1, 2, 3, 4].map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                className={slot === option ? 'is-selected' : ''}
                aria-checked={slot === option}
                onClick={() => setSlot(option)}
              >
                Ability {option}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="signature-condition-group" disabled={!enabled}>
          <legend>Minimum tier</legend>
          <div className="signature-condition-options" role="radiogroup" aria-label="Minimum tier">
            {[1, 2, 3].map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                className={minTier === option ? 'is-selected' : ''}
                aria-checked={minTier === option}
                onClick={() => setMinTier(option)}
              >
                Tier {option}+
              </button>
            ))}
          </div>
        </fieldset>
        <div className={`signature-condition-value${enabled ? '' : ' is-disabled'}`}>
          <span>Conditional value</span>
          <SchemaField
            field={editorField}
            value={value}
            onChange={(_id, nextValue) => setValue(nextValue)}
            showConditionButton={false}
          />
        </div>
        <div className="build-warning-actions">
          {rule ? (
            <button type="button" className="secondary-action signature-condition-remove" onClick={() => onSave(null)}>
              <Trash2 aria-hidden="true" />
              Remove
            </button>
          ) : null}
          <button type="button" className="secondary-action" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="primary-action"
            onClick={() => onSave(enabled ? { slot, minTier, value } : null)}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function PrecisePipsDialog({ initialMode = 'precise', onModeChange = null, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [copyState, setCopyState] = useState('ready');
  const dialogRef = useDialogA11y(true, onClose);
  const precise = mode === 'precise';
  const command = precise ? PRECISE_PIPS_COMMAND : RESET_PIPS_COMMAND;

  async function handleCopyCommand() {
    try {
      await copyText(command);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    setCopyState('ready');
    onModeChange?.(nextMode);
  }

  return (
    <div className="build-warning-modal precise-pips-modal" role="dialog" aria-modal="true" aria-labelledby="precisePipsTitle" aria-describedby="precisePipsWarning">
      <button type="button" className="build-warning-backdrop" onClick={onClose} aria-label="Close precise pips dialog" />
      <div ref={dialogRef} className="build-warning-panel precise-pips-panel" tabIndex={-1}>
        <div className="build-warning-badge">Game settings required</div>
        <h3 id="precisePipsTitle">More Precise HP Pips</h3>
        <p id="precisePipsWarning" className="precise-pips-warning">
          {precise
            ? 'Copy these commands and paste them under your convar block. HP Colors cannot apply or verify these game settings.'
            : 'Copy these reset commands and paste them under your convar block to restore the default pip scale.'}
        </p>
        <div className="precise-pips-mode" role="radiogroup" aria-label="Pip scale">
          <button type="button" role="radio" aria-checked={precise} className={precise ? 'is-selected' : ''} onClick={() => chooseMode('precise')}>
            More precise
          </button>
          <button type="button" role="radio" aria-checked={!precise} className={!precise ? 'is-selected' : ''} onClick={() => chooseMode('default')}>
            Game default
          </button>
        </div>
        <pre className="precise-pips-command"><code>{command}</code></pre>
        <div className="build-warning-actions">
          <button type="button" className="secondary-action" onClick={onClose}>Close</button>
          <button type="button" className="primary-action" onClick={handleCopyCommand}>
            {copyState === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy command'}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function PresetBuilderIsland({ gitCommitInfo = null, supporters = [] }) {
  const defaultState = useMemo(() => HP_FIELD_CATALOG.createDefaultState(), []);
  const rewriteDefaultState = useMemo(() => REWRITE_FIELD_CATALOG.createDefaultState(), []);
  const [freshGitCommitInfo, setFreshGitCommitInfo] = useState(gitCommitInfo);
  const [session, setSession] = useState(() => createPresetBuilderSession(defaultState));
  const latestProfileSnapshot = useRef(createProfilePersistenceSnapshot(session));
  const containsRewriteProfiles = (session.profiles || []).some((profile) => Boolean(profile?.rewrite));
  const rewriteQollockTarget = isRewriteQollockTarget(session.targetMode);
  const rewriteBuildTarget = isFullTargetMode(session.targetMode) || rewriteQollockTarget || containsRewriteProfiles;
  const activeCatalog = rewriteBuildTarget ? REWRITE_FIELD_CATALOG : HP_FIELD_CATALOG;
  const activeDefaultState = rewriteBuildTarget ? rewriteDefaultState : defaultState;
  const groups = useMemo(
    () => activeCatalog.variant === 'rewrite'
      ? createHpMenuGroups(activeCatalog)
      : createHpMenuGroups(HP_FIELD_CATALOG.schema),
    [activeCatalog]
  );
  const sharedGroups = useMemo(() => createHpMenuGroups(HP_FIELD_CATALOG.schema), []);
  const presetLibraryGroup = useMemo(
    () => groups.flatMap((group) => group.children || []).find((group) => group.pageId === 'overview-presets'),
    [groups]
  );
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
  const conditionalField = conditionalFieldId
    ? { id: conditionalFieldId, ...activeCatalog.schema[conditionalFieldId] }
    : null;
  const showPrecisePipsControl = currentGroup?.pageId === 'health-pips-levels';
  const showPresetTools = currentGroup?.pageId === 'overview-presets';
  const showHealthbarPreview = !showPresetTools;
  const rewritePreviewState = activeProfile?.rewrite?.webValues || null;
  const previewConversionRequired = activeCatalog.variant !== 'rewrite' || !rewritePreviewState;
  const profileOptionRefs = useRef([]);
  const heroOptionRefs = useRef([]);
  const operationLockRef = useRef(false);
  const [precisePipsOpen, setPrecisePipsOpen] = useState(false);
  const [precisePipsDialogMode, setPrecisePipsDialogMode] = useState('precise');
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
  const handlePreviewConvert = useCallback(() => {
    const storage = window.localStorage;
    setSession((previous) => {
      const targeted = commitPresetBuilderTargetMode({
        session: previous,
        targetMode: HP_COLORS_MOD_VARIANTS.FULL,
        storage,
        targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY
      });
      return reducePresetBuilderSession(targeted, { type: 'ENSURE_REWRITE_PROFILES' }, {
        catalog: activeCatalog,
        defaultState: activeDefaultState,
        groups,
        activeKey
      });
    });
  }, [activeCatalog, activeDefaultState, activeKey, groups]);


  useEffect(() => {
    if (!rewriteBuildTarget || profiles.every((profile) => profile?.rewrite)) return;
    dispatchSessionIntent({ type: 'ENSURE_REWRITE_PROFILES' });
  }, [dispatchSessionIntent, profiles, rewriteBuildTarget]);


  const openBuildWarning = useCallback(() => {
    dispatchSessionIntent({ type: 'OPEN_BUILD_WARNING' });
  }, [dispatchSessionIntent]);
  const closeBuildWarning = useCallback(() => {
    dispatchSessionIntent({ type: 'CLOSE_BUILD_WARNING' });
  }, [dispatchSessionIntent]);
  const closeTargetModePicker = useCallback(() => {
    dispatchSessionIntent({ type: 'CLOSE_TARGET_MODE_PICKER' });
  }, [dispatchSessionIntent]);
  const closeSignatureCondition = useCallback(() => {
    dispatchSessionIntent({ type: 'CLOSE_SIGNATURE_CONDITION' });
  }, [dispatchSessionIntent]);
  const saveSignatureCondition = useCallback((rule) => {
    if (!conditionalFieldId) return;
    dispatchSessionIntent({ type: 'SET_SIGNATURE_CONDITION', id: conditionalFieldId, rule });
  }, [conditionalFieldId, dispatchSessionIntent]);
  const buildDialogRef = useDialogA11y(warningOpen, closeBuildWarning);
  const targetDialogRef = useDialogA11y(modePickerOpen && targetModeLoaded, closeTargetModePicker);

  function commitTargetMode(nextMode) {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    setSession((previous) => commitPresetBuilderTargetMode({
      session: previous,
      targetMode: nextMode,
      storage,
      targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY
    }));
  }

  function commitShowranksCompatible(nextValue) {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    setSession((previous) => commitShowranksCompatibleState({
      session: previous,
      showranksCompatible: nextValue,
      storage
    }));
  }

  function openTargetModePicker() {
    dispatchSessionIntent({ type: 'OPEN_TARGET_MODE_PICKER' });
  }

  useEffect(() => {
    latestProfileSnapshot.current = createProfilePersistenceSnapshot(session);
  }, [session]);

  useEffect(() => {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    const migration = migrateLegacyV2ProfileState(storage, defaultState);
    const loaded = loadPresetBuilderSession(storage, defaultState, {
      profileStorageKey: V2_STORAGE_KEY,
      targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY
    });
    if (migration.error) loaded.feedback = { type: 'error', message: migration.error };
    setSession(loaded);
  }, [defaultState]);

  useEffect(() => {
    if (!profilesLoaded) return undefined;
    return scheduleIdleWork(() => {
      const storage = typeof window !== 'undefined' ? window.localStorage : null;
      const saved = saveProfileState(storage, latestProfileSnapshot.current, V2_STORAGE_KEY);
      if (!saved.ok) dispatchSessionIntent({ type: 'SET_FEEDBACK', feedback: { type: 'error', message: saved.error } });
    });
  }, [activeProfileId, dispatchSessionIntent, profiles, profilesLoaded]);

  useEffect(() => {
    if (!profilesLoaded || typeof window === 'undefined') return;
    const flushProfileState = () => {
      saveProfileState(window.localStorage, latestProfileSnapshot.current, V2_STORAGE_KEY);
    };
    window.addEventListener('pagehide', flushProfileState);
    return () => {
      window.removeEventListener('pagehide', flushProfileState);
      flushProfileState();
    };
  }, [profilesLoaded]);

  useEffect(() => {
    let ignore = false;
    const refreshCommitInfo = async () => {
      try {
        const response = await fetch(buildGitCommitInfoRequestUrl(import.meta.env.BASE_URL), { cache: 'no-store' });
        if (!response.ok) return;
        const nextGitCommitInfo = await response.json();
        if (!ignore && isGitCommitInfoPayload(nextGitCommitInfo)) {
          setFreshGitCommitInfo(nextGitCommitInfo);
        }
      } catch {
        // Keep the statically embedded commit info when the refresh endpoint is unavailable.
      }
    };
    refreshCommitInfo();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      const dialogOpen = warningOpen || modePickerOpen || precisePipsOpen || Boolean(conditionalFieldId);
      if (event.key === 'Escape' && !dialogOpen) {
        dispatchSessionIntent({ type: 'CLOSE_MENUS' });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !busy && !dialogOpen) {
        event.preventDefault();
        openBuildWarning();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [busy, conditionalFieldId, dispatchSessionIntent, modePickerOpen, openBuildWarning, precisePipsOpen, warningOpen]);

  function updateField(id, value) {
    dispatchSessionIntent({ type: 'UPDATE_FIELD', id, value });
  }

  function handleMinimalPrecisePipsChange(id, value) {
    updateField(id, value);
    setPrecisePipsDialogMode(value ? 'precise' : 'default');
    setPrecisePipsOpen(true);
  }

  function renameActiveProfile(name) {
    dispatchSessionIntent({ type: 'RENAME_ACTIVE_PROFILE', name });
  }

  function handleHeroToggle(heroId) {
    dispatchSessionIntent({ type: 'TOGGLE_HERO', heroId });
  }

  function handleClearHeroes() {
    dispatchSessionIntent({ type: 'CLEAR_HEROES' });
  }

  function handleSelectGroup(group) {
    let cursor = group;
    while (cursor?.children?.length) cursor = cursor.children[0];
    setActiveKey(activeCatalog.getCategoryKey(cursor || group));
  }

  function openPresetLibrary() {
    if (presetLibraryGroup) handleSelectGroup(presetLibraryGroup);
  }

  const handleImport = useCallback(async () => {
    if (busy || operationLockRef.current) return;
    operationLockRef.current = true;
    dispatchSessionIntent({ type: 'OPERATION_STARTED', operation: 'import' });
    try {
      const rewriteTransfer = decodeRewriteTransfer(importText, { defaultState: activeDefaultState });
      if (rewriteTransfer) {
        dispatchSessionIntent(
          { type: 'IMPORT_PROFILES_SUCCEEDED', importedProfiles: rewriteTransfer.profiles },
          { defaultState: activeDefaultState, groups, activeKey, catalog: activeCatalog }
        );
        dispatchSessionIntent({ type: 'SET_IMPORT_TEXT', text: '' });
      } else {
        await runPresetImportWorkflow({ importText, defaultState, groups: sharedGroups, activeKey, dispatch: dispatchSessionIntent });
      }
      dispatchSessionIntent({ type: 'OPERATION_SUCCEEDED' });
    } catch (error) {
      dispatchSessionIntent({ type: 'IMPORT_FAILED', message: error?.message || String(error) });
    } finally {
      operationLockRef.current = false;
    }
  }, [activeCatalog, activeDefaultState, activeKey, busy, defaultState, dispatchSessionIntent, groups, importText, sharedGroups]);

  function handleResetPage() {
    dispatchSessionIntent({
      type: 'RESET_FIELDS',
      fieldIds: (currentGroup?.fields || []).map((field) => field.id),
      defaultState: activeDefaultState
    });
  }

  function handleResetAll() {
    dispatchSessionIntent({ type: 'RESET_ALL_FIELDS', defaultState: activeDefaultState });
  }

  function handleAddProfile() {
    dispatchSessionIntent({ type: 'ADD_PROFILE', defaultState: activeDefaultState });
  }

  function handleDeleteProfile() {
    dispatchSessionIntent({ type: 'DELETE_ACTIVE_PROFILE' }, { presetName });
  }

  function handleSelectProfile(profileId) {
    dispatchSessionIntent({ type: 'SELECT_PROFILE', profileId });
  }

  function handleDropProfile(event, toIndex) {
    event.preventDefault();
    const rawIndex = event.dataTransfer.getData('text/plain');
    const fromIndex = rawIndex === '' ? dragIndex : Number(rawIndex);
    dispatchSessionIntent({ type: 'DROP_PROFILE', fromIndex, toIndex });
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
    dispatchSessionIntent({ type: 'OPERATION_STARTED', operation: 'convert' });
    try {
      await runPresetConvertWorkflow({ convertFile, targetModVariant, loadBaseHudXml, dispatch: dispatchSessionIntent });
      dispatchSessionIntent({ type: 'OPERATION_SUCCEEDED' });
    } finally {
      operationLockRef.current = false;
    }
  }, [busy, convertFile, dispatchSessionIntent, loadBaseHudXml]);

  const handleExport = useCallback(async (operation, value, successMessage) => {
    if (busy || operationLockRef.current) return;
    operationLockRef.current = true;
    dispatchSessionIntent({ type: 'OPERATION_STARTED', operation });
    try {
      await value();
      dispatchSessionIntent({ type: 'OPERATION_SUCCEEDED', message: successMessage });
    } catch (error) {
      dispatchSessionIntent({ type: 'OPERATION_FAILED', message: error?.message || String(error) });
    } finally {
      operationLockRef.current = false;
    }
  }, [busy, dispatchSessionIntent]);

  const heroOptions = [
    { id: 'all', label: 'All heroes', avatar: 'All', selected: activeHeroMode === HP_HERO_SCOPE_ALL, onSelect: handleClearHeroes },
    ...HP_HEROES.map((hero) => ({
      id: hero.id,
      label: hero.name,
      hero,
      selected: selectedHeroSet.has(hero.id),
      onSelect: () => handleHeroToggle(hero.id)
    }))
  ];

  return (
    <div className="panorama-page">
      <div className="panorama-shell" role="region" aria-label="HP Colors preset builder">
        <header className="panorama-topbar">
          <div className="panorama-brand-block">
            <span className="panorama-kicker">Deadlock preset builder</span>
            <div className="panorama-title-row">
              <span className="panorama-brand">HP Colors</span>
              {activeGitCommitInfo?.url && activeGitCommitInfo?.shortHash ? (
                <a
                  className="commit-version-link"
                  href={activeGitCommitInfo.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={activeGitCommitInfo.title || `Latest commit ${activeGitCommitInfo.shortHash}`}
                  data-tooltip={activeGitCommitInfo.title || `Latest commit ${activeGitCommitInfo.shortHash}`}
                >
                  <GitCommitHorizontal aria-hidden="true" />
                  <span>Commit</span>
                  <code>{activeGitCommitInfo.shortHash}</code>
                </a>
              ) : null}
              <KofiLeaderboardTicker supporters={supporters} />
            </div>
          </div>
          <div className="panorama-header-actions">
            <div className="topbar-workflow-actions" aria-label="Build workflow">
              <div className="topbar-support-actions">
                <a className="support-button top-support-button" href="https://ko-fi.com/hantuaraya" target="_blank" rel="noreferrer" aria-label="Donate on Ko-fi">
                  <Heart aria-hidden="true" />
                  <span>Donate</span>
                </a>
                <a className="support-button star-repo-button" href="https://github.com/Hantu-Raya/hp-colors-preset-builder" target="_blank" rel="noreferrer" aria-label="Star the repository on GitHub">
                  <Star aria-hidden="true" />
                  <span>Star</span>
                </a>
              </div>
            <button
              type="button"
              className="target-mode-trigger"
              onClick={openTargetModePicker}
            >
              <Layers3 aria-hidden="true" />
              <span className="target-mode-text">
                <span>Target</span>
                <strong>{rewriteBuildTarget
                  ? rewriteQollockTarget
                    ? 'Rewritev2 + QOLLOCK'
                    : session.showranksCompatible ? 'Rewritev2 + ShowRank' : 'Rewritev2'
                  : targetModeDetails.label}</strong>
              </span>
            </button>
            <button
              type="button"
              className={showPresetTools ? 'preset-shortcut is-active' : 'preset-shortcut'}
              onClick={openPresetLibrary}
              aria-current={showPresetTools ? 'page' : undefined}
            >
              <Library aria-hidden="true" />
              <span>Presets</span>
            </button>
            {rewriteBuildTarget && !rewriteQollockTarget ? (
              <button
                type="button"
                aria-label={`Showranks compatible ${session.showranksCompatible ? 'on' : 'off'}`}
                className={session.showranksCompatible ? 'showranks-toggle is-active' : 'showranks-toggle'}
                onClick={() => commitShowranksCompatible(!session.showranksCompatible)}
                aria-pressed={session.showranksCompatible}
              >
                <ShieldCheck aria-hidden="true" />
                <span className="target-mode-text">
                  <span>Rewritev2 + ShowRank</span>
                  <strong>{session.showranksCompatible ? 'On' : 'Off'}</strong>
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="build-action"
              onClick={openBuildWarning}
              disabled={busy}
              title={rewriteBuildTarget ? `Build ${presetVpkFileName} for ${rewriteQollockTarget ? 'hp_colors_rewrite_qollock' : 'hp_colors_rewrite'}.` : undefined}
            >
              <Download aria-hidden="true" />
              <span>{busyOperation === 'build' ? 'Building…' : 'Build VPK'}</span>
            </button>
            </div>
            <div className="topbar-profile-workspace" aria-label="Profile workspace">
            <div className="topbar-profile-controls" aria-label="Preset profiles">
              <button type="button" className="profile-icon-action" onClick={handleAddProfile} disabled={profiles.length >= profileLimit} aria-label="Add preset">
                <Plus aria-hidden="true" />
              </button>
              <button type="button" className="profile-icon-action" onClick={handleDeleteProfile} disabled={profiles.length <= 1} aria-label="Remove preset">
                <Trash2 aria-hidden="true" />
              </button>
              <div className="profile-selector">
                <button
                  type="button"
                  className="profile-selector-trigger"
                  onClick={() => dispatchSessionIntent({ type: 'TOGGLE_PROFILE_MENU' })}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="listbox"
                >
                  <span className="profile-selector-title">{presetName}</span>
                  <span className="profile-selector-meta">{activeOverrideCount} override{activeOverrideCount === 1 ? '' : 's'} / {profiles.length}</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                {profileMenuOpen && (
                  <div className="profile-selector-menu" role="listbox" aria-label="Preset profiles">
                    {profiles.map((profile, index) => {
                      const label = cleanProfileName(profile.name, index);
                      const profileState = activeCatalog.variant === 'rewrite'
                        ? activeCatalog.sanitizeState(profile.rewrite?.webValues || {})
                        : profile.values;
                      const overrides = activeCatalog.countOverrides(profileState, activeDefaultState) + Object.keys(profile.overrides || {}).length;
                      const active = profile.id === activeProfile.id;
                      return (
                        <div
                          key={profile.id}
                          className="profile-menu-entry"
                          draggable
                          onDragStart={(event) => {
                            dispatchSessionIntent({ type: 'SET_DRAG_INDEX', dragIndex: index });
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', String(index));
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(event) => handleDropProfile(event, index)}
                          onDragEnd={() => dispatchSessionIntent({ type: 'SET_DRAG_INDEX', dragIndex: null })}
                        >
                          <button
                            ref={(node) => { profileOptionRefs.current[index] = node; }}
                            type="button"
                            className={active ? 'profile-menu-row is-active' : 'profile-menu-row'}
                            role="option"
                            tabIndex={active ? 0 : -1}
                            aria-selected={active}
                            onClick={() => handleSelectProfile(profile.id)}
                            onKeyDown={(event) => {
                              if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                                event.preventDefault();
                                dispatchSessionIntent({ type: 'MOVE_PROFILE', profileId: profile.id, direction: event.key === 'ArrowUp' ? -1 : 1 });
                                return;
                              }
                              const nextIndex = moveRovingFocus(event, profileOptionRefs, index, profiles.length);
                              if (nextIndex !== null) dispatchSessionIntent({ type: 'NAVIGATE_PROFILE', profileId: profiles[nextIndex].id });
                            }}
                          >
                            <GripVertical className="profile-drag-handle" aria-hidden="true" />
                            <span className="profile-menu-text">
                              <span className="profile-row-name">{label}</span>
                              <span className="profile-row-meta">{overrides} override{overrides === 1 ? '' : 's'} / priority {index + 1}</span>
                            </span>
                          </button>
                          <div className="profile-move-actions" aria-label={`Move ${label}`}>
                            <button type="button" disabled={index === 0} onClick={() => dispatchSessionIntent({ type: 'MOVE_PROFILE', profileId: profile.id, direction: -1 })} aria-label={`Move ${label} up`}>
                              <ArrowUp aria-hidden="true" />
                            </button>
                            <button type="button" disabled={index === profiles.length - 1} onClick={() => dispatchSessionIntent({ type: 'MOVE_PROFILE', profileId: profile.id, direction: 1 })} aria-label={`Move ${label} down`}>
                              <ArrowDown aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <label className="preset-name-control" htmlFor="presetName">
              <span>Profile</span>
              <input id="presetName" className="builder-input" value={activeProfile.name} onChange={(e) => renameActiveProfile(e.target.value)} />
            </label>
            <div className="hero-selector">
              <button
                type="button"
                className="hero-selector-trigger"
                onClick={() => dispatchSessionIntent({ type: 'TOGGLE_HERO_MENU' })}
                aria-expanded={heroMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="hero-selector-stack" aria-hidden="true">
                  {activeHeroMode === HP_HERO_SCOPE_OFF ? (
                    <span className="hero-avatar hero-avatar-all" aria-hidden="true">Off</span>
                  ) : (
                    (selectedHeroIds.length ? selectedHeroIds.slice(0, 3) : HP_HEROES.slice(0, 3).map((hero) => hero.id)).map((heroId) => (
                      <HeroAvatar key={heroId} hero={getHpHeroById(heroId)} />
                    ))
                  )}
                </span>
                <span className="hero-selector-text">
                  <span className="hero-selector-label">Heroes</span>
                  <span className="hero-selector-value">{heroSelectionLabel}</span>
                </span>
                <ChevronDown aria-hidden="true" />
              </button>
              {heroMenuOpen ? (
                <div className="hero-selector-menu" role="listbox" aria-label="Target heroes" aria-multiselectable="true">
                  {heroOptions.map((option, index) => (
                    <button
                      key={option.id}
                      ref={(node) => { heroOptionRefs.current[index] = node; }}
                      type="button"
                      className={option.selected ? 'hero-menu-row is-active' : 'hero-menu-row'}
                      role="option"
                      tabIndex={index === Math.max(0, heroOptions.findIndex((item) => item.selected)) ? 0 : -1}
                      aria-selected={option.selected}
                      onClick={option.onSelect}
                      onKeyDown={(event) => moveRovingFocus(event, heroOptionRefs, index, heroOptions.length)}
                    >
                      {option.hero ? <HeroAvatar hero={option.hero} /> : <span className="hero-avatar hero-avatar-all" aria-hidden="true">{option.avatar}</span>}
                      <span className="hero-menu-name">{option.label}</span>
                      {option.selected ? <Check aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            </div>
            <div className="topbar-utility-bar">
              <div className="topbar-utility-links">
            <nav className="similar-tools" aria-label="Builder versions and similar tools">
              <span className="similar-tools-label">Versions</span>
              <a className="similar-tool-link" href={`${import.meta.env.BASE_URL}v2/`} aria-label="Original V2 builder" title="Original V2 builder">
                V2
              </a>
              <a className="similar-tool-link" href={`${import.meta.env.BASE_URL}hpv2/`} aria-label="HPv2 preview builder" title="HPv2 preview builder">
                HPv2
              </a>
              <a className="similar-tool-link" href="https://hantu-raya.github.io/color-blind-web-builder/" target="_blank" rel="noreferrer" aria-label="Color Blind Builder" title="Color Blind Builder">
                Color Blind
              </a>
              <a className="similar-tool-link" href="https://hantu-raya.github.io/3d-hud-web-merger/" target="_blank" rel="noreferrer" aria-label="3D HUD VPK Merger" title="3D HUD VPK Merger">
                3D HUD
              </a>
            </nav>
              </div>
            </div>
          </div>
        </header>
        <nav className="mobile-workspace-nav" aria-label="Mobile builder navigation">
          <a href="#builderCategories">Sections</a>
          <a href="#builderSettings">Current page</a>
        </nav>

        <div className="panorama-workspace">
          <SchemaTree groups={groups} activeKey={activeKey} state={state} defaultState={activeDefaultState} onSelect={handleSelectGroup} />
          <div id="builderSettings" className="anita-menu-content">
            <SchemaTabs groups={groups} activeKey={activeKey} onSelect={handleSelectGroup} />
            <div className={showPresetTools ? 'anita-page-body has-tools' : showHealthbarPreview ? 'anita-page-body has-preview' : 'anita-page-body'}>

          <section className="anita-detail-panel">
            <div className="anita-detail-header-row">
              <div className="anita-page-heading">
                <span className="anita-page-eyebrow">{currentGroup?.path?.[0] || 'SETTINGS'}</span>
                <h2>{currentGroup?.title || currentGroup?.name}</h2>
                <div className="anita-page-rule" />
                <p className="anita-page-description">{currentGroup?.description}</p>
                {!showPresetTools ? (
                  <p className="anita-detail-hint">
                    {visibleCount + (showPrecisePipsControl ? 1 : 0)} visible controls / {profiles.length} profile{profiles.length === 1 ? '' : 's'}
                  </p>
                ) : null}
              </div>
              {!showPresetTools ? (
                <div className="reset-actions">
                  <button type="button" className="quiet-action" onClick={handleResetPage}>
                    <RotateCcw aria-hidden="true" />
                    <span>Reset Section</span>
                  </button>
                  <button type="button" className="quiet-action" onClick={handleResetAll}>
                    <RotateCcw aria-hidden="true" />
                    <span>Reset All</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div className="detail-scroll">
              {showPresetTools ? (
                <div className="preset-overview">
                  <article className="preset-overview-card">
                    <span className="panorama-kicker">CURRENT PRESET</span>
                    <strong>{presetName}</strong>
                    <p>{activeOverrideCount} override{activeOverrideCount === 1 ? '' : 's'} routed to {heroSelectionLabel.toLowerCase()}.</p>
                  </article>
                  <article className="preset-overview-card">
                    <span className="panorama-kicker">{rewriteBuildTarget ? 'REWRITE TRANSFER' : 'BUILD TARGET'}</span>
                    <strong>{rewriteBuildTarget ? 'HPCRP1 / HPCR2' : targetModeDetails.title}</strong>
                    <p>
                      {rewriteBuildTarget
                        ? `${profiles.length} profile${profiles.length === 1 ? '' : 's'} will build ${presetVpkFileName} for ${rewriteQollockTarget ? 'hp_colors_rewrite_qollock' : 'hp_colors_rewrite'}${!rewriteQollockTarget && session.showranksCompatible ? ' with ShowRank escape-menu hooks merged in' : ''}. Code-copy actions remain available below.`
                        : `${profiles.length} profile${profiles.length === 1 ? '' : 's'} will be packaged as ${presetVpkFileName}.`}
                    </p>
                  </article>
                  <article className="preset-overview-card preset-overview-actions">
                    <span className="panorama-kicker">PRESET ACTIONS</span>
                    <strong>Add or remove presets</strong>
                    <p>Create another preset or remove the currently selected one.</p>
                    <div className="preset-overview-action-row">
                      <button type="button" className="secondary-action" onClick={handleAddProfile} disabled={profiles.length >= profileLimit}>
                        <Plus aria-hidden="true" />
                        <span>Add preset</span>
                      </button>
                      <button type="button" className="secondary-action" onClick={handleDeleteProfile} disabled={profiles.length <= 1}>
                        <Trash2 aria-hidden="true" />
                        <span>Remove selected</span>
                      </button>
                    </div>
                  </article>
                </div>
              ) : (
              <div className="schema-field-list">
                {visibleFields.map((field) => (
                  <Fragment key={field.id}>
                    <SchemaField
                      field={field}
                      value={state[field.id]}
                      onChange={updateField}
                      conditionRule={activeOverrides[field.id]}
                      onEditCondition={(id) => dispatchSessionIntent({ type: 'OPEN_SIGNATURE_CONDITION', id })}
                      showConditionButton
                    />
                    {showPrecisePipsControl && field.id === 'hp_pip_visible' ? (
                      fullTargetMode ? (
                        <div className="schema-field-row precise-pips-row">
                          <div className="schema-field-meta">
                            <span id="precise-pips-label" className="schema-field-label">More Precise HP Pips</span>
                            <span className="precise-pips-field-hint">Requires game convars; not stored in the Full preset VPK.</span>
                          </div>
                          <div className="schema-field-control precise-pips-field-control">
                            <button
                              type="button"
                              className="secondary-action precise-pips-open"
                              onClick={() => {
                                setPrecisePipsDialogMode('precise');
                                setPrecisePipsOpen(true);
                              }}
                            >
                              Configure
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="precise-pips-row">
                          <SchemaField
                            field={PRECISE_PIPS_FIELD}
                            value={state.hp_precise_pips_enabled}
                            onChange={handleMinimalPrecisePipsChange}
                            showConditionButton={false}
                          />
                          <span className="precise-pips-field-hint">Stored in this Minimal preset.</span>
                        </div>
                      )
                    ) : null}
                  </Fragment>
                ))}
                {visibleFields.length === 0 && !showPrecisePipsControl ? (
                  <div className="empty-panel">
                    <strong>No visible controls</strong>
                    <span>Enable the related setting in this preset to reveal the dependent options.</span>
                  </div>
                ) : null}
              </div>
              )}
            </div>
          </section>

          {showPresetTools ? (
          <aside className="anita-right-rail" id="builderBuild">
            <div className="rail-heading">
              <span className="panorama-kicker">Tools</span>
              <strong>Preset utility</strong>
            </div>
            <DisclosurePanel title="Import game preset codes" open={importOpen} onOpenChange={(open) => dispatchSessionIntent({ type: 'SET_IMPORT_OPEN', open })}>
              <div className="import-panel-body">
                <p className="panel-helper">
                  Paste an HPCRP1 preset or bundle from the rewrite menu. HPCRP1 and HPCR2 copy-code actions remain supported.
                </p>
                <textarea
                  id="importText"
                  className="builder-textarea"
                  rows={5}
                  value={importText}
                  onInput={(e) => dispatchSessionIntent({ type: 'SET_IMPORT_TEXT', text: e.currentTarget.value })}
                  placeholder="Paste COPY ALL or HP Colors import codes here"
                />
                <div className="rail-actions">
                  <button type="button" className="secondary-action" onClick={handleImport} disabled={busy || !importText.trim()}>
                    <Upload aria-hidden="true" />
                    <span>Import codes</span>
                  </button>
                </div>
              </div>
            </DisclosurePanel>

            {!rewriteBuildTarget ? (
            <DisclosurePanel title="Convert VPK" open={convertOpen} onOpenChange={(open) => dispatchSessionIntent({ type: 'SET_CONVERT_OPEN', open })}>
              <div className="convert-panel-body">
                <label className="builder-file-control">
                  <span>Preset VPK</span>
                  <input
                    type="file"
                    accept=".vpk"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      dispatchSessionIntent({ type: 'SET_CONVERT_FILE', file: nextFile });
                      dispatchSessionIntent({ type: 'SET_CONVERT_STATUS', status: nextFile ? `Ready: ${nextFile.name}` : '' });
                    }}
                  />
                </label>
                <p className="panel-helper">Rebuild a generated HP Colors preset VPK for the other base mod.</p>
                <div className="convert-action-grid">
                  {!fullTargetMode ? (
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={!convertFile || busy}
                      onClick={() => performConvert(HP_COLORS_MOD_VARIANTS.FULL)}
                    >
                      <RotateCcw aria-hidden="true" />
                      <span>To Full</span>
                    </button>
                  ) : null}
                  {fullTargetMode ? (
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={!convertFile || busy}
                      onClick={() => performConvert(HP_COLORS_MOD_VARIANTS.MINIMAL)}
                    >
                      <RotateCcw aria-hidden="true" />
                      <span>To Minimal</span>
                    </button>
                  ) : null}
                </div>
                {convertStatus ? <p className="convert-status">{convertStatus}</p> : null}
              </div>
            </DisclosurePanel>
            ) : null}

            <DisclosurePanel title="Export profiles" open={previewOpen} onOpenChange={(open) => dispatchSessionIntent({ type: 'SET_PREVIEW_OPEN', open })}>
              <div className="export-action-list">
                <button type="button" className="secondary-action" disabled={busy} onClick={() => handleExport('copy-rewrite-settings', () => copyText(createRewriteSettingsCode(activeProfile)), 'Copied rewrite settings code.')}>
                  <Copy aria-hidden="true" />
                  <span>Copy rewrite settings</span>
                </button>
                <button type="button" className="secondary-action" disabled={busy} onClick={() => handleExport('copy-current', () => copyText(createRewritePresetCode(activeProfile, activeProfileIndex)), `Copied ${presetName} for the rewrite.`)}>
                  <Copy aria-hidden="true" />
                  <span>Copy rewrite preset</span>
                </button>
                <button type="button" className="secondary-action" disabled={busy} onClick={() => handleExport('copy-all', () => copyText(createRewritePresetBundle(profiles, activeProfile?.id)), `Copied ${profiles.length} rewrite preset${profiles.length === 1 ? '' : 's'}.`)}>
                  <Copy aria-hidden="true" />
                  <span>Copy all rewrite presets</span>
                </button>
                <button type="button" className="secondary-action" disabled={busy} onClick={() => handleExport('export-json', () => downloadText(createProfilesJsonFileName(presetName), createProfilesJsonExport(profiles, session.targetMode), 'application/json;charset=utf-8'), 'Downloaded profile JSON.')}>
                  <FileJson aria-hidden="true" />
                  <span>Download builder JSON</span>
                </button>
              </div>
            </DisclosurePanel>

          </aside>
          ) : showHealthbarPreview ? (
          <aside className="anita-right-rail healthbar-preview-rail" aria-label="Healthbar live preview">
            <HealthbarPreview
              profileState={rewritePreviewState}
              conversionRequired={previewConversionRequired}
              profileName={presetName}
              onConvert={handlePreviewConvert}
            />
          </aside>
          ) : null}
            </div>
          </div>
        </div>
        <div className="builder-status-dock" aria-label="Builder status">
          {feedback ? (
            <div className={`operation-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
              {feedback.type === 'error' ? <AlertTriangle aria-hidden="true" /> : <Check aria-hidden="true" />}
              <span>{feedback.message}</span>
            </div>
          ) : null}
          {buildResult ? (
            <div className="build-result-card" role="status">
              <strong>{buildResult.filename}</strong>
              <dl>
                <div><dt>Size</dt><dd>{Number(buildResult.byteLength || 0).toLocaleString()} bytes</dd></div>
                <div><dt>SHA-256</dt><dd><code>{buildResult.sha256}</code></dd></div>
              </dl>
              <p>Move the file into <code>{buildResult.installDirectory || installDirectory}</code>.</p>
              <p>{buildResult.targetLabel === 'hp_colors_rewrite_qollock'
                ? 'Keep hp_colors_rewrite_qollock pak02 and pinned QOLLOCK pak03 installed beside this generated pak01.'
                : buildResult.targetLabel === 'hp_colors_rewrite'
                  ? buildResult.showranksCompatible
                    ? 'Keep hp_colors_rewrite_v2 as pak02 and showrank_barebones as pak03 below this generated pak01 (lower pak numbers win).'
                    : 'Keep hp_colors_rewrite_v2 as pak02 beside this generated pak01 (lower pak numbers win).'
                  : `Keep the selected ${targetModeDetails.title.toLowerCase()} installed as the base runtime.`}</p>
            </div>
          ) : null}
          <div className="status-card" role="status">
            <Braces aria-hidden="true" />
            <span>{status}</span>
          </div>
        </div>
      </div>

      {conditionalField ? (
        <SignatureConditionDialog
          key={conditionalField.id}
          field={conditionalField}
          baseValue={state[conditionalField.id]}
          rule={activeOverrides[conditionalField.id]}
          onClose={closeSignatureCondition}
          onSave={saveSignatureCondition}
        />
      ) : null}
      {precisePipsOpen ? (
        <PrecisePipsDialog
          initialMode={precisePipsDialogMode}
          onModeChange={fullTargetMode
            ? null
            : (mode) => updateField(PRECISE_PIPS_FIELD.id, mode === 'precise')}
          onClose={() => setPrecisePipsOpen(false)}
        />
      ) : null}


      {modePickerOpen && targetModeLoaded ? (
        <div className="build-warning-modal target-mode-modal" role="dialog" aria-modal="true" aria-labelledby="targetModeTitle">
          <button type="button" className="build-warning-backdrop" onClick={closeTargetModePicker} aria-label="Cancel" />
          <div ref={targetDialogRef} className="build-warning-panel target-mode-panel" tabIndex={-1}>
            <div className="build-warning-badge">{modePickerUpgrade ? 'New setup step' : 'Setup'}</div>
            <h3 id="targetModeTitle">Choose your HP Colors mod</h3>
            <p>
              {modePickerUpgrade
                ? 'This update needs to know which base mod your preset VPK is for. Your saved presets are still here.'
                : 'Pick the base mod that will read the preset VPK. You can change this later from the top bar.'}
            </p>
            <div className="target-mode-choice-grid" role="group" aria-label="HP Colors target mod">
              {TARGET_MODE_CHOICES.map((choice) => {
                const selected = targetMode === choice.id;
                const unavailable = choice.unavailableInV2 === true;
                const choiceClassName = [
                  'target-mode-choice',
                  selected ? 'is-selected' : '',
                  unavailable ? 'is-unavailable' : ''
                ].filter(Boolean).join(' ');
                return (
                  <div key={choice.id} className={choiceClassName} aria-disabled={unavailable || undefined}>
                    <button
                      type="button"
                      className="target-mode-choice-select"
                      disabled={unavailable}
                      onClick={() => commitTargetMode(choice.id)}
                    >
                      <span className="target-mode-choice-title">
                        <Layers3 aria-hidden="true" />
                        <strong>{choice.hpv2Title || choice.v2Title || choice.title}</strong>
                        {selected && !unavailable ? <Check aria-hidden="true" /> : null}
                      </span>
                      <span className="target-mode-choice-summary">{choice.hpv2Summary || choice.v2Summary || choice.summary}</span>
                      <span className="target-mode-choice-description">{choice.hpv2Description || choice.v2Description || choice.description}</span>
                    </button>
                    {unavailable ? (
                      <button type="button" className="target-mode-choice-download is-disabled" disabled>
                        <Download aria-hidden="true" />
                        <span>Download this mod</span>
                        <span className="target-mode-choice-download-flag">Unavailable in V2</span>
                      </button>
                    ) : (
                      <a className="target-mode-choice-download" href={'downloadHrefV2' in choice ? choice.downloadHrefV2 : choice.downloadHref} target="_blank" rel="noreferrer">
                        <Download aria-hidden="true" />
                        <span>Download this mod</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="build-warning-actions">
              <button type="button" className="secondary-action" onClick={closeTargetModePicker}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {warningOpen && (
        <div className="build-warning-modal" role="dialog" aria-modal="true" aria-labelledby="buildWarningTitle">
          <button type="button" className="build-warning-backdrop" onClick={closeBuildWarning} aria-label="Cancel" />
          <div ref={buildDialogRef} className="build-warning-panel" tabIndex={-1}>
            <div className="build-warning-badge">{rewriteBuildTarget ? 'Rewrite install' : 'Build target'}</div>
            <h3 id="buildWarningTitle">{rewriteBuildTarget ? `Confirm ${rewriteQollockTarget ? 'hp_colors_rewrite_qollock' : 'hp_colors_rewrite'} preset VPK` : `Confirm ${targetModeDetails.label} preset VPK`}</h3>
            <div className="build-warning-summary" aria-label="Build summary">
              <div className="build-warning-item">
                <span className="build-warning-item-icon"><Layers3 aria-hidden="true" /></span>
                <span className="build-warning-item-copy">
                  <span>Target / profiles</span>
                  <strong>{rewriteBuildTarget ? `${rewriteQollockTarget ? 'hp_colors_rewrite_qollock' : 'hp_colors_rewrite'} / ${profiles.length} total` : `${targetModeDetails.title} / ${profiles.length} total`}</strong>
                </span>
              </div>
              <div className="build-warning-item">
                <span className="build-warning-item-icon"><Braces aria-hidden="true" /></span>
                <span className="build-warning-item-copy">
                  <span>Routing</span>
                  <strong>{profileScopeCounts.all} global / {profileScopeCounts.selected} selected / {profileScopeCounts.off} off</strong>
                </span>
              </div>
              <div className="build-warning-item">
                <span className="build-warning-item-icon"><Check aria-hidden="true" /></span>
                <span className="build-warning-item-copy">
                  <span>Changed settings</span>
                  <strong>{changedSettingCount}</strong>
                </span>
              </div>
              <div className="build-warning-item is-output">
                <span className="build-warning-item-icon"><PakFileIcon showLabel aria-hidden="true" /></span>
                <span className="build-warning-item-copy">
                  <span>Fixed output</span>
                  <strong>{presetVpkFileName}</strong>
                  <code>…/SteamLibrary/steamapps/common/Deadlock/game/citadel/addons</code>
                </span>
              </div>
            </div>
            <div className="target-mode-summary-card">
              {rewriteBuildTarget ? (
                <div>
                  <span className="target-mode-summary-label">{rewriteQollockTarget
                    ? 'Rewritev2 + QOLLOCK runtime'
                    : session.showranksCompatible ? 'Rewritev2 + ShowRank runtime' : 'Rewritev2 runtime'}</span>
                  <strong>{rewriteQollockTarget ? 'hp_colors_rewrite_qollock' : 'hp_colors_rewrite'}</strong>
                  <p>
                    {rewriteQollockTarget
                      ? 'Install the hp_colors_rewrite_qollock support pak02 and pinned QOLLOCK pak03 first. This generated pak01 contains only the composite Escape-menu layout with the HPCRP1 preset.'
                      : session.showranksCompatible
                        ? 'Install order (lower pak numbers win): this generated pak01 preset, then hp_colors_rewrite_v2 as pak02, then showrank_barebones as pak03. The preset layout merges the ShowRank escape-menu hooks.'
                        : 'Install hp_colors_rewrite_v2 as pak02 first. This generated pak01 replaces its Escape-menu layout and stores HPCRP1 in a hidden XML label.'}
                  </p>
                  {rewriteQollockTarget ? (
                    <div className="target-mode-summary-actions">
                      <button type="button" className="secondary-action" onClick={() => {
                        closeBuildWarning();
                        openTargetModePicker();
                      }}>
                        <Layers3 aria-hidden="true" />
                        <span>Change target</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div>
                    <span className="target-mode-summary-label">Selected base mod</span>
                    <strong>{targetModeDetails.hpv2Title || targetModeDetails.v2Title || targetModeDetails.title}</strong>
                    <p>{targetModeDetails.hpv2Summary || targetModeDetails.v2Summary || targetModeDetails.summary}</p>
                    {targetModeDetails.unavailableInV2 ? (
                      <span className="target-mode-summary-download-link is-disabled" aria-disabled="true">
                        This target is unavailable in V2.
                      </span>
                    ) : (
                      <a className="target-mode-summary-download-link" href={'downloadHrefV2' in targetModeDetails ? targetModeDetails.downloadHrefV2 : targetModeDetails.downloadHref} target="_blank" rel="noreferrer">
                        Need the base mod? Download it first.
                      </a>
                    )}
                  </div>
                  <div className="target-mode-summary-actions">
                    <button type="button" className="secondary-action" onClick={() => {
                      closeBuildWarning();
                      openTargetModePicker();
                    }}>
                      <Layers3 aria-hidden="true" />
                      <span>Change target</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            {allProfilesOff ? (
              <div className="build-mod-warning" role="alert">
                <span className="build-mod-warning-icon"><AlertTriangle aria-hidden="true" /></span>
                <span className="build-mod-warning-copy">
                  <strong>Every profile is off</strong>
                  <span>The VPK will build, but no profile will be routed to a hero.</span>
                </span>
              </div>
            ) : null}
            <div className={(rewriteBuildTarget ? rewriteInstallValidated : installValidated) ? 'build-validation-card is-valid' : 'build-validation-card'}>
              <div>
                <span className="build-validation-label">Install check</span>
                {(rewriteBuildTarget ? rewriteInstallValidated : installValidated)
                  ? null
                  : <strong>{rewriteBuildTarget
                    ? rewriteQollockTarget ? 'Validate the Rewrite + QOLLOCK install order first' : 'Validate hp_colors_rewrite first'
                    : 'Validate the base mod first'}</strong>}
              </div>
              <button
                type="button"
                className="secondary-action build-validation-action"
                onClick={() => {
                  if (rewriteBuildTarget) setRewriteInstallValidated((value) => !value);
                  else dispatchSessionIntent({ type: 'TOGGLE_INSTALL_VALIDATION' });
                }}
              >
                <ShieldCheck aria-hidden="true" />
                <span>{rewriteBuildTarget
                  ? rewriteInstallValidated
                    ? 'Undo Rewrite install confirmation'
                    : rewriteQollockTarget ? 'I installed Rewrite + QOLLOCK pak02 and pak03' : 'I installed hp_colors_rewrite_v2 pak02'
                  : installValidated ? 'Undo install confirmation' : 'I installed the selected base mod'}</span>
              </button>
            </div>
            <div className="build-warning-actions">
              <button type="button" className="secondary-action" onClick={closeBuildWarning}>Cancel</button>
              <button
                type="button"
                className="primary-action build-confirm-action"
                disabled={rewriteBuildTarget ? !rewriteInstallValidated || busy : !canConfirmBuildVariant || busy}
                onClick={() => {
                  if (busy) return;
                  if (rewriteBuildTarget) {
                    if (!rewriteInstallValidated) return;
                    performRewriteBuild(rewriteQollockTarget);
                  } else {
                    if (!canConfirmBuildVariant) return;
                    performBuild(targetMode);
                  }
                }}
              >
                <Download aria-hidden="true" />
                <span>{busy ? 'Building…' : 'Confirm build'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="page-footer" aria-label="Project notices">
        <p>
          Unofficial fan-made tool. Not affiliated with Valve. Preset files stay local. The page includes reviewed public supporter aliases from this repository. Built by
          {' '}
          <a href="https://github.com/Hantu-Raya" target="_blank" rel="noreferrer">Hantu-Raya</a>.
          {' '}
          Source on
          {' '}
          <a href="https://github.com/Hantu-Raya/hp-colors-preset-builder" target="_blank" rel="noreferrer">GitHub</a>.
          {' '}
          Apache-2.0 licensed; see LICENSE and NOTICE.
        </p>
      </footer>
    </div>
  );
}

function PakFileIcon({ showLabel = false, ...props }) {
  return (

    <svg className={showLabel ? 'pak-file-icon has-label' : 'pak-file-icon'} viewBox="0 0 96 96" fill="none" {...props}>
      <path
        d="M32 14h23l15 15v40c0 4.8-3.8 8.6-8.6 8.6H32c-4.8 0-8.6-3.8-8.6-8.6V22.6c0-4.8 3.8-8.6 8.6-8.6Z"
        stroke="#07110d"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M55 15v15h15"
        stroke="#07110d"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 14h23l15 15v40c0 4.8-3.8 8.6-8.6 8.6H32c-4.8 0-8.6-3.8-8.6-8.6V22.6c0-4.8 3.8-8.6 8.6-8.6Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M55 15v15h15"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLabel ? (
        <text
          x="4"
          y="90"
          fill="currentColor"
          stroke="#07110d"
          strokeWidth="2.8"
          paintOrder="stroke fill"
          strokeLinejoin="round"
          fontFamily="Consolas, 'Courier New', monospace"
          fontSize="34"
          fontWeight="900"
        >
          VPK
        </text>
      ) : null}
    </svg>
  );
}

function HeroAvatar({ hero }) {
  if (!hero) return <span className="hero-avatar hero-avatar-fallback" aria-hidden="true">?</span>;
  if (hero.icon?.src) {
    return (
      <span className="hero-avatar" aria-hidden="true">
        <img src={hero.icon.src} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span
      className="hero-avatar"
      aria-hidden="true"
    >
      {hero.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function DisclosurePanel({ title, open, onOpenChange, children }) {
  return (
    <section className={open ? 'disclosure-panel is-open' : 'disclosure-panel'}>
      <button type="button" className="disclosure-trigger" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <span>{title}</span>
        <span aria-hidden="true">{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="disclosure-body">{children}</div> : null}
    </section>
  );
}

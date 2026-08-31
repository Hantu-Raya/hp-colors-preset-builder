import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_SCENARIO, createHealthbarPipGeometry, createHealthbarPreviewModel } from '../healthbarPreviewModel.js';

const PREVIEW_SESSION_KEY = 'hp_colors_healthbar_preview_v1';
const PREVIEW_ASSET_BASE = `${String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}healthbar-preview/`;
const PREVIEW_ASSETS = Object.freeze({
  background: `${PREVIEW_ASSET_BASE}hero_healthbar_bg_psd.png`,
  fill: `${PREVIEW_ASSET_BASE}hero_healthbar_fill_center_psd.png`,
  shield: `${PREVIEW_ASSET_BASE}hero_healthbar_fill_shield_psd.png`,
  missing: `${PREVIEW_ASSET_BASE}hero_healthbar_missing_psd.png`,
  unitInfo: `${PREVIEW_ASSET_BASE}hero_info_panel_bg_psd.png`,
  ultReady: `${PREVIEW_ASSET_BASE}hero_info_panel_ultready_bg_psd.png`
});

const DEFAULT_PREVIEW_STATE = Object.freeze({
  scenario: DEFAULT_SCENARIO,
  zoom: 'fit',
  paused: false,
  mobileCollapsed: true
});

function clampPercent(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(100, Math.max(0, number));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeScenario(value) {
  const source = Object.prototype.toString.call(value) === '[object Object]' ? value : {};
  return {
    healthPercent: clampPercent(source.healthPercent, DEFAULT_SCENARIO.healthPercent),
    relation: source.relation === 'ally' ? 'ally' : 'enemy',
    team: ['enemy', 'ally', 'team1', 'team2', 'neutral'].includes(source.team) ? source.team : DEFAULT_SCENARIO.team,
    unitKind: ['hero', 'trooper', 'building', 'boss'].includes(source.unitKind) ? source.unitKind : DEFAULT_SCENARIO.unitKind,
    maxHealth: clampNumber(source.maxHealth, 100, 99999, DEFAULT_SCENARIO.maxHealth),
    level: clampNumber(source.level, 1, 30, DEFAULT_SCENARIO.level),
    healingPercent: clampPercent(source.healingPercent, DEFAULT_SCENARIO.healingPercent),
    damagePercent: clampPercent(source.damagePercent, DEFAULT_SCENARIO.damagePercent),
    bulletShieldPercent: clampPercent(source.bulletShieldPercent, DEFAULT_SCENARIO.bulletShieldPercent),
    techShieldPercent: clampPercent(source.techShieldPercent, DEFAULT_SCENARIO.techShieldPercent),
    animationPaused: Boolean(source.animationPaused)
  };
}

function readPreviewState() {
  if (!globalThis.window) return DEFAULT_PREVIEW_STATE;
  try {
    if (!window.sessionStorage) return DEFAULT_PREVIEW_STATE;
    const raw = window.sessionStorage.getItem(PREVIEW_SESSION_KEY);
    if (!raw) return DEFAULT_PREVIEW_STATE;
    const parsed = JSON.parse(raw);
    const scenario = normalizeScenario(parsed?.scenario);
    const paused = Boolean(parsed?.paused ?? scenario.animationPaused);
    return {
      scenario: { ...scenario, animationPaused: paused },
      zoom: parsed?.zoom === '2x' ? '2x' : 'fit',
      paused,
      mobileCollapsed: Boolean(parsed?.mobileCollapsed)
    };
  } catch {
    return DEFAULT_PREVIEW_STATE;
  }
}

function writePreviewState(state) {
  if (!globalThis.window) return;
  try {
    if (!window.sessionStorage) return;
    window.sessionStorage.setItem(PREVIEW_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Session-only preview state is optional when storage is blocked.
  }
}


function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString();
}

function amountForPercent(percent, maxHealth) {
  return formatNumber((clampPercent(percent) / 100) * Math.max(0, Number(maxHealth) || 0));
}

function relationLabel(relation) {
  return relation === 'ally' ? 'ALLY' : 'ENEMY';
}

function unitKindLabel(unitKind) {
  return {
    hero: 'Hero',
    trooper: 'Trooper',
    building: 'Building',
    boss: 'Boss'
  }[unitKind] || 'Hero';
}

function layerValue(layer, key, fallback = 0) {
  return clampPercent(layer?.[key], fallback);
}

function LayerTexture({ className, texture, width, color, label, visible = true }) {
  const style = {
    width: `${clampPercent(width)}%`,
    backgroundColor: color || undefined
  };
  return (
    <div className={`${className}${visible ? '' : ' is-hidden'}`} style={style} aria-label={label}>
      <img src={texture} alt="" aria-hidden="true" />
    </div>
  );
}

function Pips({ pips, maxHealth, renderWidth }) {
  if (!pips.visible) return null;
  const geometry = createHealthbarPipGeometry(pips, maxHealth, renderWidth);
  return (
    <div
      className={`healthbar-preview-pips${pips.precise ? ' is-precise' : ''}`}
      style={{
        '--healthbar-minor-pip-step': `${geometry.minorStepPercent}%`,
        '--healthbar-major-pip-step': `${geometry.majorStepPercent}%`
      }}
      aria-label={`${geometry.minorCount} health pips at ${geometry.minorHealth} HP intervals, with ${geometry.majorCount} major markers`}
    />
  );
}

function PercentageControl({ id, label, value, maxHealth, onChange }) {
  const percent = clampPercent(value);
  return (
    <label className="healthbar-preview-scenario-control" htmlFor={id}>
      <span>
        <strong>{label}</strong>
        <output htmlFor={id}>{percent}% · {amountForPercent(percent, maxHealth)} HP</output>
      </span>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        step="1"
        value={percent}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function StockHoldButton({ active, onPress, onRelease }) {
  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onPress();
  };
  const handleKeyUp = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onRelease();
  };
  return (
    <button
      type="button"
      className={`healthbar-preview-stock${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={onRelease}
    >
      Show stock
    </button>
  );
}

function HealthbarPreview({ profileState = null, conversionRequired = false, profileName = '', onConvert = null }) {
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const [zoom, setZoom] = useState(DEFAULT_PREVIEW_STATE.zoom);
  const [paused, setPaused] = useState(DEFAULT_PREVIEW_STATE.paused);
  const [mobileCollapsed, setMobileCollapsed] = useState(DEFAULT_PREVIEW_STATE.mobileCollapsed);
  const [showStock, setShowStock] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const canvasRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

  useEffect(() => {
    const saved = readPreviewState();
    setScenario(saved.scenario);
    setZoom(saved.zoom);
    setPaused(saved.paused);
    setMobileCollapsed(saved.mobileCollapsed);
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    writePreviewState({ scenario, zoom, paused, mobileCollapsed });
  }, [mobileCollapsed, paused, scenario, storageReady, zoom]);

  useEffect(() => {
    if (conversionRequired || !globalThis.window) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const updateCanvasWidth = () => setCanvasWidth(canvas.clientWidth);
    updateCanvasWidth();
    if ('ResizeObserver' in window) {
      const observer = new window.ResizeObserver(updateCanvasWidth);
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateCanvasWidth);
    return () => window.removeEventListener('resize', updateCanvasWidth);
  }, [conversionRequired]);

  const updateScenario = useCallback((key, value) => {
    setScenario((current) => ({ ...current, [key]: value }));
  }, []);

  const updatePaused = useCallback((nextPaused) => {
    setPaused(nextPaused);
    setScenario((current) => ({ ...current, animationPaused: nextPaused }));
  }, []);

  const resetPreview = useCallback(() => {
    setScenario(DEFAULT_SCENARIO);
    setZoom('fit');
    setPaused(false);
    setMobileCollapsed(false);
    setShowStock(false);
    setScenarioOpen(false);
  }, []);

  const model = useMemo(() => {
    if (conversionRequired || !profileState) return null;
    return createHealthbarPreviewModel(profileState, scenario, { stock: showStock });
  }, [conversionRequired, profileState, scenario, showStock]);

  const modelScenario = model?.scenario || scenario;
  const bar = model?.bar || {};
  const layers = bar.layers || {};
  const pips = bar.pips || {};
  const readout = model?.readout || {};
  const level = model?.level || {};
  const ult = model?.ult || {};
  const killMarker = model?.killMarker || {};
  const pulse = model?.pulse || {};
  const pulseVisible = Boolean(pulse.active);
  const pulseActive = pulseVisible && !paused;
  const pulsePaused = pulseVisible && paused;
  const healthPercent = clampPercent(modelScenario.healthPercent);
  const teamColorActive = modelScenario.relation === 'enemy'
    ? !!profileState?.hp_team_colors
    : modelScenario.relation === 'ally' && !!profileState?.hp_friend_team_colors;
  const teamSelected = modelScenario.team === 'team1' || modelScenario.team === 'team2';
  useEffect(() => {
    if (!teamColorActive || teamSelected) return;
    updateScenario('team', 'team1');
  }, [teamColorActive, teamSelected, updateScenario]);
  const barWidthPx = Math.max(1, Number(bar.widthPx) || 900);
  const barHeightPx = Math.max(1, Number(bar.heightPx) || 130);
  const canvasInnerWidth = canvasWidth || 320;
  const fitViewportWidth = Math.max(160, canvasInnerWidth - 84);
  const fitTargetWidth = Math.min(130, fitViewportWidth);
  const fitScale = fitTargetWidth / barWidthPx;
  const inspectionScale = zoom === '2x' ? 2 : 1;
  const visualScale = fitScale * inspectionScale;
  const barWidth = Math.max(1, Math.round(barWidthPx * visualScale));
  const barHeight = Math.max(1, Math.round(barHeightPx * visualScale));
  const unitInfoSize = Math.max(1, Math.round(300 * visualScale));
  const levelSize = Math.max(1, Math.round(210 * visualScale));
  const barOffsetX = clampNumber(bar.offsetX, -300, 300, 0) * visualScale;
  const barOffsetY = clampNumber(bar.offsetY, -200, 200, 0) * visualScale;
  const unitStatusWidth = zoom === '2x' ? Math.max(canvasInnerWidth, barWidth + levelSize + 6) : null;
  const killMarkerLeftPercent = (clampNumber(killMarker.leftPx, 0, barWidthPx, 0) / barWidthPx) * 100;
  const killMarkerWidthPercent = (clampNumber(killMarker.widthPx, 0, barWidthPx, 0) / barWidthPx) * 100;
  const readoutOffsetX = (clampNumber(readout.offsetX, -405, 405, 27) - 27) * visualScale;
  const readoutOffsetY = (clampNumber(readout.offsetY, -35, 840, 500) - 500) * visualScale;
  const readoutFontSize = readout.fontSize
    ? clampNumber(readout.fontSize, 72, 320, 145) * visualScale
    : undefined;
  const canvasClassName = [
    'healthbar-preview-canvas',
    zoom === '2x' ? 'is-zoomed' : 'is-fit',
    pulseVisible ? 'is-pulsing' : '',
    pulsePaused ? 'is-pulse-paused' : '',
    pulse.className ? `is-pulse-${pulse.className}` : '',
    model?.stock ? 'is-stock' : ''
  ].filter(Boolean).join(' ');

  if (conversionRequired || !profileState) {
    return (
      <section className="healthbar-preview" aria-labelledby="healthbarPreviewTitle">
        <div className="healthbar-preview-heading">
          <div>
            <span className="panorama-kicker">LIVE PREVIEW</span>
            <h3 id="healthbarPreviewTitle">Healthbar preview</h3>
          </div>
          <span className="healthbar-preview-status is-conversion">Conversion required</span>
        </div>
        <div className="healthbar-preview-conversion" role="status">
          <strong>Convert this profile to Rewrite</strong>
          <p>{profileName ? `${profileName} uses a legacy profile format.` : 'This profile uses a legacy Full or Minimal format.'} Live preview controls use Rewrite web IDs and do not alter preset storage.</p>
          <button type="button" className="primary-action" onClick={onConvert}>Convert to Rewrite</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`healthbar-preview${mobileCollapsed ? ' is-mobile-collapsed' : ''}`} aria-labelledby="healthbarPreviewTitle">
      <div className="healthbar-preview-heading">
        <div>
          <span className="panorama-kicker">LIVE PREVIEW</span>
          <h3 id="healthbarPreviewTitle">Healthbar preview</h3>
        </div>
        <span className={`healthbar-preview-status${model?.stock ? ' is-stock' : ''}`}>{model?.stock ? 'Stock' : relationLabel(modelScenario.relation)}</span>
      </div>

      <div className="healthbar-preview-mobile-actions">
        <button
          type="button"
          className="healthbar-preview-collapse"
          aria-expanded={!mobileCollapsed}
          onClick={() => setMobileCollapsed((collapsed) => !collapsed)}
        >
          {mobileCollapsed ? 'Show preview' : 'Hide preview'}
        </button>
      </div>

      <div className="healthbar-preview-content">
        <div className="healthbar-preview-controls" aria-label="Preview controls">
          <label className="healthbar-preview-health-control" htmlFor="healthbar-preview-health">
            <span>
              <strong>HP percent</strong>
              <output htmlFor="healthbar-preview-health">{healthPercent}% · {amountForPercent(healthPercent, modelScenario.maxHealth)} HP</output>
            </span>
            <input id="healthbar-preview-health" type="range" min="0" max="100" step="1" value={healthPercent} onInput={(event) => updateScenario('healthPercent', Number(event.currentTarget.value))} />
          </label>
          <div className="healthbar-preview-relation" role="radiogroup" aria-label="Preview relation">
            <span>Relation</span>
            {['enemy', 'ally'].map((relation) => (
              <button key={relation} type="button" role="radio" aria-checked={modelScenario.relation === relation} className={modelScenario.relation === relation ? 'is-active' : ''} onClick={() => updateScenario('relation', relation)}>
                {relationLabel(relation)}
              </button>
            ))}
          </div>
          {teamColorActive ? (
            <div className="healthbar-preview-relation healthbar-preview-team-switch" role="radiogroup" aria-label="Team color preview">
              <span>Team color</span>
              <button type="button" role="radio" aria-checked={modelScenario.team === 'team1'} className={modelScenario.team === 'team1' ? 'is-active' : ''} onClick={() => updateScenario('team', 'team1')}>Team 1</button>
              <button type="button" role="radio" aria-checked={modelScenario.team === 'team2'} className={modelScenario.team === 'team2' ? 'is-active' : ''} onClick={() => updateScenario('team', 'team2')}>Team 2</button>
            </div>
          ) : null}
        </div>

        <div ref={canvasRef} className={canvasClassName} data-zoom={zoom}>
          <div className="healthbar-preview-canvas-grid" aria-hidden="true" />
          <div className="healthbar-preview-unit-status" style={unitStatusWidth ? { '--healthbar-status-width': `${unitStatusWidth}px` } : undefined}>
            <div className="healthbar-preview-unit-heading">
              <span className="healthbar-preview-relation-label">{relationLabel(modelScenario.relation)} UNIT STATUS</span>
              <span className="healthbar-preview-unit-kind">{unitKindLabel(modelScenario.unitKind)}</span>
            </div>
            <div className="healthbar-preview-unit-body">
              <div
                className="healthbar-preview-hud"
                style={{
                  '--healthbar-width': `${barWidth}px`,
                  '--healthbar-height': `${barHeight}px`,
                  '--healthbar-unit-info-size': `${unitInfoSize}px`,
                  '--healthbar-level-size': `${levelSize}px`,
                  '--healthbar-offset-x': `${barOffsetX}px`,
                  '--healthbar-offset-y': `${barOffsetY}px`
                }}
              >
                {readout.visible ? (
                  <span
                    className="healthbar-preview-readout"
                    style={{
                      fontFamily: readout.fontFamily || undefined,
                      fontSize: readoutFontSize ? `${readoutFontSize}px` : undefined,
                      transform: `translate(${readoutOffsetX}px, ${readoutOffsetY}px)`
                    }}
                  >
                    <span style={{ color: readout.color || undefined }}>
                      {readout.text || `${amountForPercent(healthPercent, modelScenario.maxHealth)} / ${formatNumber(modelScenario.maxHealth)} HP`}
                    </span>
                    {readout.maxText ? <span style={{ color: readout.maxColor || undefined }}>{readout.maxText}</span> : null}
                  </span>
                ) : null}
                {level.visible !== false ? <span className={`healthbar-preview-level ${level.className || ''}`}><span className="healthbar-preview-level-text" style={{ color: level.color || undefined }}>{level.value ?? modelScenario.level}</span></span> : null}
                <span className="healthbar-preview-unit-info" aria-label="Stock unit information and ultimate-ready indicator">
                  <img className="healthbar-preview-unit-info-bg" src={PREVIEW_ASSETS.unitInfo} alt="" aria-hidden="true" />
                  {ult.visible !== false ? <span className="healthbar-preview-ult-ready" style={{ backgroundColor: ult.color || undefined, WebkitMaskImage: `url("${PREVIEW_ASSETS.ultReady}")`, maskImage: `url("${PREVIEW_ASSETS.ultReady}")` }} aria-label="Ultimate ready" /> : null}
                </span>
                <div className={`healthbar-preview-bar${bar.visible === false ? ' is-hidden' : ''}`} style={{ opacity: bar.opacity == null ? 1 : bar.opacity }}>
                  <img className="healthbar-preview-texture healthbar-preview-texture-bg" src={PREVIEW_ASSETS.background} alt="" aria-hidden="true" />
                  <div className="healthbar-preview-track">
                    <div className="healthbar-preview-health-layer" style={{ width: `${layerValue(layers.fill, 'width', healthPercent)}%`, backgroundColor: bar.color || undefined }}><img src={PREVIEW_ASSETS.fill} alt="" aria-hidden="true" /></div>
                    <LayerTexture className="healthbar-preview-layer healthbar-preview-missing-layer" texture={PREVIEW_ASSETS.missing} width={layerValue(layers.missing, 'width', 100 - healthPercent)} visible={layers.missing?.visible !== false} label={`Missing health layer ${layerValue(layers.missing, 'width', 100 - healthPercent)} percent`} />
                    <LayerTexture className="healthbar-preview-layer healthbar-preview-healing-layer" texture={PREVIEW_ASSETS.fill} width={layerValue(layers.healing, 'width')} color={layers.healing?.color} visible={layers.healing?.visible !== false} label={`Healing layer ${layerValue(layers.healing, 'width')} percent`} />
                    <LayerTexture className="healthbar-preview-layer healthbar-preview-damage-layer" texture={PREVIEW_ASSETS.fill} width={layerValue(layers.damage, 'width')} color={layers.damage?.color} visible={layers.damage?.visible !== false} label={`Damage layer ${layerValue(layers.damage, 'width')} percent`} />
                    <LayerTexture className="healthbar-preview-layer healthbar-preview-bullet-shield-layer" texture={PREVIEW_ASSETS.shield} width={layerValue(layers.bulletShield, 'width')} color={layers.bulletShield?.color} visible={layers.bulletShield?.visible !== false} label={`Bullet shield layer ${layerValue(layers.bulletShield, 'width')} percent`} />
                    <LayerTexture className="healthbar-preview-layer healthbar-preview-tech-shield-layer" texture={PREVIEW_ASSETS.shield} width={layerValue(layers.techShield, 'width')} color={layers.techShield?.color} visible={layers.techShield?.visible !== false} label={`Tech shield layer ${layerValue(layers.techShield, 'width')} percent`} />
                  </div>
                  {killMarker.visible ? <span className="healthbar-preview-kill-marker" style={{ left: `${killMarkerLeftPercent}%`, width: `${killMarkerWidthPercent}%`, backgroundColor: killMarker.color || undefined, color: killMarker.color || undefined }} aria-label={`Kill zone threshold ${formatNumber(killMarker.thresholdPercent)} percent`} /> : null}
                  <Pips pips={pips} maxHealth={modelScenario.maxHealth} renderWidth={Math.max(1, barWidth - 4)} />
                  <span className={`healthbar-preview-pulse-overlay${pulseVisible ? ' is-active' : ''}${pulsePaused ? ' is-paused' : ''}`} style={{ width: `${clampPercent(pulse.overlayWidth, 100)}%`, backgroundColor: pulse.overlayColor || pulse.color || undefined, '--healthbar-preview-pulse-duration': pulse.duration || undefined }} aria-hidden="true" />
                </div>
              </div>
            </div>
            <div className="healthbar-preview-caption"><span>{formatNumber(modelScenario.maxHealth)} max HP</span><span>{pulseActive ? 'Pulse active' : paused ? 'Animation paused' : 'Pulse ready'}</span></div>
          </div>
        </div>

        <div className="healthbar-preview-actions">
          <div className="healthbar-preview-zoom" role="radiogroup" aria-label="Preview zoom">
            <span>Zoom</span>
            {['fit', '2x'].map((option) => <button key={option} type="button" role="radio" aria-checked={zoom === option} className={zoom === option ? 'is-active' : ''} onClick={() => setZoom(option)}>{option === 'fit' ? 'Fit' : '2x zoom'}</button>)}
          </div>
          <StockHoldButton active={showStock} onPress={() => setShowStock(true)} onRelease={() => setShowStock(false)} />
          <button type="button" className="healthbar-preview-reset" onClick={resetPreview}>Reset</button>
        </div>

        <details className="healthbar-preview-scenario" open={scenarioOpen} onToggle={(event) => setScenarioOpen(event.currentTarget.open)}>
          <summary><span>Scenario</span><span>{unitKindLabel(modelScenario.unitKind)} · {formatNumber(modelScenario.maxHealth)} HP</span></summary>
          <div className="healthbar-preview-scenario-grid">
            <label className="healthbar-preview-scenario-control" htmlFor="healthbar-preview-team"><span><strong>Team</strong></span><select id="healthbar-preview-team" value={modelScenario.team} onChange={(event) => updateScenario('team', event.currentTarget.value)}><option value="enemy">Enemy</option><option value="ally">Ally</option><option value="team1">Team 1</option><option value="team2">Team 2</option><option value="neutral">Neutral</option></select></label>
            <label className="healthbar-preview-scenario-control" htmlFor="healthbar-preview-unit-kind"><span><strong>Unit kind</strong></span><select id="healthbar-preview-unit-kind" value={modelScenario.unitKind} onChange={(event) => updateScenario('unitKind', event.currentTarget.value)}><option value="hero">Hero</option><option value="trooper">Trooper</option><option value="building">Building</option><option value="boss">Boss</option></select></label>
            <label className="healthbar-preview-scenario-control" htmlFor="healthbar-preview-max-health"><span><strong>Max HP</strong><output htmlFor="healthbar-preview-max-health">{formatNumber(modelScenario.maxHealth)}</output></span><input id="healthbar-preview-max-health" type="range" min="100" max="99999" step="100" value={modelScenario.maxHealth} onInput={(event) => updateScenario('maxHealth', Number(event.currentTarget.value))} /></label>
            <label className="healthbar-preview-scenario-control" htmlFor="healthbar-preview-level"><span><strong>Level</strong><output htmlFor="healthbar-preview-level">{modelScenario.level}</output></span><input id="healthbar-preview-level" type="range" min="1" max="30" step="1" value={modelScenario.level} onInput={(event) => updateScenario('level', Number(event.currentTarget.value))} /></label>
            <PercentageControl id="healthbar-preview-healing" label="Healing layer" value={modelScenario.healingPercent} maxHealth={modelScenario.maxHealth} onChange={(value) => updateScenario('healingPercent', value)} />
            <PercentageControl id="healthbar-preview-damage" label="Damage layer" value={modelScenario.damagePercent} maxHealth={modelScenario.maxHealth} onChange={(value) => updateScenario('damagePercent', value)} />
            <PercentageControl id="healthbar-preview-bullet-shield" label="Bullet shield" value={modelScenario.bulletShieldPercent} maxHealth={modelScenario.maxHealth} onChange={(value) => updateScenario('bulletShieldPercent', value)} />
            <PercentageControl id="healthbar-preview-tech-shield" label="Tech shield" value={modelScenario.techShieldPercent} maxHealth={modelScenario.maxHealth} onChange={(value) => updateScenario('techShieldPercent', value)} />
            <label className="healthbar-preview-pause-control"><span><strong>Animation</strong><small>Pulse starts automatically unless paused.</small></span><button type="button" role="switch" aria-checked={paused} className={paused ? 'is-active' : ''} onClick={() => updatePaused(!paused)}>{paused ? 'Paused' : 'Running'}</button></label>
          </div>
        </details>
      </div>
    </section>
  );
}

export default HealthbarPreview;

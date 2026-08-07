// The control panel: pick a device, edit the slides, watch the live preview,
// save. Deliberately plain — it never ends up in an exported PNG.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { SCENES, cloneConfig, DEFAULT_CONFIG, type Slide, type StudioConfig } from './config';
import { loadConfig, saveConfig } from './config-io';
import { DEVICES, deviceById } from './devices';
import { SlideCanvas } from './slide';

const EXPORT_COMMAND = 'npm run export';

export function Dashboard() {
  const [config, setConfig] = useState<StudioConfig | null>(null);
  const [deviceId, setDeviceId] = useState(DEVICES[0].id as string);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  const patchSlide = useCallback(
    (patch: Partial<Slide>) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const slides = prev.slides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide));
        return { ...prev, slides };
      });
    },
    [index],
  );

  const persist = useCallback(
    async (next: StudioConfig, message = 'Saved to config/slides.config.json') => {
      try {
        await saveConfig(next);
        setStatus(message);
      } catch (err) {
        setStatus(`Save failed: ${(err as Error).message}`);
      }
    },
    [],
  );

  if (!config) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  const device = deviceById(deviceId);
  const slide = config.slides[index];

  return (
    <div className="studio">
      <div className="panel">
        <h1>Vizi Screenshot Studio</h1>
        <p className="sub">
          The app's UI, recreated in the browser. Edit here, save, then run{' '}
          <code>{EXPORT_COMMAND}</code> for pixel-exact PNGs.
        </p>

        <h2>Device</h2>
        <div className="field">
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            {DEVICES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <h2>Slide</h2>
        <div className="slide-tabs">
          {config.slides.map((s, i) => (
            <button key={s.slug} aria-pressed={i === index} onClick={() => setIndex(i)}>
              {i + 1}. {s.slug}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="caption">Caption</label>
          <textarea
            id="caption"
            value={slide.caption}
            onChange={(e) => patchSlide({ caption: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="slug">Filename slug</label>
          <input
            id="slug"
            type="text"
            value={slide.slug}
            onChange={(e) => patchSlide({ slug: e.target.value })}
          />
        </div>

        {slide.screen === 'session' ? (
          <>
            <div className="field">
              <label htmlFor="scene">Camera photo</label>
              <select
                id="scene"
                value={slide.scene}
                onChange={(e) => patchSlide({ scene: e.target.value })}
              >
                <option value="">(none — black frame)</option>
                {SCENES.map((scene) => (
                  <option key={scene.file} value={scene.file}>
                    {scene.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="statuspill">Status pill</label>
              <input
                id="statuspill"
                type="text"
                value={slide.status}
                onChange={(e) => patchSlide({ status: e.target.value })}
              />
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={slide.showChat}
                onChange={(e) => patchSlide({ showChat: e.target.checked })}
              />
              Show chat transcript panel
            </label>

            <h2>Transcript</h2>
            {slide.transcript.map((entry, i) => (
              <div className="entry-row" key={i}>
                <div className="row" style={{ marginBottom: 6 }}>
                  <select
                    value={entry.speaker}
                    onChange={(e) =>
                      patchSlide({
                        transcript: slide.transcript.map((t, j) =>
                          j === i ? { ...t, speaker: e.target.value as 'user' | 'vizi' } : t,
                        ),
                      })
                    }
                    style={{ width: 'auto', flex: 1 }}
                  >
                    <option value="user">YOU</option>
                    <option value="vizi">VIZI</option>
                  </select>
                  <button
                    className="btn"
                    onClick={() =>
                      patchSlide({ transcript: slide.transcript.filter((_, j) => j !== i) })
                    }
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={entry.text}
                  onChange={(e) =>
                    patchSlide({
                      transcript: slide.transcript.map((t, j) =>
                        j === i ? { ...t, text: e.target.value } : t,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <button
              className="btn"
              onClick={() =>
                patchSlide({
                  transcript: [
                    ...slide.transcript,
                    { speaker: slide.transcript.length % 2 === 0 ? 'user' : 'vizi', text: '' },
                  ],
                })
              }
            >
              + Add line
            </button>
          </>
        ) : (
          <>
            <h2>Paywall</h2>
            <div className="field">
              <label htmlFor="pw-title">Title</label>
              <input
                id="pw-title"
                type="text"
                value={config.paywall.title}
                onChange={(e) =>
                  setConfig({ ...config, paywall: { ...config.paywall, title: e.target.value } })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="pw-benefits">Benefits (one per line)</label>
              <textarea
                id="pw-benefits"
                style={{ minHeight: 96 }}
                value={config.paywall.benefits.join('\n')}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    paywall: { ...config.paywall, benefits: e.target.value.split('\n') },
                  })
                }
              />
            </div>
            {config.paywall.pricing.map((pill, i) => (
              <div className="entry-row" key={i}>
                <div className="row">
                  <input
                    type="text"
                    value={pill.label}
                    aria-label="Package label"
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        paywall: {
                          ...config.paywall,
                          pricing: config.paywall.pricing.map((p, j) =>
                            j === i ? { ...p, label: e.target.value } : p,
                          ),
                        },
                      })
                    }
                    style={{ flex: 2 }}
                  />
                  <input
                    type="text"
                    value={pill.price}
                    aria-label="Price"
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        paywall: {
                          ...config.paywall,
                          pricing: config.paywall.pricing.map((p, j) =>
                            j === i ? { ...p, price: e.target.value } : p,
                          ),
                        },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            ))}
            <p className="hint">
              Prices shown in a store screenshot must match the real products in App Store Connect.
            </p>
          </>
        )}

        <h2>Output</h2>
        <div className="row">
          <button className="btn primary" onClick={() => void persist(config)}>
            Save
          </button>
          <button
            className="btn"
            onClick={async () => {
              await persist(config, 'Saved.');
              try {
                await navigator.clipboard.writeText(EXPORT_COMMAND);
                setStatus(`Saved. "${EXPORT_COMMAND}" copied — run it in the studio folder.`);
              } catch {
                setStatus(`Saved. Now run "${EXPORT_COMMAND}" in the studio folder.`);
              }
            }}
          >
            Export all…
          </button>
          <button
            className="btn"
            onClick={() => {
              const fresh = cloneConfig(DEFAULT_CONFIG);
              setConfig(fresh);
              void persist(fresh, 'Reset to defaults.');
            }}
          >
            Reset
          </button>
        </div>
        <p className="status">{status}</p>
        <p className="hint">
          Exports land in <code>vizi-assets/screenshots/&lt;device&gt;/</code>. Every device is
          written on each run — <code>{EXPORT_COMMAND} -- --device iphone-6.9</code> narrows it.
        </p>
      </div>

      <Stage>
        <SlideCanvas device={device} slide={slide} paywall={config.paywall} />
      </Stage>
    </div>
  );
}

/** Scales the full-size canvas down so the whole slide fits on screen. */
function Stage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!stage || !wrap) return;
    const fit = () => {
      const canvas = wrap.firstElementChild as HTMLElement | null;
      if (!canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!w || !h) return;
      setScale(Math.min((stage.clientWidth - 48) / w, (stage.clientHeight - 48) / h, 1));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    // Layout size is unaffected by the CSS transform, so observing the wrapper
    // reports the canvas's true size and cannot feed back into itself.
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="stage" ref={stageRef}>
      <div ref={wrapRef} className="preview-wrap" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

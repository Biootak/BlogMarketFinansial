/**
 * Loading skeleton — Nexus Cartography
 */

import s from './_components/ExchangesWorkspace.module.css';

export default function Loading() {
  return (
    <div className={s.workspace} dir="rtl" aria-busy="true" aria-label="در حال بارگذاری">
      {/* Observatory skeleton */}
      <div className={s.observatory}>
        <section className={s.observatory__map}>
          <header className={s.observatory__mapHead}>
            <div className={s.observatory__mapTitle}>
              <span className={s.observatory__mapEyebrow}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--at-fg-faint)' }} />
                NEXUS · LOADING
              </span>
              <span
                className={s.observatory__mapName}
                style={{
                  background: 'var(--at-line)',
                  color: 'transparent',
                  borderRadius: 8,
                  inlineSize: '60%',
                }}
              >
                شبکهٔ صرافی‌ها
              </span>
            </div>
          </header>
          <div className={s.observatory__mapChart}>
            <div
              className={s.mapConstellation}
              style={{ background: 'var(--at-bg-deep)', borderRadius: '50%', opacity: 0.5 }}
            />
            <div className={s.mapLegend} style={{ gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={s.mapLegend__row}
                  style={{ background: 'var(--at-bg-deep)', opacity: 0.5 }}
                >
                  <span className={s.mapLegend__idx}>0{i + 1}</span>
                  <div className={s.mapLegend__core}>
                    <span
                      className={s.mapLegend__name}
                      style={{ background: 'var(--at-line)', color: 'transparent', borderRadius: 4, inlineSize: '70%' }}
                    >
                      .
                    </span>
                    <span className={s.mapLegend__bar}>
                      <span
                        className={s.mapLegend__barFill}
                        style={{ ['--legend-pct' as string]: `${30 + i * 15}%` }}
                      />
                    </span>
                  </div>
                  <span
                    className={s.mapLegend__val}
                    style={{ background: 'var(--at-line)', color: 'transparent', borderRadius: 4, inlineSize: 30 }}
                  >
                    .
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className={s.observatory__stats}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={s.observatory__bigNum} style={{ opacity: 0.5 }}>
              <span
                className={s.observatory__bigNumCap}
                style={{ background: 'var(--at-line)', color: 'transparent', borderRadius: 4, inlineSize: 90, blockSize: 10 }}
              >
                .
              </span>
              <span
                className={s.observatory__bigNumVal}
                style={{ background: 'var(--at-line)', color: 'transparent', borderRadius: 8, inlineSize: 180, blockSize: 38 }}
              >
                .
              </span>
            </div>
          ))}
        </aside>
      </div>

      {/* Strata skeleton */}
      <div className={s.strata} style={{ opacity: 0.5 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={s.strata__cell}>
            <span
              className={s.strata__eyebrow}
              style={{ background: 'var(--at-line)', color: 'transparent', borderRadius: 4, inlineSize: 80, blockSize: 10 }}
            >
              .
            </span>
            <span
              className={s.strata__num}
              style={{ background: 'var(--at-line)', color: 'transparent', borderRadius: 8, inlineSize: 60, blockSize: 30 }}
            >
              .
            </span>
            <span className={s.strata__bar}>
              <span
                className={s.strata__barFill}
                style={{ ['--strata-pct' as string]: `${20 + i * 18}%` }}
              />
            </span>
          </div>
        ))}
      </div>

      {/* Bay skeleton */}
      <div className={s.bay}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 'var(--ds-space-4)',
              background: 'var(--at-surface)',
              border: '1px solid var(--at-line)',
              borderRadius: 'var(--nx-radius-lg)',
              minBlockSize: 280,
              opacity: 0.5,
            }}
          >
            <div
              style={{
                background: 'var(--at-line)',
                borderRadius: 4,
                inlineSize: 100,
                blockSize: 12,
                marginBlockEnd: 16,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }).map((__, j) => (
                <div
                  key={j}
                  style={{
                    background: 'var(--at-bg-deep)',
                    borderRadius: 10,
                    blockSize: 44,
                    border: '1px solid var(--at-line)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

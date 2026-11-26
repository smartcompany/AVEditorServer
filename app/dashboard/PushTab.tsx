"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ui } from "./ui";

type Locale = "en" | "ko" | "ja" | "zh";
type LocaleMap = Record<Locale, string>;

type Campaign = {
  id: string;
  target: string;
  titles: LocaleMap;
  bodies: LocaleMap;
  status: string;
  send_at: string | null;
  sent_at: string | null;
  success_count: number;
  failure_count: number;
  error_message: string | null;
  created_at: string;
};

const LOCALES: Locale[] = ["en", "ko", "ja", "zh"];

function emptyLocale(): LocaleMap {
  return { en: "", ko: "", ja: "", zh: "" };
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PushTab() {
  const [titles, setTitles] = useState<LocaleMap>(emptyLocale);
  const [bodies, setBodies] = useState<LocaleMap>(emptyLocale);
  const [locale, setLocale] = useState<Locale>("ko");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadCampaigns = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/push/campaigns");
      const json = await res.json();
      if (!res.ok) {
        setStatus(`목록 실패: ${json.message || json.error || res.status}`);
        return;
      }
      setCampaigns((json.campaigns as Campaign[]) ?? []);
    } catch (e) {
      setStatus(`목록 실패: ${e}`);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const applyLocaleTranslation = async () => {
    const from = locale;
    const targets = LOCALES.filter((l) => l !== from);
    const sources = [titles[from].trim(), bodies[from].trim()];
    if (sources.every((s) => !s)) {
      setStatus(
        `${from.toUpperCase()} 제목/본문이 비어 있습니다. 먼저 작성한 뒤 로컬라이징을 눌러 주세요.`,
      );
      return;
    }
    setTranslating(true);
    setStatus(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: targets, texts: sources }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`번역 실패: ${json.message || json.error || res.status}`);
        return;
      }
      const translations = json.translations as Partial<
        Record<Locale, string[]>
      >;
      setTitles((prev) => {
        const next = { ...prev };
        for (const lang of targets) {
          const rows = translations[lang] ?? [];
          if (sources[0]) next[lang] = rows[0] ?? next[lang];
        }
        return next;
      });
      setBodies((prev) => {
        const next = { ...prev };
        for (const lang of targets) {
          const rows = translations[lang] ?? [];
          if (sources[1]) next[lang] = rows[1] ?? next[lang];
        }
        return next;
      });
      setStatus(
        `${from.toUpperCase()} → ${targets
          .map((t) => t.toUpperCase())
          .join(" / ")} 번역 적용됨`,
      );
    } catch (e) {
      setStatus(`번역 실패: ${e}`);
    } finally {
      setTranslating(false);
    }
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/push/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles, bodies }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`실패: ${json.message || json.error || res.status}`);
        return;
      }
      const result = json.result as
        | { success?: number; failure?: number }
        | undefined;
      setStatus(
        `전송 완료 · 성공 ${result?.success ?? 0} / 실패 ${result?.failure ?? 0}`,
      );
      await loadCampaigns();
    } catch (e) {
      setStatus(`실패: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={ui.tabHeader}>
        <div>
          <h2 style={ui.h1}>원격 푸시</h2>
          <p style={ui.sub}>
            새 콘텐츠(전환·텍스트 등) 알림. 앱에서 「새 콘텐츠」를 켠 사용자에게만
            전송됩니다. 한글 작성 후 로컬라이징 → 지금 보내기.
          </p>
        </div>
        <div style={ui.actions}>
          <button
            type="button"
            style={ui.btnGhost}
            disabled={translating || busy}
            onClick={() => void applyLocaleTranslation()}
          >
            {translating ? "번역 중…" : "로컬라이징"}
          </button>
        </div>
      </div>

      {status && <div style={ui.status}>{status}</div>}

      <div style={styles.localeTabs}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            style={{
              ...styles.localeTab,
              ...(locale === l ? styles.localeTabActive : {}),
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <label style={styles.label}>제목 ({locale.toUpperCase()})</label>
      <input
        style={ui.input}
        value={titles[locale]}
        onChange={(e) =>
          setTitles((prev) => ({ ...prev, [locale]: e.target.value }))
        }
        placeholder="예: 새 전환 효과가 추가됐어요"
      />

      <label style={styles.label}>본문 ({locale.toUpperCase()})</label>
      <textarea
        style={{ ...ui.input, minHeight: 88, resize: "vertical" }}
        value={bodies[locale]}
        onChange={(e) =>
          setBodies((prev) => ({ ...prev, [locale]: e.target.value }))
        }
        placeholder="예: 지금 EasyClip에서 새 스타일을 확인해 보세요."
      />

      <div style={{ ...ui.actions, marginTop: 12 }}>
        <button
          type="button"
          style={ui.btnPrimary}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "전송 중…" : "지금 보내기"}
        </button>
        <button
          type="button"
          style={ui.btnGhost}
          disabled={busy}
          onClick={() => {
            setTitles(emptyLocale());
            setBodies(emptyLocale());
            setStatus(null);
          }}
        >
          초기화
        </button>
      </div>

      <h3 style={ui.h3}>최근 캠페인</h3>
      {loadingList ? (
        <p style={ui.muted}>불러오는 중…</p>
      ) : campaigns.length === 0 ? (
        <p style={ui.muted}>아직 캠페인이 없습니다.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>제목(KO)</th>
                <th style={styles.th}>전송</th>
                <th style={styles.th}>성공/실패</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td style={styles.td}>{c.status}</td>
                  <td style={styles.td}>
                    {c.titles.ko || c.titles.en || "—"}
                    {c.error_message ? (
                      <div style={styles.err}>{c.error_message}</div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    {c.sent_at
                      ? toLocalInputValue(c.sent_at)
                      : "—"}
                  </td>
                  <td style={styles.td}>
                    {c.success_count}/{c.failure_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  localeTabs: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  localeTab: {
    background: "transparent",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#8b93a7",
    padding: "6px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  localeTabActive: {
    color: "#0b0d12",
    background: "#ff6b6b",
    borderColor: "#ff6b6b",
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "#8b93a7",
    margin: "10px 0 6px",
  },
  tableWrap: {
    overflow: "auto",
    border: "1px solid #2a3142",
    borderRadius: 12,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    color: "#8b93a7",
    borderBottom: "1px solid #2a3142",
    background: "#151923",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #1e2433",
    color: "#f4f6fb",
    verticalAlign: "top",
  },
  err: { color: "#ff8a8a", fontSize: 11, marginTop: 4 },
};

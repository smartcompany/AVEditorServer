"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ui } from "./ui";

type TotalRow = { event: string; events: number; installs: number };
type DailyRow = { day: string; event: string; events: number; installs: number };
type TopRow = { item_id: string; premium: boolean; events: number; installs: number };
type Funnel = { event: string; label: string }[];

type AnalyticsData = {
  days: number;
  platform: string | null;
  funnel: Funnel;
  totals: TotalRow[];
  daily: DailyRow[];
  topTransitions: TopRow[];
  topText: TopRow[];
};

type Props = {
  mode: "revenue" | "funnel";
  secret: string;
};

const RANGES = [7, 30, 90] as const;

function pct(part: number, whole: number): string {
  if (!whole) return "–";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div style={{ background: "#0b0d12", borderRadius: 6, height: 10, width: "100%" }}>
      <div style={{ width: `${width}%`, height: "100%", borderRadius: 6, background: color }} />
    </div>
  );
}

export default function AnalyticsTab({ mode, secret }: Props) {
  const [days, setDays] = useState<number>(30);
  const [platform, setPlatform] = useState<string>("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<{ code: string; message?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ days: String(days) });
      if (platform) qs.set("platform", platform);
      const res = await fetch(`/api/analytics?${qs}`, {
        cache: "no-store",
        headers: secret ? { "x-dashboard-secret": secret } : {},
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ code: json.error ?? String(res.status), message: json.message });
        setData(null);
        return;
      }
      setData(json as AnalyticsData);
    } catch (e) {
      setError({ code: "network", message: String(e) });
    } finally {
      setLoading(false);
    }
  }, [days, platform, secret]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const map = new Map<string, TotalRow>();
    for (const row of data?.totals ?? []) map.set(row.event, row);
    return map;
  }, [data]);
  const ev = (name: string) => Number(totals.get(name)?.events ?? 0);
  const inst = (name: string) => Number(totals.get(name)?.installs ?? 0);

  const dailyBy = useMemo(() => {
    const byDay = new Map<string, Map<string, DailyRow>>();
    for (const row of data?.daily ?? []) {
      const day = String(row.day).slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Map());
      byDay.get(day)!.set(row.event, row);
    }
    return [...byDay.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [data]);

  const header = (
    <div style={ui.tabHeader}>
      <div>
        <h1 style={ui.h1}>{mode === "revenue" ? "수익 (구독 · 광고)" : "사용자 흐름"}</h1>
        <p style={ui.sub}>
          최근 {days}일 · {platform || "전체 플랫폼"} · 디버그 빌드 이벤트는 제외됨
        </p>
      </div>
      <div style={ui.actions}>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setDays(r)}
            style={days === r ? ui.btnPrimary : ui.btnGhost}
          >
            {r}일
          </button>
        ))}
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={ui.input}>
          <option value="">전체</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
        </select>
        <button type="button" onClick={() => void load()} style={ui.btnGhost}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>
    </div>
  );

  if (error) {
    return (
      <div>
        {header}
        <div style={ui.panel}>
          {error.code === "schema_missing" ? (
            <>
              <h3 style={{ ...ui.h3, marginTop: 0 }}>집계 테이블이 아직 없습니다</h3>
              <p style={ui.muted}>
                Supabase → SQL Editor 에서 <code>server/supabase/aveditor_analytics.sql</code> 내용을
                한 번 실행하면 <code>aveditor_events</code> 테이블과 집계 함수가 만들어집니다.
              </p>
            </>
          ) : error.code === "unauthorized" ? (
            <p style={ui.muted}>오른쪽 위에 DASHBOARD_SECRET 을 입력해 주세요.</p>
          ) : (
            <p style={ui.muted}>
              불러오기 실패: {error.code} {error.message ?? ""}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {header}
        <p style={ui.muted}>불러오는 중…</p>
      </div>
    );
  }

  if (mode === "revenue") {
    const sheet = ev("premium_sheet_shown");
    const choicePro = ev("premium_choice_pro");
    const choiceAd = ev("premium_choice_ad");
    const choiceStrip = ev("premium_choice_strip");
    const paywall = ev("paywall_open");
    const purchases = ev("purchase_success");
    const adOk = ev("ad_unlock_success");
    const adFail = ev("ad_unlock_failed");
    const choiceMax = Math.max(choicePro, choiceAd, choiceStrip, 1);

    return (
      <div>
        {header}
        <div style={ui.cards}>
          <Card label="구독 성공" value={purchases} sub={`${inst("purchase_success")}명 · 페이월 대비 ${pct(purchases, paywall)}`} />
          <Card label="광고로 잠금 해제" value={adOk} sub={`${inst("ad_unlock_success")}명 · 실패/스킵 ${adFail}`} />
          <Card label="Pro 선택 화면 노출" value={sheet} sub={`${inst("premium_sheet_shown")}명`} />
          <Card label="페이월 열림" value={paywall} sub={`${inst("paywall_open")}명`} />
          <Card label="구매 취소 / 실패" value={ev("purchase_cancelled") + ev("purchase_failed")} sub={`취소 ${ev("purchase_cancelled")} · 실패 ${ev("purchase_failed")}`} />
          <Card label="구매 복원" value={ev("restore_success")} sub="restore_success" />
        </div>

        <div style={ui.panel}>
          <h3 style={{ ...ui.h3, marginTop: 0 }}>Pro 효과가 든 영상을 내보낼 때의 선택</h3>
          {[
            ["Pro로 저장 (구독 화면으로)", choicePro, "#ff6b6b"],
            ["광고 보고 이번만 저장", choiceAd, "#4cc9f0"],
            ["Pro 효과 빼고 저장", choiceStrip, "#8b93a7"],
          ].map(([label, value, color]) => (
            <div key={label as string} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{label as string}</span>
                <span>
                  {value as number}회 · {pct(value as number, sheet)}
                </span>
              </div>
              <Bar value={value as number} max={choiceMax} color={color as string} />
            </div>
          ))}
          <p style={ui.muted}>
            빼고 저장이 많으면 Pro 효과의 매력이나 광고 부담을, 광고가 압도적이면 구독 가격·혜택을
            점검할 신호입니다.
          </p>
        </div>

        <div style={{ ...ui.panel, marginTop: 16 }}>
          <h3 style={{ ...ui.h3, marginTop: 0 }}>일별</h3>
          <DailyTable
            rows={dailyBy}
            columns={[
              ["premium_sheet_shown", "선택 화면"],
              ["premium_choice_pro", "Pro 선택"],
              ["premium_choice_ad", "광고 선택"],
              ["premium_choice_strip", "빼고 저장"],
              ["ad_unlock_success", "광고 완료"],
              ["paywall_open", "페이월"],
              ["purchase_success", "구독"],
            ]}
          />
        </div>
      </div>
    );
  }

  // funnel
  const steps = data.funnel.map((step) => ({ ...step, installs: inst(step.event) }));
  const base = steps[0]?.installs || Math.max(...steps.map((s) => s.installs), 0);
  const maxStep = Math.max(base, ...steps.map((s) => s.installs), 1);

  return (
    <div>
      {header}
      <div style={ui.cards}>
        <Card label="신규 설치 (첫 실행)" value={inst("first_open")} sub="first_open 기기 수" />
        <Card label="활성 사용자" value={inst("app_open")} sub={`앱 실행 ${ev("app_open")}회`} />
        <Card label="편집 진입" value={inst("editor_open")} sub={`${ev("editor_open")}회`} />
        <Card label="내보내기 완료" value={inst("export_completed")} sub={`${ev("export_completed")}회 · 실패 ${ev("export_failed")}`} />
        <Card label="유튜브 업로드" value={inst("youtube_upload_completed")} sub={`${ev("youtube_upload_completed")}회`} />
      </div>

      <div style={ui.panel}>
        <h3 style={{ ...ui.h3, marginTop: 0 }}>어디까지 썼나 (기기 수 기준)</h3>
        {steps.map((step, index) => (
          <div key={step.event} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>
                {index + 1}. {step.label} <span style={ui.listId}>{step.event}</span>
              </span>
              <span>
                {step.installs}명 · {pct(step.installs, base)}
              </span>
            </div>
            <Bar value={step.installs} max={maxStep} color="#ff6b6b" />
          </div>
        ))}
        <p style={ui.muted}>
          첫 실행 대비 비율입니다. 기간 안에 첫 실행이 없던 기존 사용자도 이후 단계에는 잡히므로
          100%를 넘을 수 있습니다.
        </p>
      </div>

      <div style={{ ...ui.split, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <TopTable title="많이 쓴 전환 효과" rows={data.topTransitions} />
        <TopTable title="많이 쓴 텍스트 효과·템플릿" rows={data.topText} />
      </div>

      <div style={{ ...ui.panel, marginTop: 16 }}>
        <h3 style={{ ...ui.h3, marginTop: 0 }}>일별 (기기 수)</h3>
        <DailyTable
          useInstalls
          rows={dailyBy}
          columns={[
            ["first_open", "신규 설치"],
            ["app_open", "활성"],
            ["editor_open", "편집"],
            ["export_tap", "내보내기 시도"],
            ["export_completed", "내보내기 완료"],
          ]}
        />
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div style={ui.card}>
      <div style={ui.cardLabel}>{label}</div>
      <div style={ui.cardValue}>{value.toLocaleString()}</div>
      {sub && <div style={ui.cardSub}>{sub}</div>}
    </div>
  );
}

function DailyTable({
  rows,
  columns,
  useInstalls = false,
}: {
  rows: [string, Map<string, DailyRow>][];
  columns: [string, string][];
  useInstalls?: boolean;
}) {
  if (rows.length === 0) return <p style={ui.muted}>아직 데이터가 없습니다.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={ui.table}>
        <thead>
          <tr>
            <th style={ui.th}>날짜(UTC)</th>
            {columns.map(([, label]) => (
              <th key={label} style={ui.th}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([day, byEvent]) => (
            <tr key={day}>
              <td style={ui.td}>{day}</td>
              {columns.map(([event]) => {
                const row = byEvent.get(event);
                const value = row ? Number(useInstalls ? row.installs : row.events) : 0;
                return (
                  <td key={event} style={{ ...ui.td, color: value ? "#f4f6fb" : "#4b5366" }}>
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopTable({ title, rows }: { title: string; rows: TopRow[] }) {
  return (
    <div style={ui.panel}>
      <h3 style={{ ...ui.h3, marginTop: 0 }}>{title}</h3>
      {rows.length === 0 ? (
        <p style={ui.muted}>아직 데이터가 없습니다.</p>
      ) : (
        <table style={ui.table}>
          <thead>
            <tr>
              <th style={ui.th}>id</th>
              <th style={ui.th}>적용</th>
              <th style={ui.th}>기기</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.item_id}-${row.premium}`}>
                <td style={ui.td}>
                  {row.item_id}
                  {row.premium ? <span style={ui.proBadge}>PRO</span> : null}
                </td>
                <td style={ui.td}>{row.events}</td>
                <td style={ui.td}>{row.installs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

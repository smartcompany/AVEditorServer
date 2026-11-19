"use client";

import { useState, type CSSProperties } from "react";
import { ui } from "./ui";

type AccountInfo = {
  firebaseUid: string | null;
  planTier: string;
  balance: number;
};

type SubRow = {
  id: string;
  firebase_uid: string;
  platform: string;
  product_id: string;
  tier: string;
  store_identity: string;
  original_transaction_id: string | null;
  status: string;
  expires_at: string | null;
  environment: string | null;
  updated_at: string;
};

export default function SubscriptionsTab() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"uid" | "email" | "tx" | "token">("uid");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [rows, setRows] = useState<SubRow[]>([]);
  const [overrideTier, setOverrideTier] = useState("plus");

  const search = async () => {
    const q = query.trim();
    if (!q) {
      setStatus("조회 값을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const params = new URLSearchParams();
      if (mode === "uid") params.set("uid", q);
      if (mode === "email") params.set("email", q);
      if (mode === "tx") params.set("tx", q);
      if (mode === "token") params.set("token", q);
      const res = await fetch(`/api/subscriptions/admin?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`조회 실패: ${json.error || res.status}`);
        return;
      }
      setAccount(json.account ?? null);
      setRows((json.subscriptions as SubRow[]) ?? []);
      setStatus(
        `조회 완료 · 구독 ${(json.subscriptions as SubRow[] | undefined)?.length ?? 0}건`,
      );
    } catch (e) {
      setStatus(`조회 실패: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const override = async () => {
    const uid = account?.firebaseUid || (mode === "uid" ? query.trim() : "");
    if (!uid) {
      setStatus("override 하려면 Firebase UID가 필요합니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseUid: uid, planTier: overrideTier }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Override 실패: ${json.error || res.status}`);
        return;
      }
      setStatus(`plan_tier → ${json.planTier} (지원용 override)`);
      setAccount((prev) =>
        prev
          ? { ...prev, planTier: json.planTier, balance: json.balance ?? prev.balance }
          : {
              firebaseUid: uid,
              planTier: json.planTier,
              balance: json.balance ?? 0,
            },
      );
    } catch (e) {
      setStatus(`Override 실패: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const resync = async () => {
    const uid = account?.firebaseUid || (mode === "uid" ? query.trim() : "");
    if (!uid) {
      setStatus("resync 하려면 Firebase UID가 필요합니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseUid: uid, resync: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Resync 실패: ${json.error || res.status}`);
        return;
      }
      setStatus(`스토어 구독 기준으로 plan_tier → ${json.planTier}`);
      setAccount((prev) =>
        prev
          ? { ...prev, planTier: json.planTier, balance: json.balance ?? prev.balance }
          : {
              firebaseUid: uid,
              planTier: json.planTier,
              balance: json.balance ?? 0,
            },
      );
    } catch (e) {
      setStatus(`Resync 실패: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={ui.tabHeader}>
        <div>
          <h2 style={ui.h1}>구독</h2>
          <p style={ui.sub}>
            Apple / Google 검증 결과와 credit account plan_tier를 조회합니다.
            결제는 앱 스토어에서만 이뤄집니다.
          </p>
        </div>
      </div>

      {status && <div style={ui.status}>{status}</div>}

      <div style={styles.card}>
        <div style={styles.row}>
          <select
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as "uid" | "email" | "tx" | "token")
            }
            style={styles.select}
          >
            <option value="uid">Firebase UID</option>
            <option value="email">Email</option>
            <option value="tx">Apple originalTransactionId</option>
            <option value="token">Android purchaseToken</option>
          </select>
          <input
            style={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="조회 값"
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
          />
          <button
            type="button"
            style={ui.btnPrimary}
            disabled={loading}
            onClick={() => void search()}
          >
            {loading ? "…" : "조회"}
          </button>
        </div>

        {account && (
          <div style={styles.account}>
            <div>
              <strong>Account</strong> · {account.firebaseUid || "—"}
            </div>
            <div>
              plan_tier: <code>{account.planTier}</code> · balance{" "}
              {account.balance}
            </div>
          </div>
        )}

        <div style={styles.row}>
          <select
            value={overrideTier}
            onChange={(e) => setOverrideTier(e.target.value)}
            style={styles.select}
          >
            <option value="free">free</option>
            <option value="plus">plus</option>
            <option value="pro">pro</option>
            <option value="studio">studio</option>
          </select>
          <button
            type="button"
            style={ui.btnGhost}
            disabled={loading}
            onClick={() => void override()}
          >
            지원 override
          </button>
          <button
            type="button"
            style={ui.btnGhost}
            disabled={loading}
            onClick={() => void resync()}
          >
            스토어 기준 resync
          </button>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["platform", "product", "tier", "status", "expires", "env", "uid"].map(
                (h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.empty}>
                  결과 없음
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>{r.platform}</td>
                  <td style={styles.td}>
                    <code>{r.product_id}</code>
                  </td>
                  <td style={styles.td}>{r.tier}</td>
                  <td style={styles.td}>{r.status}</td>
                  <td style={styles.td}>
                    {r.expires_at
                      ? new Date(r.expires_at).toLocaleString()
                      : "—"}
                  </td>
                  <td style={styles.td}>{r.environment || "—"}</td>
                  <td style={styles.td}>
                    <code style={{ fontSize: 11 }}>{r.firebase_uid}</code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 12,
  },
  select: {
    background: "#0b0d12",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#f4f6fb",
    padding: "8px 10px",
  },
  input: {
    flex: "1 1 240px",
    background: "#0b0d12",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#f4f6fb",
    padding: "8px 10px",
  },
  account: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 12,
    color: "#d7dde8",
    fontSize: 13,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #2a3142",
    borderRadius: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    color: "#f4f6fb",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #2a3142",
    color: "#8b93a7",
    fontWeight: 600,
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #1c2230",
    verticalAlign: "top",
  },
  empty: {
    textAlign: "center",
    padding: 24,
    color: "#8b93a7",
  },
};


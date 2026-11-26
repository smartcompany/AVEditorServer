"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type SessionState = {
  authenticated: boolean;
  email: string | null;
  allowedEmail: string;
  googleClientConfigured: boolean;
};

type Props = {
  children: ReactNode;
  googleClientId: string | null;
};

const LOGIN_ERROR_LABELS: Record<string, string> = {
  missing_credential: "Google 로그인 결과가 없습니다. 다시 시도해 주세요.",
  email_not_allowed: "허용된 Google 계정이 아닙니다.",
  email_unverified: "이메일 인증이 안 된 Google 계정입니다.",
  invalid_id_token: "Google 토큰 검증 실패. 클라이언트 ID를 확인하세요.",
  google_client_id_missing: "GOOGLE_CLIENT_ID가 서버에 없습니다.",
  session_secret_missing: "DASHBOARD_SECRET이 서버에 없습니다.",
  callback_failed: "Google 로그인 처리 중 서버 오류가 났습니다. 다시 시도해 주세요.",
};

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function DashboardAuthGate({
  children,
  googleClientId,
}: Props) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectUri = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/dashboard/google/callback`;
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/dashboard/session", {
      cache: "no-store",
      credentials: "include",
    });
    const json = (await res.json()) as SessionState;
    setSession(json);
    return json;
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("login_error");
    if (code) {
      setError(LOGIN_ERROR_LABELS[code] ?? `로그인 실패: ${code}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("login_error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() =>
      setSession({
        authenticated: false,
        email: null,
        allowedEmail: "gunnylove@gmail.com",
        googleClientConfigured: Boolean(googleClientId),
      }),
    );
  }, [refresh, googleClientId]);

  const startGoogleLogin = () => {
    if (!googleClientId || !redirectUri || busy) return;
    setBusy(true);
    setError(null);
    const nonce = randomNonce();
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "id_token",
      response_mode: "form_post",
      scope: "openid email profile",
      nonce,
      prompt: "select_account",
    });
    window.location.assign(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  };

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/dashboard/session", {
        method: "DELETE",
        credentials: "include",
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>확인 중…</p>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <p style={styles.eyebrow}>ClipGo · Dashboard</p>
          <h1 style={styles.h1}>관리자 로그인</h1>
          <p style={styles.body}>
            Google 계정 <strong>{session.allowedEmail}</strong> 으로만 접근할 수
            있습니다.
          </p>
          {!googleClientId ? (
            <p style={styles.warn}>
              `GOOGLE_CLIENT_ID` 환경 변수가 필요합니다.
            </p>
          ) : (
            <button
              type="button"
              style={styles.googleBtn}
              disabled={busy}
              onClick={startGoogleLogin}
            >
              Google로 로그인
            </button>
          )}
          {error && <p style={styles.err}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.topBar}>
        <span style={styles.muted}>{session.email}</span>
        <button
          type="button"
          style={styles.logout}
          disabled={busy}
          onClick={() => void logout()}
        >
          로그아웃
        </button>
      </div>
      {children}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  center: {
    minHeight: "70vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  card: {
    width: "min(420px, 100%)",
    background: "#151923",
    border: "1px solid #2a3142",
    borderRadius: 16,
    padding: 28,
  },
  eyebrow: {
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#8b93a7",
    fontSize: 12,
    margin: 0,
  },
  h1: { fontSize: 24, margin: "8px 0 10px", color: "#f4f6fb" },
  body: { color: "#b7bfcf", fontSize: 14, lineHeight: 1.5, margin: "0 0 20px" },
  googleBtn: {
    width: "100%",
    background: "#fff",
    color: "#1f1f1f",
    border: "none",
    borderRadius: 999,
    padding: "12px 16px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  muted: { color: "#8b93a7", fontSize: 13 },
  warn: {
    color: "#ffb86b",
    fontSize: 13,
    background: "#2a2118",
    borderRadius: 8,
    padding: "10px 12px",
  },
  err: { color: "#ff8a8a", fontSize: 13, marginTop: 12 },
  topBar: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "12px 20px 0",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },
  logout: {
    background: "transparent",
    border: "1px solid #2a3142",
    color: "#f4f6fb",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 13,
  },
};

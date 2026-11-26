"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

type SessionState = {
  authenticated: boolean;
  email: string | null;
  allowedEmail: string;
  googleClientConfigured: boolean;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

type Props = {
  children: ReactNode;
  googleClientId: string | null;
};

const LOGIN_ERROR_LABELS: Record<string, string> = {
  missing_credential: "Google 로그인 결과가 없습니다. 다시 시도해 주세요.",
  email_not_allowed: "허용된 Google 계정이 아닙니다.",
  email_unverified: "이메일 인증이 안 된 Google 계정입니다.",
  invalid_id_token: "Google 토큰 검증 실패. 클라이언트 ID / 리디렉션 URI를 확인하세요.",
  google_client_id_missing: "GOOGLE_CLIENT_ID가 서버에 없습니다.",
  session_secret_missing: "DASHBOARD_SECRET이 서버에 없습니다.",
};

export default function DashboardAuthGate({
  children,
  googleClientId,
}: Props) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);
  const gsiReadyRef = useRef(false);

  const loginUri = useMemo(() => {
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

  useEffect(() => {
    if (!session || session.authenticated) return;
    if (!googleClientId || !buttonRef.current || !loginUri) return;
    if (gsiReadyRef.current) return;

    let cancelled = false;

    const mount = () => {
      if (cancelled || !window.google || !buttonRef.current) return;
      if (gsiReadyRef.current) return;
      gsiReadyRef.current = true;
      buttonRef.current.innerHTML = "";
      // Redirect UX avoids popup/COOP issues — Google POSTs credential to login_uri.
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        ux_mode: "redirect",
        login_uri: loginUri,
        use_fedcm_for_prompt: false,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 280,
      });
    };

    if (window.google?.accounts?.id) {
      mount();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-gsi="1"]',
    );
    if (existing) {
      if (existing.dataset.loaded === "1") mount();
      else existing.addEventListener("load", mount);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", mount);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.googleGsi = "1";
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      mount();
    });
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [session, googleClientId, loginUri]);

  const loginWithSecret = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ secret: secretInput }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "invalid_secret"
            ? "비밀번호가 올바르지 않습니다."
            : `로그인 실패: ${json.error || res.status}`,
        );
        return;
      }
      await refresh();
    } catch (err) {
      setError(`로그인 실패: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/dashboard/session", {
        method: "DELETE",
        credentials: "include",
      });
      gsiReadyRef.current = false;
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
            <div ref={buttonRef} style={styles.btnWrap} />
          )}

          <div style={styles.divider}>또는</div>

          <form onSubmit={loginWithSecret}>
            <label style={styles.label}>DASHBOARD_SECRET</label>
            <input
              type="password"
              autoComplete="current-password"
              value={secretInput}
              onChange={(ev) => setSecretInput(ev.target.value)}
              style={styles.input}
              placeholder="서버 환경변수와 동일한 값"
            />
            <button type="submit" style={styles.primaryBtn} disabled={busy}>
              {busy ? "확인 중…" : "비밀번호로 입장"}
            </button>
          </form>

          {error && <p style={styles.err}>{error}</p>}
          <p style={styles.hint}>
            Google 리다이렉트 URI에 추가:
            <br />
            <code style={styles.code}>
              https://aveditorserver.vercel.app/api/dashboard/google/callback
            </code>
          </p>
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
  btnWrap: { display: "flex", justifyContent: "center", minHeight: 44 },
  divider: {
    textAlign: "center",
    color: "#8b93a7",
    fontSize: 12,
    margin: "18px 0 12px",
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "#8b93a7",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0b0d12",
    border: "1px solid #2a3142",
    borderRadius: 8,
    color: "#f4f6fb",
    padding: "10px 12px",
    marginBottom: 10,
  },
  primaryBtn: {
    width: "100%",
    background: "#ff6b6b",
    color: "#0b0d12",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
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
  hint: {
    color: "#8b93a7",
    fontSize: 11,
    lineHeight: 1.45,
    marginTop: 16,
  },
  code: {
    fontSize: 10,
    color: "#b7bfcf",
    wordBreak: "break-all",
  },
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

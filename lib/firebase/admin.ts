import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";

let app: App | null = null;
let auth: Auth | null = null;

function loadServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set (JSON string of the service account).",
    );
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON.");
  }
}

export function getFirebaseAdmin(): { app: App; auth: Auth } {
  if (app && auth) return { app, auth };
  if (getApps().length > 0) {
    app = getApps()[0]!;
    auth = getAuth(app);
    return { app, auth };
  }
  const serviceAccount = loadServiceAccount();
  app = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
  auth = getAuth(app);
  return { app, auth };
}

export async function verifyFirebaseIdToken(idToken: string) {
  const { auth: firebaseAuth } = getFirebaseAdmin();
  return firebaseAuth.verifyIdToken(idToken);
}

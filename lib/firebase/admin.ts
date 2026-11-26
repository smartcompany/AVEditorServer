import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Messaging, getMessaging } from "firebase-admin/messaging";

let app: App | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;

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

export function getFirebaseAdmin(): {
  app: App;
  auth: Auth;
  messaging: Messaging;
} {
  if (app && auth && messaging) return { app, auth, messaging };
  if (getApps().length > 0) {
    app = getApps()[0]!;
    auth = getAuth(app);
    messaging = getMessaging(app);
    return { app, auth, messaging };
  }
  const serviceAccount = loadServiceAccount();
  app = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
  auth = getAuth(app);
  messaging = getMessaging(app);
  return { app, auth, messaging };
}

export async function verifyFirebaseIdToken(idToken: string) {
  const { auth: firebaseAuth } = getFirebaseAdmin();
  return firebaseAuth.verifyIdToken(idToken);
}

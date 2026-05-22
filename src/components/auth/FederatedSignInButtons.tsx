"use client";

import { useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { auth } from "@/infrastructure/firebase/auth";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { AppleIcon } from "./AppleIcon";

interface Props {
  context?: "signin" | "signup";
  disabled?: boolean;
}

/**
 * Google + Apple sign-in buttons.
 *
 * Flow: signInWithPopup → Firebase session created → FirebaseAuthListener
 * picks up onIdTokenChanged → calls GET /me → routes by roles[].
 *
 * No custom-token exchange needed — Firebase handles the session directly.
 * When the backend ships POST /auth/federated/* for user creation/linking,
 * that can be wired in here without changing the routing logic.
 */
export function FederatedSignInButtons({ context = "signin", disabled }: Props) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  async function handleFederated(provider: "google" | "apple") {
    if (busy) return;
    setBusy(provider);

    const label = provider === "google" ? "Google" : "Apple";
    const action = context === "signin" ? "sign-in" : "sign-up";

    try {
      const authProvider =
        provider === "google"
          ? (() => {
              const gp = new GoogleAuthProvider();
              gp.addScope("email");
              gp.addScope("profile");
              return gp;
            })()
          : (() => {
              const ap = new OAuthProvider("apple.com");
              ap.addScope("email");
              ap.addScope("name");
              return ap;
            })();

      // signInWithPopup completes the Firebase session. FirebaseAuthListener
      // (onIdTokenChanged) calls GET /me and dispatches setUser → router.push.
      await signInWithPopup(auth, authProvider);

    } catch (err) {
      const code = (err as { code?: string })?.code ?? "unknown";
      // Log every error so we can diagnose the exact Firebase error code.
      console.error(`[FederatedSignIn] ${provider} error:`, code, err);

      // Don't show a toast when the user simply closed the popup themselves.
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }

      let message = "Something went wrong. Please use email + password instead.";
      if (code === "auth/operation-not-allowed") {
        message = `${label} sign-in is not enabled in Firebase Console. Enable it under Authentication → Sign-in method → ${label}.`;
      } else if (code === "auth/account-exists-with-different-credential") {
        message = "An account with this email uses a different sign-in method. Sign in that way first.";
      } else if (code === "auth/network-request-failed") {
        message = "Network error. Check your connection and try again.";
      } else if (code === "auth/popup-blocked") {
        message = "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
      } else if (code === "auth/unauthorized-domain") {
        message = "This domain isn't authorized for sign-in. Add it under Firebase → Authentication → Settings → Authorized domains.";
      } else if (code === "auth/invalid-credential" && provider === "apple") {
        message = "Apple rejected the sign-in. The Services ID, Team ID, Key ID, or private key in Firebase Console may not match the Apple Developer registration.";
      }

      dispatch(
        pushToast({
          tone: "warning",
          title: `${label} ${action} failed`,
          message,
        }),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="fed-row">
        <button
          type="button"
          className="fed-btn"
          disabled={disabled || busy !== null}
          onClick={() => handleFederated("google")}
          aria-label="Continue with Google"
        >
          <GoogleIcon size={18} />
          {busy === "google" ? "Signing in…" : "Google"}
        </button>
        <button
          type="button"
          className="fed-btn"
          disabled={disabled || busy !== null}
          onClick={() => handleFederated("apple")}
          aria-label="Continue with Apple"
        >
          <AppleIcon size={18} />
          {busy === "apple" ? "Signing in…" : "Apple"}
        </button>
      </div>
      <div className="fed-divider">OR CONTINUE WITH EMAIL</div>
    </>
  );
}

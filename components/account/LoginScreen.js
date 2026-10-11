"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/shell/AppShell";
import { getSupabase, accountsEnabled } from "@/lib/supabase/client";
import { useTripo } from "@/lib/tripo/store";
import { useLang } from "@/lib/tripo/hooks";
import { L } from "@/lib/tripo/i18n";

// Turns Supabase's error messages into plain language.
function friendly(error) {
  const m = String((error && error.message) || "").toLowerCase();
  const code = (error && error.code) || "";
  if (code === "invalid_credentials" || m.includes("invalid login")) return L("That email and password don't match. Check them and try again.", "ইমেইল ও পাসওয়ার্ড মিলছে না। দেখে আবার চেষ্টা করুন।");
  if (code === "email_not_confirmed" || m.includes("not confirmed")) return L("Please confirm your email first — open the link we sent you.", "আগে ইমেইল নিশ্চিত করুন — আমাদের পাঠানো লিংকটি খুলুন।");
  if (code === "user_already_exists" || m.includes("already registered")) return L("There's already an account with this email. Try signing in.", "এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। সাইন ইন করে দেখুন।");
  if (code === "weak_password" || m.includes("password should")) return L("Please choose a longer password (at least 8 characters).", "আরও বড় পাসওয়ার্ড দিন (অন্তত ৮ অক্ষর)।");
  if (code === "over_email_send_rate_limit" || m.includes("rate limit")) return L("Too many emails were sent just now. Please wait a few minutes and try again.", "এই মুহূর্তে অনেক ইমেইল পাঠানো হয়েছে। কয়েক মিনিট পর আবার চেষ্টা করুন।");
  if (m.includes("invalid") && m.includes("email")) return L("That doesn't look like a valid email address.", "ইমেইল ঠিকানাটি সঠিক মনে হচ্ছে না।");
  if (m.includes("fetch") || m.includes("network")) return L("Couldn't reach the server. Check your internet and try again.", "সার্ভারে পৌঁছানো যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
  return L("Something went wrong. Please try again.", "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।");
}

export default function LoginScreen() {
  useLang();
  const router = useRouter();
  const user = useTripo((s) => s.user);
  const authReady = useTripo((s) => s.authReady);
  const recovery = useTripo((s) => s.recovery);
  const [mode, setMode] = useState("signin"); // signin | signup | forgot | newpass
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [next, setNext] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("mode") === "signup") setMode("signup");
    const n = q.get("next") || "";
    if (/^\/[a-zA-Z0-9/_-]*$/.test(n)) setNext(n);
  }, []);

  useEffect(() => {
    if (recovery) setMode("newpass");
  }, [recovery]);

  // Already signed in (or just finished): move on.
  useEffect(() => {
    if (!user || mode === "newpass" || recovery) return;
    const s = useTripo.getState();
    const id = setTimeout(() => router.replace(next || (s.profile ? "/chat" : "/signup")), 400);
    return () => clearTimeout(id);
  }, [user, mode, recovery, next, router]);

  const submit = async (e) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const origin = window.location.origin;
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === "signup") {
        if (password.length < 8) throw { code: "weak_password" };
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: origin + "/login" } });
        if (error) throw error;
        // Supabase hides whether an address is taken: an existing account comes back with no identities.
        if (data.user && data.user.identities && data.user.identities.length === 0) throw { code: "user_already_exists" };
        if (!data.session) setNotice(L("Almost there! We sent a link to " + email.trim() + ". Open it to confirm your email, then sign in.", "প্রায় হয়ে গেছে! " + email.trim() + " ঠিকানায় একটি লিংক পাঠিয়েছি। সেটি খুলে ইমেইল নিশ্চিত করুন, তারপর সাইন ইন করুন।"));
      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: origin + "/login" });
        if (error) throw error;
        setNotice(L("If there's an account for " + email.trim() + ", a reset link is on its way. Check your inbox.", email.trim() + " ঠিকানায় অ্যাকাউন্ট থাকলে রিসেট লিংক পাঠানো হয়েছে। ইনবক্স দেখুন।"));
      } else if (mode === "newpass") {
        if (password.length < 8) throw { code: "weak_password" };
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        useTripo.setState({ recovery: false });
        setMode("signin");
        setNotice(L("Password changed. You're signed in.", "পাসওয়ার্ড বদলানো হয়েছে। আপনি সাইন ইন অবস্থায় আছেন।"));
      }
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    signin: [L("Welcome back", "আবার স্বাগতম"), L("Sign in to see your trips and chats.", "আপনার ট্রিপ ও চ্যাট দেখতে সাইন ইন করুন।")],
    signup: [L("Create your free account", "ফ্রি অ্যাকাউন্ট খুলুন"), L("Keep your trips, saved places and chats on every device.", "সব ডিভাইসে আপনার ট্রিপ, সেভ করা জায়গা ও চ্যাট রাখুন।")],
    forgot: [L("Reset your password", "পাসওয়ার্ড রিসেট"), L("Enter your email and we'll send you a reset link.", "ইমেইল দিন, আমরা রিসেট লিংক পাঠাব।")],
    newpass: [L("Choose a new password", "নতুন পাসওয়ার্ড দিন"), L("At least 8 characters.", "অন্তত ৮ অক্ষর।")],
  };
  const cta = { signin: L("Sign in", "সাইন ইন"), signup: L("Create account", "অ্যাকাউন্ট খুলুন"), forgot: L("Send reset link", "রিসেট লিংক পাঠান"), newpass: L("Save new password", "নতুন পাসওয়ার্ড সেভ করুন") };
  const switchTo = (m) => { setMode(m); setError(""); setNotice(""); };

  return (
    <main className="auth">
      <Link href="/" className="legal-brand auth-brand"><LogoMark size={14} />Tripo</Link>
      <div className="auth-card">
        {!accountsEnabled ? (
          <>
            <h1>{L("Accounts aren't switched on yet", "অ্যাকাউন্ট এখনো চালু হয়নি")}</h1>
            <p className="auth-sub">{L("You can still use Tripo — your trips are saved in this browser.", "আপনি Tripo ব্যবহার করতে পারেন — আপনার ট্রিপ এই ব্রাউজারে সেভ থাকে।")}</p>
            <Link className="book-cta" href="/chat" style={{ margin: 0 }}>{L("Open Tripo", "Tripo খুলুন")}</Link>
          </>
        ) : user && mode !== "newpass" ? (
          <>
            <h1>{L("You're signed in", "আপনি সাইন ইন করেছেন")}</h1>
            <p className="auth-sub" id="authSignedIn">{user.email}</p>
            {notice && <div className="auth-note ok">{notice}</div>}
            <Link className="book-cta" href="/chat" style={{ margin: 0 }}>{L("Continue to Tripo →", "Tripo-তে যান →")}</Link>
          </>
        ) : (
          <>
            <h1 id="authTitle">{titles[mode][0]}</h1>
            <p className="auth-sub">{titles[mode][1]}</p>
            <form onSubmit={submit} id="authForm" noValidate={false}>
              {mode !== "newpass" && (
                <div className="bf">
                  <label htmlFor="authEmail">{L("Email", "ইমেইল")}</label>
                  <input id="authEmail" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              )}
              {mode !== "forgot" && (
                <div className="bf">
                  <label htmlFor="authPassword">{mode === "newpass" ? L("New password", "নতুন পাসওয়ার্ড") : L("Password", "পাসওয়ার্ড")}</label>
                  <input id="authPassword" type="password" required minLength={mode === "signin" ? 1 : 8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signin" ? "" : L("At least 8 characters", "অন্তত ৮ অক্ষর")} />
                </div>
              )}
              {error && <div className="auth-note err" id="authError" role="alert">{error}</div>}
              {notice && <div className="auth-note ok" id="authNotice" role="status">{notice}</div>}
              <button type="submit" className="book-cta" id="authSubmit" disabled={busy || !authReady} style={{ width: "100%", margin: "6px 0 0" }}>
                {busy ? L("One moment…", "একটু অপেক্ষা করুন…") : cta[mode]}
              </button>
            </form>
            <div className="auth-links">
              {mode === "signin" && (
                <>
                  <button type="button" id="toSignup" onClick={() => switchTo("signup")}>{L("New here? Create an account", "নতুন? অ্যাকাউন্ট খুলুন")}</button>
                  <button type="button" id="toForgot" onClick={() => switchTo("forgot")}>{L("Forgot password?", "পাসওয়ার্ড ভুলে গেছেন?")}</button>
                </>
              )}
              {mode === "signup" && <button type="button" id="toSignin" onClick={() => switchTo("signin")}>{L("Already have an account? Sign in", "অ্যাকাউন্ট আছে? সাইন ইন করুন")}</button>}
              {mode === "forgot" && <button type="button" onClick={() => switchTo("signin")}>{L("← Back to sign in", "← সাইন ইনে ফিরুন")}</button>}
            </div>
            {mode === "signup" && (
              <p className="auth-legal">
                {L("By creating an account you agree to our ", "অ্যাকাউন্ট খুললে আপনি আমাদের ")}
                <Link href="/terms">{L("Terms", "শর্তাবলি")}</Link>{L(" and ", " ও ")}<Link href="/privacy">{L("Privacy Policy", "প্রাইভেসি পলিসি")}</Link>{L(".", " মেনে নিচ্ছেন।")}
              </p>
            )}
          </>
        )}
      </div>
      {!user && <Link href="/chat" className="auth-skip">{L("Continue without an account →", "অ্যাকাউন্ট ছাড়া চালিয়ে যান →")}</Link>}
    </main>
  );
}

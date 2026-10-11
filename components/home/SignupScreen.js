"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { RichText } from "@/components/ui/Scene";
import { useTripo } from "@/lib/tripo/store";
import { useLang } from "@/lib/tripo/hooks";
import { L, getLang } from "@/lib/tripo/i18n";
import { OB_QUESTIONS, OB_REACT } from "@/lib/tripo/content";
import { optLabel } from "@/lib/tripo/items";
import { cityToIata, runtime } from "@/lib/tripo/travel";
import { clean, initials } from "@/lib/tripo/util";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 0;

// Sign-up as a short chat: Tripo asks nine questions and builds the travel profile.
export default function SignupScreen() {
  const lang = useLang();
  const router = useRouter();
  const ready = useTripo((s) => s.ready);
  const [msgs, setMsgs] = useState([]); // {id, role, text|null (typing)}
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(true);
  const [otherMode, setOtherMode] = useState(false);
  const [chosen, setChosen] = useState([]);
  const [text, setText] = useState("");
  const [done, setDone] = useState(null); // {profile, isNew}
  const answers = useRef({});
  const run = useRef(0); // cancels a previous run when "Change my answers" restarts the chat
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const total = OB_QUESTIONS.length;

  const say = async (textToSay, delay, token) => {
    const id = "o" + ++seq;
    setMsgs((m) => [...m, { id, role: "assistant", text: null }]);
    await wait(delay == null ? 550 : delay);
    if (token !== run.current) return false;
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, text: textToSay } : x)));
    return true;
  };

  const ask = async (i, token) => {
    setStep(i);
    setBusy(true);
    setOtherMode(false);
    const q = OB_QUESTIONS[i];
    if (!q) return finish(token);
    if (!(await say(q.q(answers.current), null, token))) return;
    const prev = answers.current[q.id];
    setChosen(q.type === "multi" && Array.isArray(prev) ? prev.slice() : []);
    setText(q.type === "text" && typeof prev === "string" ? prev : "");
    setBusy(false);
  };

  const start = () => {
    const token = ++run.current;
    const p = useTripo.getState().profile;
    answers.current = p ? clean(p) : {};
    setMsgs([]);
    setDone(null);
    ask(0, token);
  };

  useEffect(() => {
    if (ready) start();
    return () => { run.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, done]);

  useEffect(() => {
    if (!busy && inputRef.current) { const id = setTimeout(() => inputRef.current && inputRef.current.focus(), 50); return () => clearTimeout(id); }
  }, [busy, otherMode, step]);

  const answer = async (value, shown) => {
    const token = run.current;
    const q = OB_QUESTIONS[step];
    answers.current[q.id] = value;
    if (q.id === "home") answers.current.homeIata = cityToIata(value) || "";
    setBusy(true);
    setMsgs((m) => [...m, { id: "o" + ++seq, role: "user", text: shown }]);
    const next = step + 1;
    const r = OB_REACT[getLang()];
    if (next < total && q.id !== "name" && Math.random() < 0.6) {
      if (!(await say(r[Math.floor(Math.random() * r.length)], 350, token))) return;
    }
    ask(next, token);
  };

  const finish = async (token) => {
    const a = answers.current;
    const old = useTripo.getState().profile;
    const p = {
      name: a.name || L("Traveler", "ভ্রমণকারী"),
      home: a.home || runtime.HOME_CITY,
      homeIata: a.homeIata || cityToIata(a.home) || "",
      style: a.style || [], likes: a.likes || [], company: a.company || "",
      budget: a.budget || "", stays: a.stays || [], length: a.length || "", dream: a.dream || "",
      createdAt: (old && old.createdAt) || Date.now(), updatedAt: Date.now(),
    };
    useTripo.getState().saveProfile(p);
    if (!(await say(L("All set, **" + p.name + "**! 🎉 Here's your travel profile:", "সব তৈরি, **" + p.name + "**! 🎉 এই যে আপনার ট্রাভেল প্রোফাইল:"), null, token))) return;
    setDone({ profile: p, isNew: !old });
  };

  const q = OB_QUESTIONS[step];
  const showInput = !busy && !done && q;
  const textMode = showInput && (q.type === "text" || otherMode);

  const submitText = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v && (q.required || otherMode)) { inputRef.current && inputRef.current.focus(); return; }
    setText("");
    answer(v, v || L("Skip", "স্কিপ"));
  };

  const toggle = (val) => {
    setChosen((c) => {
      if (c.indexOf(val) >= 0) return c.filter((x) => x !== val);
      const next = q.max && c.length >= q.max ? c.slice(1) : c.slice();
      next.push(val);
      return next;
    });
  };

  const summaryRows = done
    ? [
        [L("Traveler type", "ভ্রমণের ধরন"), done.profile.style.map((v) => optLabel("style", v)).join(", ")],
        [L("Loves", "ভালোবাসেন"), done.profile.likes.map((v) => optLabel("likes", v)).join(", ")],
        [L("Travels with", "সাথে যান"), optLabel("company", done.profile.company)],
        [L("Budget", "বাজেট"), optLabel("budget", done.profile.budget)],
        [L("Stays in", "থাকেন"), done.profile.stays.map((v) => optLabel("stays", v)).join(", ")],
        [L("Trip length", "ট্রিপের দৈর্ঘ্য"), optLabel("length", done.profile.length)],
        [L("From", "কোথা থেকে"), done.profile.home],
        [L("Dream destination", "স্বপ্নের গন্তব্য"), done.profile.dream],
      ].filter((r) => r[1])
    : [];

  const n = Math.min(step + 1, total);
  const close = () => router.push(useTripo.getState().profile ? "/chat" : "/");

  return (
    <div className="app">
      <div className="view active" id="view-onboard">
        <div className="head">
          <div className="head-avatar"><Icon name="sparkSolid" size={17} color="#fff" /></div>
          <div className="head-title">
            <span>Tripo</span>
            <span className="head-status" id="obStatus">{step < total ? L("Question " + n + " of " + total, "প্রশ্ন " + n + " / " + total) : L("All done!", "সব শেষ!")}</span>
          </div>
          <button type="button" className="head-btn" id="obCloseBtn" aria-label="Close" onClick={close}><Icon name="x" size={20} sw={2.2} /></button>
        </div>
        <div className="ob-bar"><div id="obBar" style={{ width: Math.round((100 * Math.min(step, total)) / total) + "%" }} /></div>
        <div className="body" id="obBody" ref={bodyRef}>
          {msgs.map((m) => (
            <div className={"msg-row " + m.role} key={m.id}>
              <div className={"msg " + m.role}>
                {m.role === "user" ? m.text : m.text == null ? <div className="typing"><i /><i /><i /></div> : <RichText text={m.text} />}
              </div>
            </div>
          ))}
          {done && (
            <div className="ob-summary">
              <div className="ob-sum-head">
                <div className="profile-avatar" style={{ width: 44, height: 44, fontSize: 17 }}>{initials(done.profile.name)}</div>
                <div><b>{done.profile.name}</b><div className="sv-sub">{L("Tripo traveler", "Tripo ভ্রমণকারী")}</div></div>
              </div>
              {summaryRows.map((r) => (
                <div className="ob-sum-row" key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>
              ))}
            </div>
          )}
        </div>
        <div className="ob-input" id="obInput">
          {textMode && (
            <>
              <form className="ob-text" onSubmit={submitText}>
                <input ref={inputRef} type="text" maxLength={60} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} placeholder={otherMode ? L("Type your city", "আপনার শহর লিখুন") : q.placeholder()} />
                <button type="submit" className="ob-go" aria-label={L("Continue", "এগিয়ে যান")}>→</button>
              </form>
              {q.optional && !otherMode && (
                <button type="button" className="ob-skip" onClick={() => answer("", L("Skip", "স্কিপ"))}>{L("Skip", "স্কিপ")}</button>
              )}
            </>
          )}
          {showInput && !textMode && (
            <>
              <div className="ob-chips">
                {q.options.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={"ob-chip" + (chosen.indexOf(o.v) >= 0 ? " on" : "")}
                    onClick={() => {
                      if (q.type === "single") {
                        if (o.v === "__other") { setText(""); setOtherMode(true); return; }
                        answer(o.v, o[lang]);
                      } else toggle(o.v);
                    }}
                  >
                    {o[lang]}
                  </button>
                ))}
              </div>
              {q.type === "multi" && (
                <button
                  type="button"
                  className="book-cta ob-continue"
                  disabled={!chosen.length}
                  onClick={() => chosen.length && answer(chosen.slice(), chosen.map((v) => optLabel(q.id, v)).join(", "))}
                >
                  {chosen.length ? L("Continue (" + chosen.length + ") →", "এগিয়ে যান (" + chosen.length + ") →") : L("Pick at least one", "অন্তত একটি বেছে নিন")}
                </button>
              )}
            </>
          )}
          {done && (
            <>
              <button
                type="button"
                className="book-cta ob-continue"
                onClick={() => { const s = useTripo.getState(); s.setChatSub("ai"); router.push("/chat"); s.personalWelcome(done.isNew); }}
              >
                {L("✨ Show me trips picked for me", "✨ আমার জন্য বাছাই করা ট্রিপ দেখান")}
              </button>
              <button type="button" className="ob-skip" onClick={start}>{L("Change my answers", "উত্তর বদলান")}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

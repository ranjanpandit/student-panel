"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

const MAX_TAB_VIOLATIONS = 3;
const MAX_FULLSCREEN_EXIT = 2;

export default function MedicalExamPage() {
  const { id } = useParams();
  const router = useRouter();

  /* =========================
      CORE STATE
  ========================== */
  const [examName, setExamName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [sections, setSections] = useState([]);
  const [pattern, setPattern] = useState({
    allow_section_switch: 1,
    allow_review: 1,
  });
  const [current, setCurrent] = useState({ s: 0, q: 0 });
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState({});
  const [review, setReview] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  /* =========================
      PROCTORING STATE
  ========================== */
  const [tabViolations, setTabViolations] = useState(0);
  const [fsViolations, setFsViolations] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showForceSubmit, setShowForceSubmit] = useState(false);

  const submittedRef = useRef(false);
  const submitReasonRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const snapshotTakenRef = useRef(false);
  const questionTimesRef = useRef({});
  const activeQuestionRef = useRef({ key: null, startedAt: null });

  /* =========================
      FULLSCREEN HELPERS
  ========================== */
  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  }, []);

  const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  /* =========================
      LOAD DATA
  ========================== */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exams/${id}/attempt`);
        const d = await res.json();
        if (!res.ok) {
          throw new Error(d.message || "Unable to load exam");
        }
        setExamName(d.exam_name || "Medical Board Examination");
        setStudentName(d.student_name || "Doctor Candidate");
        setSections(d.sections || []);
        setPattern(d.pattern || { allow_section_switch: 1, allow_review: 1 });
        setAnswers(d.answers || {});
        questionTimesRef.current =
          d.question_times && typeof d.question_times === "object"
            ? d.question_times
            : {};
        setTimeLeft(d.timeLeft || 0);
        if (d.current_section_id) {
          const sectionIndex = (d.sections || []).findIndex(
            (section) => section.id === d.current_section_id
          );
          if (sectionIndex >= 0) {
            setCurrent({ s: sectionIndex, q: 0 });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const touchQuestionTimer = useCallback((force = false) => {
    if (!started || !sections.length) return;
    const section = sections[current.s];
    const question = section?.questions?.[current.q];
    if (!section || !question) return;

    const key = `${section.id}-${question.id}`;
    const now = Date.now();
    const prev = activeQuestionRef.current;

    if (prev.key === key && !force) return;

    if (prev.key && prev.startedAt) {
      const delta = Math.max(0, Math.floor((now - prev.startedAt) / 1000));
      if (delta > 0) {
        questionTimesRef.current[prev.key] =
          Number(questionTimesRef.current[prev.key] || 0) + delta;
      }
    }

    activeQuestionRef.current = { key, startedAt: now };
  }, [current.q, current.s, sections, started]);

  const getQuestionTimesSnapshot = useCallback(() => {
    touchQuestionTimer(true);
    return { ...questionTimesRef.current };
  }, [touchQuestionTimer]);

  const getCurrentSnapshotPayload = useCallback(() => {
    if (!started || !sections.length) return null;
    const section = sections[current.s];
    const question = section?.questions?.[current.q];
    if (!section || !question) return null;
    const key = `${section.id}-${question.id}`;
    return {
      sectionId: section.id,
      questionId: question.id,
      answer: answers[key] ?? null,
      timeLeft,
      questionTimes: getQuestionTimesSnapshot(),
    };
  }, [answers, current.q, current.s, getQuestionTimesSnapshot, sections, started, timeLeft]);

  useEffect(() => {
    const returnFocusToOpener = () => {
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.focus();
        } catch {}
      }
    };

    window.addEventListener("beforeunload", returnFocusToOpener);
    return () => {
      window.removeEventListener("beforeunload", returnFocusToOpener);
    };
  }, []);

  useEffect(() => {
    const persistOnClose = () => {
      const payload = getCurrentSnapshotPayload();
      if (!payload) return;
      try {
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon(`/api/exams/${id}/attempt/save`, blob);
          return;
        }
        fetch(`/api/exams/${id}/attempt/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      } catch {}
    };

    window.addEventListener("beforeunload", persistOnClose);
    window.addEventListener("pagehide", persistOnClose);
    return () => {
      window.removeEventListener("beforeunload", persistOnClose);
      window.removeEventListener("pagehide", persistOnClose);
    };
  }, [getCurrentSnapshotPayload, id]);

  /* =========================
      WEBCAM & PROCTORING
  ========================== */
  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          await videoRef.current.play();
          setTimeout(() => {
            if (!snapshotTakenRef.current) {
              captureSnapshot();
              snapshotTakenRef.current = true;
            }
          }, 600);
        };
      }
    } catch (err) {
      alert("Proctoring camera access is mandatory for Medical Boards.");
      triggerSubmit("WEBCAM_BLOCKED");
    }
  }

  async function captureSnapshot() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    const formData = new FormData();
    formData.append("image", blob);
    formData.append("event", "EXAM_START");
    await fetch(`/api/exams/${id}/attempt/proctor`, { method: "POST", body: formData });
  }

  /* =========================
      SECURITY LISTENERS
  ========================== */
  useEffect(() => {
    if (!started) return;
    const onFsChange = () => {
      if (!isFullscreen() && !submittedRef.current) {
        setFsViolations((v) => {
          const next = v + 1;
          if (next >= MAX_FULLSCREEN_EXIT) triggerSubmit("FULLSCREEN_EXIT");
          else {
            alert("Fullscreen is required for secure medical examination.");
            setTimeout(requestFullscreen, 300);
          }
          return next;
        });
      }
    };
    const onBlur = () => {
      if (document.hidden && !submittedRef.current) {
        setTabViolations((v) => {
          const next = v + 1;
          if (next >= MAX_TAB_VIOLATIONS) triggerSubmit("TAB_SWITCH_LIMIT");
          return next;
        });
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("visibilitychange", onBlur);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("visibilitychange", onBlur);
    };
  }, [started, requestFullscreen]);

  /* =========================
      TIMER & NAVIGATION
  ========================== */
  useEffect(() => {
    if (!started || submittedRef.current) return;
    const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    touchQuestionTimer();
  }, [touchQuestionTimer]);

  useEffect(() => {
    if (timeLeft === 0 && started && !submittedRef.current) triggerSubmit("TIME_UP");
  }, [timeLeft, started]);

  useEffect(() => {
    if (!sections.length) return;
    const s = sections[current.s];
    const q = s.questions[current.q];
    const key = `${s.id}-${q.id}`;
    setVisited((v) => (v[key] ? v : { ...v, [key]: true }));
  }, [current, sections]);

  async function startExam() {
    await requestFullscreen();
    await startWebcam();
    setStarted(true);
  }

  function triggerSubmit(reason) {
    if (submittedRef.current) return;
    submitReasonRef.current = reason;
    setShowForceSubmit(true);
  }

  async function persistAnswer(answerValue) {
    const s = sections[current.s];
    const q = s.questions[current.q];
    const key = `${s.id}-${q.id}`;
    const previousAnswer = answers[key];
    setAnswers((p) => ({ ...p, [key]: answerValue }));
    const response = await fetch(`/api/exams/${id}/attempt/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: s.id,
        questionId: q.id,
        answer: answerValue,
        timeLeft,
        questionTimes: getQuestionTimesSnapshot(),
      }),
    });

    if (!response.ok) {
      setAnswers((p) => {
        const next = { ...p };
        if (previousAnswer == null) {
          delete next[key];
        } else {
          next[key] = previousAnswer;
        }
        return next;
      });
      throw new Error("Unable to save response");
    }
  }

  async function saveAnswer(optionId) {
    try {
      await persistAnswer(optionId);
    } catch (error) {
      console.error(error);
      alert("We could not save this response. Please try again.");
    }
  }

  function hasAnswer(value) {
    return value != null && value !== "";
  }

  async function finalSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      }
    } catch (err) { console.warn(err); }

    const response = await fetch(`/api/exams/${id}/attempt/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: submitReasonRef.current || "MANUAL",
        tabViolations,
        fsViolations,
        questionTimes: getQuestionTimesSnapshot(),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (result?.revealResult && result?.result?.resultId) {
      router.push(`/result/${result.result.resultId}`);
      return;
    }

    router.push("/exams");
  }

  function moveToSection(sectionIndex) {
    if (!pattern.allow_section_switch && sectionIndex !== current.s) {
      return;
    }
    setCurrent({ s: sectionIndex, q: 0 });
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
       <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4 mx-auto"></div>
          <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Medical System Initializing...</p>
       </div>
    </div>
  );

  if (!started) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center w-full max-w-lg border-t-8 border-teal-500">
        <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-8">
           <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">{examName}</h1>
        <p className="text-slate-400 mb-10 font-medium">Credentialing Environment for <br/><span className="text-teal-600 font-bold">{studentName}</span></p>
        <button onClick={startExam} className="w-full py-5 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-900 transition-all active:scale-95">
          Enter Medical Assessment
        </button>
      </div>
    </div>
  );

  const section = sections[current.s];
  const question = section.questions[current.q];
  const qKey = `${section.id}-${question.id}`;

  return (
    <div className="min-h-[100dvh] md:h-[100dvh] flex flex-col bg-white overflow-hidden select-none">
      {/* MEDICAL GRADE HEADER */}
      <header className="h-auto min-h-16 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8 shrink-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="h-10 w-10 bg-teal-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-teal-100 font-black text-xl">+</div>
           <div>
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">{examName}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{studentName}</p>
           </div>
        </div>
        <div className="flex items-center gap-6">
          <div className={`px-5 py-2 rounded-xl flex items-center gap-3 ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-white border border-slate-200 text-slate-700 shadow-sm'}`}>
            <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">Clock</span>
            <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
          </div>
          <button onClick={() => setShowSummary(true)} className="bg-slate-800 text-white px-8 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-black transition">Submit Case</button>
        </div>
      </header>

      {/* TABS - STICKY CLINICAL SUB-NAV */}
      <nav className="h-12 bg-white border-b border-slate-100 flex items-center px-4 sm:px-8 gap-1 shrink-0 overflow-x-auto no-scrollbar">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => moveToSection(i)}
            disabled={!pattern.allow_section_switch && i !== current.s}
            className={`px-6 py-1.5 text-[9px] font-black rounded uppercase transition-all whitespace-nowrap tracking-widest ${i === current.s ? "bg-teal-50 text-teal-600 border border-teal-200" : "text-slate-400 hover:text-slate-600"} ${!pattern.allow_section_switch && i !== current.s ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {s.section_name}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col relative bg-white">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:px-24 lg:py-16 pb-44 sm:pb-32 no-scrollbar">
            <div className="max-w-4xl">
              <div className="mb-10 flex items-center gap-6">
                <div className="bg-slate-800 text-white text-[10px] font-black px-4 py-1 rounded uppercase">Item {current.q + 1}</div>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
              </div>

              {/* MEDICAL IMAGE TAG TRIGGER */}
              <div className="prose prose-sm sm:prose-base lg:prose-lg text-base sm:text-lg lg:text-2xl text-slate-800 leading-relaxed font-semibold mb-8 sm:mb-12 max-w-none break-words" dangerouslySetInnerHTML={{ __html: question.question_text }} />
              
              <div className="space-y-3">
                {question.options.map((opt, idx) => (
                  <label key={opt.id} className={`flex items-start gap-3 sm:gap-6 p-3 sm:p-6 border rounded-xl cursor-pointer transition-all ${Number(answers[qKey]) === Number(opt.id) ? "border-teal-500 bg-teal-50/30 shadow-md shadow-teal-50" : "border-slate-100 hover:border-slate-300"}`}>
                    <input type="radio" className="hidden" onChange={() => saveAnswer(opt.id)} checked={Number(answers[qKey]) === Number(opt.id)} />
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex shrink-0 items-center justify-center font-bold text-xs sm:text-sm ${Number(answers[qKey]) === Number(opt.id) ? "bg-teal-600 border-teal-600 text-white" : "border-slate-200 text-slate-300"}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="prose prose-sm sm:prose-base max-w-none text-slate-700 font-semibold break-words" dangerouslySetInnerHTML={{ __html: opt.option_text }} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* FIXED CLINICAL CONTROLS */}
          <footer className="absolute bottom-0 left-0 right-0 bg-slate-50 border-t border-slate-200 px-3 py-3 sm:px-12 sm:py-0 flex flex-col gap-2 sm:h-20 sm:flex-row sm:items-center sm:justify-between z-30 shadow-inner">
            <button
              disabled={current.q === 0}
              onClick={() => setCurrent((p) => ({ ...p, q: p.q - 1 }))}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-0 transition"
            >
              &lt; Previous Question
            </button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-4">
              {pattern.allow_review ? (
                <button onClick={() => setReview(r => ({ ...r, [qKey]: !r[qKey] }))} className={`px-4 sm:px-10 py-3 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all ${review[qKey] ? "bg-amber-500 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-500 shadow-sm"}`}>Mark for Review</button>
              ) : null}
              <button onClick={() => current.q < section.questions.length - 1 && setCurrent(p => ({ ...p, q: p.q + 1 }))} className="px-4 sm:px-12 py-3 bg-teal-600 text-white rounded-lg font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all active:scale-95">Save & Next Question &gt;</button>
            </div>
          </footer>
        </div>

        {/* MEDICAL SIDEBAR - CASE VITAL SIGNS */}
        <aside className="w-full lg:w-80 max-h-[42vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-200">
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-lg ring-4 ring-white">
              <video ref={videoRef} autoPlay muted className="w-full h-full object-cover grayscale opacity-80" />
              <div className="absolute top-2 left-2 flex items-center gap-2 bg-teal-600 px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-tighter animate-pulse">
                Proctor Signal Active
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 text-center">
               <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Items Saved</p>
                  <p className="text-xl font-black text-slate-800">{Object.values(answers).filter(hasAnswer).length}</p>
               </div>
               <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Violations</p>
                  <p className="text-xl font-black text-red-500">{tabViolations + fsViolations}</p>
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Question Palette</h3>
            <div className="grid grid-cols-4 gap-4">
              {section.questions.map((q, i) => {
                const k = `${section.id}-${q.id}`;
                let style = "bg-white text-slate-300 border-slate-100";
                if (current.q === i) style = "bg-slate-800 border-slate-800 text-white scale-110 shadow-xl";
                else if (hasAnswer(answers[k])) style = "bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-50";
                else if (review[k]) style = "bg-amber-500 border-amber-500 text-white";
                else if (visited[k]) style = "bg-slate-200 border-slate-200 text-slate-600";
                return (
                  <button key={k} onClick={() => setCurrent({ ...current, q: i })} className={`h-11 w-11 rounded-lg text-xs font-black border transition-all ${style}`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* CASE SUMMARY - CLINICAL BREAKDOWN */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 p-10 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2 italic">Session Case Summary</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Verify all items before final certification.</p>
            </div>
            
            <div className="p-10 overflow-y-auto space-y-10 flex-1">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 text-center">
                  <p className="text-3xl font-black text-teal-600 mb-1">{Object.values(answers).filter(hasAnswer).length}</p>
                  <p className="text-[9px] font-bold text-teal-800 uppercase tracking-widest">Attempted</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-center">
                  <p className="text-3xl font-black text-amber-500 mb-1">{Object.keys(review).length}</p>
                  <p className="text-[9px] font-bold text-amber-800 uppercase tracking-widest">Review</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                  <p className="text-3xl font-black text-slate-400">
                    {sections.reduce((acc, s) => acc + s.questions.length, 0) - Object.values(answers).filter(hasAnswer).length}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Unanswered</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostic Breakdown</h3>
                <div className="space-y-3">
                  {sections.map((s) => {
                    const answeredInSection = s.questions.filter(q => hasAnswer(answers[`${s.id}-${q.id}`])).length;
                    return (
                      <div key={s.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl hover:shadow-lg transition-shadow">
                        <span className="font-black text-slate-700 text-[10px] uppercase tracking-widest">{s.section_name}</span>
                        <div className="flex gap-4 items-center">
                           <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-teal-500 h-full" style={{ width: `${(answeredInSection/s.questions.length)*100}%` }}></div>
                           </div>
                           <span className="text-[10px] font-black text-slate-400">{answeredInSection}/{s.questions.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-200 flex gap-4 shrink-0">
              <button onClick={() => setShowSummary(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition">Return to Exam</button>
              <button onClick={finalSubmit} className="flex-1 py-4 bg-teal-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-teal-100 hover:bg-teal-700 transition">Final Certification</button>
            </div>
          </div>
        </div>
      )}

      {/* FORCE TERMINATION */}
      {showForceSubmit && (
        <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-2xl shadow-red-500/50">
             <span className="text-4xl font-black">!</span>
          </div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Access Revoked</h2>
          <p className="text-slate-400 mt-2 text-xl font-medium tracking-tight max-w-md mx-auto italic underline decoration-red-600 decoration-2 underline-offset-8">
            Security Breach: {submitReasonRef.current?.replace("_", " ")}
          </p>
          <button onClick={finalSubmit} className="mt-16 border-2 border-white text-white px-16 py-4 rounded-xl font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition">Log Out</button>
        </div>
      )}
    </div>
  );
}


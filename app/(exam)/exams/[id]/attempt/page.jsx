"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

const MAX_TAB_VIOLATIONS = 3;
const MAX_FULLSCREEN_EXIT = 2;

export default function ExamAttemptPage() {
  const { id } = useParams();
  const router = useRouter();

  /* =========================
      CORE STATE
  ========================== */
  const [examName, setExamName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [sections, setSections] = useState([]);
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
        setExamName(d.exam_name || "Online Examination");
        setStudentName(d.student_name || "Student");
        setSections(d.sections || []);
        setAnswers(d.answers || {});
        setTimeLeft(d.timeLeft || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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
      alert("Webcam access is mandatory for this exam." + err);
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
            alert("Fullscreen is mandatory.");
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
    // await startWebcam();
    setStarted(true);
  }

  function triggerSubmit(reason) {
    if (submittedRef.current) return;
    submitReasonRef.current = reason;
    setShowForceSubmit(true);
  }

  async function saveAnswer(optionId) {
    const s = sections[current.s];
    const q = s.questions[current.q];
    const key = `${s.id}-${q.id}`;
    setAnswers((p) => ({ ...p, [key]: optionId }));
    await fetch(`/api/exams/${id}/attempt/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: s.id, questionId: q.id, answer: optionId, timeLeft }),
    });
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

    await fetch(`/api/exams/${id}/attempt/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: submitReasonRef.current || "MANUAL", tabViolations, fsViolations }),
    });
    router.push("/dashboard");
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">Loading Exam Engine...</div>;

  if (!started) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center w-full max-w-md border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800 mb-8">{examName}</h1>
        <button onClick={startExam} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl">Start Assessment</button>
      </div>
    </div>
  );

  const section = sections[current.s];
  const question = section.questions[current.q];
  const qKey = `${section.id}-${question.id}`;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden select-none">
      {/* HEADER */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 z-40 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{examName}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{studentName}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className={`px-4 py-1.5 rounded-xl border-2 flex items-center gap-3 ${timeLeft < 300 ? 'border-red-500 bg-red-50 animate-pulse' : 'border-slate-100 bg-slate-50'}`}>
            <span className="text-[10px] font-black text-slate-400 uppercase">Timer</span>
            <span className={`font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-slate-700'}`}>{formatTime(timeLeft)}</span>
          </div>
          <button onClick={() => setShowSummary(true)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-black transition shadow-lg">Submit</button>
        </div>
      </header>

      {/* SECTION NAV */}
      <nav className="h-12 bg-white border-b flex items-center px-8 gap-2 shrink-0 overflow-x-auto no-scrollbar">
        {sections.map((s, i) => (
          <button key={s.id} onClick={() => setCurrent({ s: i, q: 0 })} className={`px-5 py-1.5 text-[10px] font-black rounded-lg uppercase transition-all whitespace-nowrap ${i === current.s ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-400 hover:bg-slate-50"}`}>
            {s.section_name}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col relative bg-white">
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 pb-32">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 flex items-center gap-4">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Question {current.q + 1} of {section.questions.length}</span>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <div className="text-xl lg:text-2xl text-slate-800 leading-relaxed font-semibold mb-12" dangerouslySetInnerHTML={{ __html: question.question_text }} />
              <div className="space-y-4">
                {question.options.map((opt, idx) => (
                  <label key={opt.id} className={`flex items-center gap-5 p-5 border-2 rounded-2xl cursor-pointer transition-all ${answers[qKey] === opt.id ? "border-blue-600 bg-blue-50/50" : "border-slate-50 hover:bg-slate-50"}`}>
                    <input type="radio" className="hidden" onChange={() => saveAnswer(opt.id)} checked={answers[qKey] === opt.id} />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${answers[qKey] === opt.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{String.fromCharCode(65 + idx)}</div>
                    <div className="text-slate-700 font-medium text-lg" dangerouslySetInnerHTML={{ __html: opt.option_text }} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <footer className="absolute bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-100 px-8 flex items-center justify-between z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <button disabled={current.q === 0} onClick={() => setCurrent(p => ({ ...p, q: p.q - 1 }))} className="px-6 py-2 font-bold text-slate-400 hover:text-slate-600 disabled:opacity-0 transition">← Previous</button>
            <div className="flex gap-4">
              <button onClick={() => setReview(r => ({ ...r, [qKey]: !r[qKey] }))} className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${review[qKey] ? "bg-amber-500 text-white shadow-lg shadow-amber-100" : "border-2 border-slate-100 text-slate-500 hover:bg-slate-50"}`}>Mark for Review</button>
              <button onClick={() => current.q < section.questions.length - 1 && setCurrent(p => ({ ...p, q: p.q + 1 }))} className="px-10 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-blue-700 transition-all active:scale-95">Save & Next →</button>
            </div>
          </footer>
        </div>

        <aside className="w-80 border-l border-slate-100 bg-white flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100">
            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-slate-100 shadow-inner">
              <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Question Grid</h3>
            <div className="grid grid-cols-4 gap-3">
              {section.questions.map((q, i) => {
                const k = `${section.id}-${q.id}`;
                let style = "bg-slate-50 text-slate-300 border-transparent";
                if (current.q === i) style = "bg-white border-blue-600 text-blue-600 shadow-lg ring-2 ring-blue-50";
                else if (answers[k]) style = "bg-emerald-500 text-white shadow-md shadow-emerald-100";
                else if (review[k]) style = "bg-amber-500 text-white shadow-md shadow-amber-100";
                else if (visited[k]) style = "bg-slate-200 text-slate-500";
                return <button key={k} onClick={() => setCurrent({ ...current, q: i })} className={`h-11 w-11 rounded-xl text-xs font-black border-2 transition-all transform hover:scale-105 active:scale-95 ${style}`}>{(i + 1).toString().padStart(2, '0')}</button>;
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* IMPROVED SECTION-WISE SUMMARY MODAL */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 p-8 text-white shrink-0">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Review Progress</h2>
              <p className="text-slate-400 text-sm font-medium italic">Check your sectional breakdown before final submission.</p>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 flex-1">
              <div className="grid grid-cols-3 gap-4 pb-8 border-b border-slate-100">
                <div className="text-center p-4 bg-emerald-50 rounded-2xl">
                  <p className="text-2xl font-black text-emerald-600">{Object.keys(answers).length}</p>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Attempted</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-2xl">
                  <p className="text-2xl font-black text-amber-500">{Object.keys(review).length}</p>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">In Review</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-2xl">
                  <p className="text-2xl font-black text-slate-400">
                    {sections.reduce((acc, s) => acc + s.questions.length, 0) - Object.keys(answers).length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending</p>
                </div>
              </div>

              {/* Section-wise breakdown list */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sectional Breakdown</h3>
                <div className="grid gap-3">
                  {sections.map((s) => {
                    const answeredInSection = s.questions.filter(q => answers[`${s.id}-${q.id}`]).length;
                    const reviewInSection = s.questions.filter(q => review[`${s.id}-${q.id}`]).length;
                    return (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                        <div className="font-bold text-slate-700 text-sm uppercase tracking-tight">{s.section_name}</div>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Saved</span>
                            <span className="font-black text-slate-700">{answeredInSection}/{s.questions.length}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-amber-500 uppercase">Review</span>
                            <span className="font-black text-slate-700">{reviewInSection}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 flex gap-4 shrink-0">
              <button onClick={() => setShowSummary(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition">Resume Test</button>
              <button onClick={finalSubmit} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition active:scale-95">Final Submit</button>
            </div>
          </div>
        </div>
      )}

      {showForceSubmit && (
        <div className="fixed inset-0 z-[200] bg-red-600 flex flex-col items-center justify-center p-8 text-center text-white">
          <h2 className="text-4xl font-black uppercase italic">Security Termination</h2>
          <p className="text-white/80 mt-4 text-xl">Reason: {submitReasonRef.current?.replace("_", " ")}</p>
          <button onClick={finalSubmit} className="mt-12 bg-white text-red-600 px-12 py-4 rounded-2xl font-black">Exit Portal</button>
        </div>
      )}
    </div>
  );
}
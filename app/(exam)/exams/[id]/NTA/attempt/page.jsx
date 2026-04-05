"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

const MAX_TAB_VIOLATIONS = 3;
const MAX_FULLSCREEN_EXIT = 2;

export default function NtaExamPage() {
  const { id } = useParams();
  const router = useRouter();

  /* =========================
      STATE & REFS (KEEP LOGIC)
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

  const [tabViolations, setTabViolations] = useState(0);
  const [fsViolations, setFsViolations] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showForceSubmit, setShowForceSubmit] = useState(false);
  const [showClosePrompt, setShowClosePrompt] = useState(false);

  const submittedRef = useRef(false);
  const closingRef = useRef(false);
  const submitReasonRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const questionTimesRef = useRef({});
  const activeQuestionRef = useRef({ key: null, startedAt: null });

  /* =========================
      SYSTEM LOAD (KEEP LOGIC)
  ========================== */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exams/${id}/attempt`);
        const d = await res.json();
        if (!res.ok) {
          throw new Error(d.message || "Unable to load exam");
        }
        setExamName(d.exam_name || "JEE-Main");
        setStudentName(d.student_name || "Candidate");
        setSections(d.sections || []);
        setPattern(d.pattern || { allow_section_switch: 1, allow_review: 1 });
        setAnswers(d.answers || {});
        questionTimesRef.current =
          d.question_times && typeof d.question_times === "object"
            ? d.question_times
            : {};
        setTimeLeft(d.timeLeft || 10800); 
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

  const persistAttemptSnapshot = useCallback(async () => {
    const payload = getCurrentSnapshotPayload();
    if (!payload) return;
    try {
      await fetch(`/api/exams/${id}/attempt/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {}
  }, [getCurrentSnapshotPayload, id]);

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
      FUNCTIONALITY (KEEP LOGIC)
  ========================== */
  const requestFullscreen = async () => {
    const el = document.documentElement;
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  };

  const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => setTimeLeft(t => (t <= 0 ? 0 : t - 1)), 1000);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    touchQuestionTimer();
  }, [touchQuestionTimer]);

  useEffect(() => {
    if (!sections.length) return;
    const section = sections[current.s];
    const question = section?.questions?.[current.q];
    if (!section || !question) return;
    const key = `${section.id}-${question.id}`;
    setVisited((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, [current, sections]);

  async function finalSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      if (isFullscreen()) {
        await document.exitFullscreen?.();
      }
    } catch (e) {}

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

  function closeTest() {
    setShowClosePrompt(true);
  }

  async function confirmCloseTest() {
    closingRef.current = true;
    setShowClosePrompt(false);
    await persistAttemptSnapshot();
    try {
      if (isFullscreen()) {
        await document.exitFullscreen?.();
      }
    } catch {}

    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }

    window.open("", "_self");
    window.close();
    router.push("/exams");
  }

  const persistAnswer = async (answerValue) => {
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
  };

  const saveAnswer = async (optionId) => {
    try {
      await persistAnswer(optionId);
    } catch (error) {
      console.error(error);
      alert("We could not save this response. Please try again.");
    }
  };

  const clearAnswer = async () => {
    try {
      await persistAnswer(null);
    } catch (error) {
      console.error(error);
      alert("We could not clear this response. Please try again.");
    }
  };

  function hasAnswer(value) {
    return value != null && value !== "";
  }

  function moveNextQuestion() {
    setCurrent((prev) => ({
      ...prev,
      q:
        prev.q < section.questions.length - 1
          ? prev.q + 1
          : prev.q,
    }));
  }

  function moveToQuestion(questionIndex) {
    setCurrent((prev) => ({
      ...prev,
      q: Math.max(0, Math.min(questionIndex, section.questions.length - 1)),
    }));
  }

  function toggleCurrentReview(markValue) {
    setReview((prev) => ({ ...prev, [qKey]: markValue ?? !prev[qKey] }));
  }

  function moveToSection(sectionIndex) {
    if (!pattern.allow_section_switch && sectionIndex !== current.s) {
      return;
    }
    setCurrent({ s: sectionIndex, q: 0 });
  }

  if (loading) return <div className="h-screen flex items-center justify-center">Loading NTA Interface...</div>;

  if (!started) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center border p-10 shadow-lg max-w-md w-full">
        <h1 className="text-xl font-bold mb-6 underline">EXAM SYSTEM READINESS</h1>
        <button onClick={async () => { await requestFullscreen(); setStarted(true); }} className="bg-[#2c3e50] text-white px-10 py-3 font-bold">START EXAM</button>
      </div>
    </div>
  );

  const section = sections[current.s];
  const question = section.questions[current.q];
  const qKey = `${section.id}-${question.id}`;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans select-none text-[#333]">
      
      {/* NTA HEADER PART 1 */}
      <header className="bg-white px-6 py-2 flex justify-between items-center shrink-0 border-b">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gray-100 border p-1">
             <div className="w-full h-full bg-gray-300 flex items-center justify-center text-white">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
             </div>
          </div>
          <div className="text-[13px] leading-relaxed">
            <p>Candidate Name : <span className="text-orange-600 font-bold uppercase">{studentName}</span></p>
            <p>Exam Name : <span className="text-orange-600 font-bold uppercase">{examName}</span></p>
            <p>Subject Name : <span className="text-orange-600 font-bold uppercase">{section.section_name}</span></p>
            <p className="flex items-center gap-2 mt-1">
              Remaining Time : 
              <span className="bg-cyan-500 text-white px-3 py-0.5 rounded font-mono font-bold text-lg">
                {Math.floor(timeLeft / 3600)}:{String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="border border-gray-300 p-2">
            <select className="text-xs border p-1 outline-none"><option>English</option></select>
          </div>
          <button
            onClick={closeTest}
            className="border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold uppercase hover:bg-gray-50"
          >
            Close test
          </button>
        </div>
      </header>

      {/* SUB HEADER / SECTION BAR */}
      <div className="bg-[#2c3e50] text-white flex items-center px-4 overflow-x-auto no-scrollbar shrink-0">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => moveToSection(i)}
            disabled={!pattern.allow_section_switch && i !== current.s}
            className={`px-6 py-2 text-[12px] font-bold uppercase transition-colors whitespace-nowrap border-r border-slate-600 ${i === current.s ? "bg-white text-black" : "hover:bg-slate-700"} ${!pattern.allow_section_switch && i !== current.s ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {s.section_name}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-300 relative min-h-0">
          <div className="bg-[#f0f0f0] px-4 py-1.5 border-b font-bold text-[14px] flex justify-between">
            <span>Question No: {current.q + 1}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 scroll-smooth">
            <div className="max-w-4xl">
              <div className="prose prose-sm sm:prose-base max-w-none text-black mb-6 sm:mb-10 border-b pb-4 break-words" dangerouslySetInnerHTML={{ __html: question.question_text }} />
              <div className="space-y-4">
                {question.options.map((opt, idx) => (
                  <label key={opt.id} className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="answer" 
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer" 
                      onChange={() => saveAnswer(opt.id)} 
                      checked={Number(answers[qKey]) === Number(opt.id)} 
                    />
                    <span className="text-sm leading-6 sm:text-[15px] group-hover:text-blue-700 break-words">
                       {idx + 1}) <span dangerouslySetInnerHTML={{ __html: opt.option_text }} />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM CONTROLS */}
          <div className="shrink-0 border-t border-gray-300">
            <div className="flex flex-wrap gap-2 p-3 bg-[#f8f9fa]">
              <button onClick={moveNextQuestion} className="bg-[#4caf50] text-white px-5 py-2 text-[12px] font-bold uppercase rounded border-b-2 border-green-800 shadow-sm">Save & Next</button>
              <button onClick={clearAnswer} className="bg-white border text-gray-700 px-5 py-2 text-[12px] font-bold uppercase rounded shadow-sm">Clear</button>
              {pattern.allow_review ? (
                <button onClick={() => toggleCurrentReview()} className="bg-[#fb8c00] text-white px-5 py-2 text-[12px] font-bold uppercase rounded border-b-2 border-orange-800 shadow-sm">
                  {review[qKey] ? "Unmark Review" : "Save & Mark For Review"}
                </button>
              ) : null}
              {pattern.allow_review ? (
                <button onClick={() => { toggleCurrentReview(); moveNextQuestion(); }} className="bg-[#3f51b5] text-white px-5 py-2 text-[12px] font-bold uppercase rounded border-b-2 border-indigo-900 shadow-sm">
                  {review[qKey] ? "Unmark & Next" : "Mark For Review & Next"}
                </button>
              ) : null}
            </div>
            
            <div className="p-3 flex flex-wrap justify-between items-center gap-2 border-t bg-gray-100">
               <div className="flex flex-wrap gap-2">
                 <button onClick={() => moveToQuestion(current.q - 1)} className="bg-white border px-4 py-1 text-xs font-bold shadow-sm">&lt;&lt; BACK</button>
                 <button onClick={() => moveToQuestion(current.q + 1)} className="bg-white border px-4 py-1 text-xs font-bold shadow-sm">NEXT &gt;&gt;</button>
               </div>
               <button onClick={() => setShowSummary(true)} className="bg-[#4caf50] text-white px-10 py-1.5 text-xs font-bold uppercase shadow-md border-b-2 border-green-800">Submit</button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="w-full lg:w-[300px] max-h-[42vh] lg:max-h-none flex flex-col bg-white shrink-0 border-t lg:border-t-0 lg:border-l border-gray-300 overflow-y-auto">
          {/* LEGEND BLOCK */}
          <div className="p-4 border-b">
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-[11px] font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-gray-100 border border-gray-300 flex items-center justify-center">0</span> 
                Not Visited
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-[#f44336] text-white flex items-center justify-center rounded-t-xl">0</span> 
                Not Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-[#4caf50] text-white flex items-center justify-center rounded-b-xl">0</span> 
                Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-[#673ab7] text-white flex items-center justify-center rounded-full">0</span> 
                Marked for Review
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="w-8 h-8 bg-[#673ab7] text-white flex items-center justify-center rounded-full relative">0<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div></span>
                <span className="leading-tight text-[10px]">Answered & Marked for Review (will be considered for evaluation)</span>
              </div>
            </div>
          </div>

          {/* PALETTE GRID */}
          <div className="flex-1 p-3">
             <div className="bg-[#2c3e50] text-white px-3 py-1 text-[12px] font-bold uppercase mb-4">Subject : {section.section_name}</div>
             <div className="grid grid-cols-4 gap-2">
                {section.questions.map((q, i) => {
                  const k = `${section.id}-${q.id}`;
                  let statusStyle = "bg-white border border-gray-300 text-gray-500"; // Not Visited
                  const answered = hasAnswer(answers[k]);
                  const marked = Boolean(review[k]);
                  if (answered && marked) statusStyle = "bg-[#673ab7] text-white rounded-full border-indigo-900";
                  else if (answered) statusStyle = "bg-[#4caf50] text-white rounded-b-xl border-green-700"; // Answered
                  else if (review[k]) statusStyle = "bg-[#673ab7] text-white rounded-full border-indigo-900"; // Review
                  else if (visited[k]) statusStyle = "bg-[#f44336] text-white rounded-t-xl border-red-700"; // Not Answered

                  return (
                    <button 
                      key={k} 
                      onClick={() => moveToQuestion(i)}
                      className={`relative h-9 w-10 text-[12px] font-bold flex items-center justify-center shadow-sm ${statusStyle} ${current.q === i ? "ring-2 ring-black ring-offset-1" : ""}`}
                    >
                      {i + 1}
                      {answered && marked ? (
                        <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-green-500" />
                      ) : null}
                    </button>
                  );
                })}
             </div>
          </div>

          {/* FOOTER */}
          <div className="bg-gray-100 p-2 text-center text-[10px] border-t font-bold uppercase">
             © National Testing Agency
          </div>
        </aside>
      </div>

      {/* SUMMARY MODAL */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded shadow-2xl w-full max-w-xl overflow-hidden border-t-8 border-[#2c3e50]">
            <div className="p-6">
              <h2 className="text-xl font-black mb-6 uppercase underline">Exam Summary</h2>
              <table className="w-full text-sm border-collapse border">
                 <thead className="bg-gray-200">
                    <tr>
                      <th className="border p-2">Section</th>
                      <th className="border p-2">Attempted</th>
                      <th className="border p-2">Review</th>
                    </tr>
                 </thead>
                 <tbody>
                    {sections.map(s => (
                      <tr key={s.id} className="text-center font-bold">
                        <td className="border p-2">{s.section_name}</td>
                        <td className="border p-2">{s.questions.filter(q => hasAnswer(answers[`${s.id}-${q.id}`])).length}</td>
                        <td className="border p-2">{s.questions.filter(q => Boolean(review[`${s.id}-${q.id}`])).length}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            </div>
            <div className="p-6 bg-gray-50 flex gap-4">
               <button onClick={() => setShowSummary(false)} className="flex-1 py-3 border-2 font-black uppercase text-sm hover:bg-gray-100">Cancel</button>
               <button onClick={finalSubmit} className="flex-1 py-3 bg-[#4caf50] text-white font-black uppercase text-sm hover:bg-green-700 shadow-lg">Final Submit</button>
            </div>
          </div>
        </div>
      )}

      {showClosePrompt ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md border border-gray-300 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold uppercase">Close test window?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Closing now returns to exam list. Timer continues on server until submission.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowClosePrompt(false)}
                className="flex-1 border border-gray-300 px-4 py-2 text-sm font-bold uppercase hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCloseTest}
                className="flex-1 bg-[#2c3e50] px-4 py-2 text-sm font-bold uppercase text-white hover:bg-black"
              >
                Close test
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

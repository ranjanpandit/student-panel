"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  Monitor,
  Shield,
  Eye,
  X,
} from "lucide-react";

/**
 * Enterprise Design System Config
 */
const THEMES = {
  standard: {
    accent: "sky",
    startPanel:
      "bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_42%,#38bdf8_100%)]",
    startGlow:
      "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.24),_transparent_26%)]",
    startChip: "text-sky-50",
    primaryButton: "bg-sky-600 hover:bg-sky-700",
    launchLabel: "Launch standard exam",
    pageBg:
      "bg-[linear-gradient(180deg,#eef5ff_0%,#f8fbff_55%,#ffffff_100%)]",
    heroClass:
      "overflow-hidden rounded-[30px] border border-sky-100 bg-white shadow-[0_28px_80px_rgba(14,165,233,0.12)]",
    optionSelected:
      "border-sky-400 bg-[linear-gradient(135deg,#eff6ff_0%,#e0f2fe_100%)] shadow-[0_12px_30px_rgba(14,165,233,0.12)]",
    optionIdle:
      "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50",
    optionBadgeSelected: "bg-sky-600 text-white",
    optionBadgeIdle: "bg-slate-100 text-slate-500",
    headerButton: "bg-slate-950 hover:bg-slate-800",
  },
  flash: {
    accent: "amber",
    startPanel:
      "bg-[linear-gradient(135deg,#1e3a8a_0%,#0ea5e9_45%,#fbbf24_100%)]",
    startGlow:
      "bg-[radial-gradient(circle_at_top_left,_rgba(185,28,28,0.25),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.25),_transparent_26%)]",
    startChip: "text-amber-950",
    primaryButton:
      "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 hover:from-amber-400 hover:to-amber-300",
    launchLabel: "Start flash challenge",
    pageBg:
      "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),transparent_30%),linear-gradient(180deg,#eff6ff_0%,#e0f2fe_50%,#dbeafe_100%)]",
    heroClass:
      "overflow-hidden rounded-[30px] border border-sky-200 bg-white shadow-[0_28px_85px_rgba(14,165,233,0.15)]",
    optionSelected:
      "border-amber-300 bg-gradient-to-r from-amber-200/70 to-amber-100/70 text-slate-900 shadow-[0_10px_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-200/80",
    optionIdle:
      "border border-slate-200 bg-white/90 hover:border-sky-300 hover:bg-sky-50 shadow-sm",
    optionBadgeSelected: "bg-amber-500 text-slate-900",
    optionBadgeIdle: "bg-slate-200 text-slate-700",
    headerButton:
      "bg-gradient-to-r from-amber-300 to-amber-200 text-slate-900 hover:from-amber-200 hover:to-amber-100",
  },
  practice: {
    accent: "emerald",
    startPanel:
      "bg-[linear-gradient(135deg,#14532d_0%,#16a34a_42%,#86efac_100%)]",
    startGlow:
      "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(21,128,61,0.24),_transparent_26%)]",
    startChip: "text-emerald-50",
    primaryButton: "bg-emerald-600 hover:bg-emerald-700 shadow-lg",
    launchLabel: "Enter practice mode",
    pageBg:
      "bg-[linear-gradient(180deg,#f8fffe_0%,#f0faf8_50%,#e8f8f5_100%)]",
    heroClass:
      "overflow-hidden rounded-[34px] border border-emerald-200 bg-white shadow-[0_32px_90px_rgba(16,185,129,0.12)]",
    optionSelected:
      "border-emerald-400 bg-gradient-to-r from-emerald-100/80 to-emerald-50/80 text-slate-900 shadow-[0_12px_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-300",
    optionIdle:
      "border border-emerald-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/60 shadow-sm",
    optionBadgeSelected: "bg-emerald-600 text-white",
    optionBadgeIdle: "bg-emerald-100 text-emerald-700",
    headerButton: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg",
  },
};

const FLASH_QUESTION_SECONDS = 10;
const MAX_TAB_VIOLATIONS = 3;
const MAX_FULLSCREEN_EXIT = 2;

export default function ExamAttemptPage({ variant = "standard" }) {
  const { id } = useParams();
  const router = useRouter();
  const theme = THEMES[variant] || THEMES.standard;
  const isFlash = variant === "flash";
  const isPractice = variant === "practice";
  const isStandard = !isFlash && !isPractice;

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
  const [questionTimeLeft, setQuestionTimeLeft] = useState(FLASH_QUESTION_SECONDS);
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
  const streamRef = useRef(null);
  const questionTimesRef = useRef({});
  const activeQuestionRef = useRef({ key: null, startedAt: null });

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    return Promise.resolve();
  }, []);

  const isFullscreen = useCallback(
    () => !!(document.fullscreenElement || document.webkitFullscreenElement),
    []
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/exams/${id}/attempt`);
        const d = await res.json();
        if (!res.ok) {
          throw new Error(d.message || "Unable to load exam attempt");
        }
        setExamName(d.exam_name || "Online Examination");
        setStudentName(d.student_name || "Student");
        setSections(d.sections || []);
        setPattern(d.pattern || { allow_section_switch: 1, allow_review: 1 });
        setAnswers(d.answers || {});
        setTimeLeft(d.timeLeft || 0);
        questionTimesRef.current =
          d.question_times && typeof d.question_times === "object"
            ? d.question_times
            : {};
        if (d.current_section_id) {
          const currentSectionIndex = (d.sections || []).findIndex(
            (section) => section.id === d.current_section_id
          );
          if (currentSectionIndex >= 0) {
            setCurrent({ s: currentSectionIndex, q: 0 });
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const touchQuestionTimer = useCallback((force = false) => {
    if (!started || !sections.length) return;
    const currentSection = sections[current.s];
    const currentQuestion = currentSection?.questions?.[current.q];
    if (!currentSection || !currentQuestion) return;

    const key = `${currentSection.id}-${currentQuestion.id}`;
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

  const getQuestionRemainingAt = useCallback((sectionIndex, questionIndex) => {
    const sectionItem = sections[sectionIndex];
    const questionItem = sectionItem?.questions?.[questionIndex];
    if (!sectionItem || !questionItem) return 0;

    const key = `${sectionItem.id}-${questionItem.id}`;
    let spent = Number(questionTimesRef.current[key] || 0);

    const active = activeQuestionRef.current;
    if (active.key === key && active.startedAt) {
      spent += Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000));
    }

    return Math.max(0, FLASH_QUESTION_SECONDS - spent);
  }, [sections]);

  const findNextFlashQuestionFrom = useCallback((startSectionIndex, startQuestionIndex) => {
    const maxSectionIndex = pattern.allow_section_switch ? sections.length - 1 : current.s;
    for (let s = startSectionIndex; s <= maxSectionIndex; s += 1) {
      const sectionItem = sections[s];
      if (!sectionItem?.questions?.length) continue;
      const qStart = s === startSectionIndex ? startQuestionIndex : 0;
      for (let q = qStart; q < sectionItem.questions.length; q += 1) {
        if (getQuestionRemainingAt(s, q) > 0) {
          return { s, q };
        }
      }
    }
    return null;
  }, [current.s, getQuestionRemainingAt, pattern.allow_section_switch, sections]);

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
    if (!started || isPractice) return;

    const onFsChange = () => {
      if (closingRef.current) return;
      if (!isFullscreen() && !submittedRef.current) {
        setFsViolations((count) => {
          const next = count + 1;
          if (next >= MAX_FULLSCREEN_EXIT) {
            triggerSubmit("FULLSCREEN_EXIT");
          } else {
            alert("Fullscreen is mandatory.");
            setTimeout(requestFullscreen, 300);
          }
          return next;
        });
      }
    };

    const onBlur = () => {
      if (closingRef.current) return;
      if (document.hidden && !submittedRef.current) {
        setTabViolations((count) => {
          const next = count + 1;
          if (next >= MAX_TAB_VIOLATIONS) {
            triggerSubmit("TAB_SWITCH_LIMIT");
          }
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
  }, [isFullscreen, isPractice, requestFullscreen, started]);

  useEffect(() => {
    if (!started || submittedRef.current) return;
    const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!isFlash || !started || submittedRef.current) return;

    const updateCurrentFlashTimer = () => {
      const remaining = getQuestionRemainingAt(current.s, current.q);
      setQuestionTimeLeft(remaining);

      if (remaining > 0) return;

      const nextAvailable = findNextFlashQuestionFrom(current.s, current.q + 1);
      if (nextAvailable) {
        setCurrent(nextAvailable);
        return;
      }

      triggerSubmit("TIME_UP");
    };

    updateCurrentFlashTimer();
    const timer = setInterval(updateCurrentFlashTimer, 300);
    return () => clearInterval(timer);
  }, [
    current.q,
    current.s,
    findNextFlashQuestionFrom,
    getQuestionRemainingAt,
    isFlash,
    started,
  ]);

  useEffect(() => {
    if (timeLeft === 0 && started && !submittedRef.current) {
      triggerSubmit("TIME_UP");
    }
  }, [started, timeLeft]);

  useEffect(() => {
    if (!sections.length) return;
    const currentSection = sections[current.s];
    const currentQuestion = currentSection?.questions?.[current.q];
    if (!currentQuestion) return;
    const key = `${currentSection.id}-${currentQuestion.id}`;
    setVisited((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, [current, sections]);

  useEffect(() => {
    touchQuestionTimer();
  }, [touchQuestionTimer]);

  const totalQuestions = useMemo(
    () => sections.reduce((sum, section) => sum + section.questions.length, 0),
    [sections]
  );

  const answeredCount = useMemo(
    () =>
      Object.values(answers).filter((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value)
      ).length,
    [answers]
  );

  const reviewCount = useMemo(
    () => Object.values(review).filter(Boolean).length,
    [review]
  );

  async function startExam() {
    if (!isPractice) {
      await requestFullscreen();
    }
    // await startWebcam();
    setStarted(true);
  }

  function triggerSubmit(reason) {
    if (submittedRef.current) return;
    submitReasonRef.current = reason;
    setShowForceSubmit(true);
  }

  async function persistAnswer(answerValue) {
    const section = sections[current.s];
    const question = section.questions[current.q];
    const key = `${section.id}-${question.id}`;
    const previousAnswer = answers[key];

    setAnswers((prev) => ({ ...prev, [key]: answerValue }));
    const response = await fetch(`/api/exams/${id}/attempt/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: section.id,
        questionId: question.id,
        answer: answerValue,
        timeLeft,
        questionTimes: getQuestionTimesSnapshot(),
      }),
    });

    if (!response.ok) {
      setAnswers((prev) => {
        const next = { ...prev };
        if (previousAnswer == null || (Array.isArray(previousAnswer) && previousAnswer.length === 0)) {
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
      return;
    }

    if (isFlash && !submittedRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isLastQuestion) {
        setShowSummary(true);
      } else {
        moveNext();
      }
    }
  }

  async function toggleMultiAnswer(optionId) {
    const section = sections[current.s];
    const question = section.questions[current.q];
    const key = `${section.id}-${question.id}`;
    const currentAnswer = Array.isArray(answers[key]) ? answers[key] : [];
    const nextAnswer = currentAnswer.includes(optionId)
      ? currentAnswer.filter((item) => item !== optionId)
      : [...currentAnswer, optionId].sort((a, b) => a - b);

    try {
      await persistAnswer(nextAnswer);
    } catch (error) {
      console.error(error);
      alert("We could not save this response. Please try again.");
    }
  }

  async function clearResponse() {
    try {
      await persistAnswer(question.question_type === "mcq" ? [] : null);
    } catch (error) {
      console.error(error);
      alert("We could not clear this response. Please try again.");
    }
  }

  async function finalSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      }
    } catch (error) {
      console.warn(error);
    }

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
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      }
    } catch (error) {
      console.warn(error);
    }

    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }

    window.open("", "_self");
    window.close();
    router.push("/exams");
  }

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function moveToQuestion(nextQuestion) {
    if (isFlash) {
      const remaining = getQuestionRemainingAt(current.s, nextQuestion);
      if (remaining <= 0) {
        const nextAvailable = findNextFlashQuestionFrom(current.s, nextQuestion + 1);
        if (nextAvailable) {
          setCurrent(nextAvailable);
        }
        return;
      }
    }
    setCurrent((prev) => ({ ...prev, q: nextQuestion }));
  }

  function moveNext() {
    if (isFlash) {
      const nextAvailable = findNextFlashQuestionFrom(current.s, current.q + 1);
      if (nextAvailable) {
        setCurrent(nextAvailable);
        return;
      }
      triggerSubmit("TIME_UP");
      return;
    }

    if (current.q < section.questions.length - 1) {
      moveToQuestion(current.q + 1);
      return;
    }

    if (pattern.allow_section_switch && current.s < sections.length - 1) {
      setCurrent({ s: current.s + 1, q: 0 });
    }
  }

  function moveToSection(sectionIndex) {
    if (!pattern.allow_section_switch && sectionIndex !== current.s) {
      return;
    }
    if (isFlash) {
      const nextAvailable = findNextFlashQuestionFrom(sectionIndex, 0);
      if (nextAvailable) {
        setCurrent(nextAvailable);
      }
      return;
    }
    setCurrent({ s: sectionIndex, q: 0 });
  }

  function toggleReview(questionKey) {
    setReview((prev) => ({ ...prev, [questionKey]: !prev[questionKey] }));
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-3xl items-center justify-center">
          <div className="glass-panel w-full max-w-lg px-6 py-12 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <Shield size={24} />
            </div>
            <p className="font-display text-3xl tracking-[-0.04em] text-slate-950">
              Loading exam engine
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Preparing sections, responses, and secure session controls.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="min-h-[100dvh] px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-3xl items-center justify-center">
          <div className="glass-panel w-full max-w-lg px-6 py-12 text-center">
            <p className="font-display text-3xl tracking-[-0.04em] text-slate-950">
              No questions available
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This assessment does not have any active sections right now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-[100dvh] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className={`relative overflow-hidden rounded-[34px] px-7 py-10 text-white shadow-[0_32px_90px_rgba(15,23,42,0.2)] sm:px-10 lg:px-12 ${theme.startPanel}`}>
            <div className={`absolute inset-0 ${theme.startGlow}`} />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <span className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.startChip}`}>
                  <Shield size={14} />
                  {variant === "flash"
                    ? "Flash response mode"
                    : variant === "practice"
                    ? "Practice workspace"
                    : "Secure exam mode"}
                </span>
                <h1 className="mt-8 font-display text-5xl leading-none tracking-[-0.05em] sm:text-6xl">
                  {examName}
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  {isFlash
                    ? "Step into a rapid-fire challenge with a one-question sprint timer and instant progression."
                    : isPractice
                    ? "Enter a calmer study workspace built for steady solving, softer visuals, and lower pressure."
                    : "Enter a structured assessment workspace with clear hierarchy, proctored controls, and professional exam pacing."}
                </p>
              </div>

              <div className="grid gap-4 pt-10 sm:grid-cols-3">
                <StartFeature
                  icon={<Monitor size={18} />}
                  title="Fullscreen"
                  copy={
                    isPractice
                      ? "Optional in practice mode so learners can stay relaxed while solving."
                      : "Required throughout the attempt for a controlled testing environment."
                  }
                />
                <StartFeature
                  icon={<Clock3 size={18} />}
                  title={isFlash ? "Sprint timer" : "Timed"}
                  copy={
                    isFlash
                      ? "Each question gets its own fast countdown on top of the full exam timer."
                      : "Your session timer begins as soon as the exam launches."
                  }
                />
                <StartFeature
                  icon={<Eye size={18} />}
                  title={isPractice ? "Auto-save" : "Tracked"}
                  copy={
                    isPractice
                      ? "Practice mode keeps saving active without strict fullscreen enforcement or exam-day pressure."
                      : "Tab-switch and fullscreen exits are monitored during the test."
                  }
                />
              </div>
            </div>
          </section>

          <section className="glass-panel flex items-center px-5 py-6 sm:px-8">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <p className="eyebrow">Ready check</p>
                <h2 className="mt-4 font-display text-4xl tracking-[-0.04em] text-slate-950">
                  Start your assessment
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {isFlash
                    ? "Check the sprint setup before opening the live challenge window."
                    : isPractice
                    ? "Review the session details before opening your relaxed practice workspace."
                    : "Verify the session details before entering the structured live exam workspace."}
                </p>
              </div>

              <div className="space-y-4">
                <ReadyCard label="Candidate" value={studentName} />
                <ReadyCard label="Sections" value={`${sections.length}`} />
                <ReadyCard label="Questions" value={`${totalQuestions}`} />
                <ReadyCard label="Timer" value={formatTime(timeLeft)} />
                <ReadyCard
                  label="Navigation"
                  value={pattern.allow_section_switch ? "Flexible" : "Locked"}
                />
              </div>

              <button
                onClick={startExam}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition ${theme.primaryButton}`}
              >
                {theme.launchLabel}
                <ArrowRight size={16} />
              </button>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                {isFlash
                  ? "Flash mode moves quickly. A single choice is saved immediately and the next question appears without waiting."
                  : isPractice
                  ? "Practice mode is relaxed, but responses are still saved continuously while you work."
                  : "Keep this window active. Multiple tab switches or fullscreen exits can end the session automatically."}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const section = sections[current.s];
  const question = section.questions[current.q];
  const questionKey = `${section.id}-${question.id}`;

  const isLastQuestion =
    current.q === section.questions.length - 1 &&
    current.s === sections.length - 1;
  const hasNextFlashQuestion = isFlash
    ? Boolean(findNextFlashQuestionFrom(current.s, current.q + 1))
    : !isLastQuestion;

  return (
    <div className={`h-[100dvh] overflow-hidden px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4 ${theme.pageBg}`}>
      <div className={`${theme.heroClass} flex h-full min-h-0 flex-col`}>
        <header
          className={`border-b px-4 backdrop-blur-xl sm:px-6 lg:px-8 ${
            isFlash
              ? "border-slate-700 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(17,24,39,0.98))] py-2.5"
              : isPractice
              ? "border-emerald-200 bg-gradient-to-r from-white via-emerald-50/60 to-white py-4"
              : "border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] py-4"
          }`}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`data-chip ${
                    isFlash
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : isPractice
                      ? "bg-white/90 text-slate-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {studentName}
                </span>
                {!pattern.allow_section_switch ? (
                  <span className="data-chip border-amber-200 bg-amber-50 text-amber-700">
                    Section switching locked
                  </span>
                ) : null}
              </div>
              <h1
                className={`mt-4 font-display text-3xl tracking-[-0.04em] sm:text-4xl ${
                  isFlash ? "text-white" : "text-slate-950"
                }`}
              >
                {examName}
              </h1>
              <p className={`mt-2 text-sm ${isFlash ? "text-slate-300" : "text-slate-600"}`}>
                Section {current.s + 1} of {sections.length} | Question {current.q + 1} of {section.questions.length}
              </p>
            </div>

            <div className={`flex flex-wrap items-center gap-3 ${isFlash ? "xl:justify-end" : ""}`}>
              {isFlash ? (
                <div
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
                    questionTimeLeft <= 10
                      ? "border-rose-400/40 bg-rose-500/12 text-rose-100"
                      : "border-violet-400/30 bg-violet-500/12 text-violet-100"
                  }`}
                >
                  <Clock3 size={16} />
                  Q {formatTime(questionTimeLeft)}
                </div>
              ) : null}
              <div className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
                timeLeft < 300
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : isFlash
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : isPractice
                  ? "border-emerald-100 bg-white text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}>
                <Clock3 size={16} />
                {formatTime(timeLeft)}
              </div>
              <button
                onClick={() => setShowSummary(true)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${theme.headerButton} ${
                  isFlash ? "shadow-[0_12px_30px_rgba(245,158,11,0.18)]" : ""
                } ${isFlash ? "text-slate-950" : "text-white"}`}
              >
                <CheckCircle2 size={16} />
                Review and submit
              </button>
              <button
                onClick={closeTest}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  isFlash
                    ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <X size={16} />
                Close test
              </button>
            </div>
          </div>
        </header>

        <nav
          className={`border-b px-4 backdrop-blur sm:px-6 lg:px-8 ${
            isFlash
              ? "border-slate-700 bg-slate-950/60 py-2"
              : isPractice
              ? "border-emerald-100 bg-gradient-to-r from-white via-emerald-50/40 to-white py-3"
              : "border-sky-100 bg-sky-50/70 py-3"
          }`}
        >
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((item, index) => {
              const isCurrent = index === current.s;
              const isLocked = !pattern.allow_section_switch && !isCurrent;

              return (
                <button
                  key={item.id}
                  onClick={() => moveToSection(index)}
                  disabled={isLocked}
                  className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    isCurrent
                      ? isFlash
                        ? "bg-amber-300 text-slate-900 shadow-md"
                        : isPractice
                        ? "bg-emerald-600 text-white shadow-lg"
                        : "bg-slate-950 text-white shadow-lg"
                      : isLocked
                      ? isFlash
                        ? "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500"
                        : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                      : isFlash
                      ? "border border-slate-300 bg-white text-slate-700 hover:bg-amber-100"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-sky-50"
                  }`}
                >
                  {item.section_name}
                </button>
              );
            })}
          </div>
        </nav>

        <div className={`grid min-h-0 flex-1 gap-3 overflow-hidden px-2 py-2 ${isFlash ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_340px]"} xl:gap-4 xl:px-3 xl:py-3`}>
          <div className="min-h-0 flex flex-col gap-3 overflow-hidden">
            <div
              className={`glass-panel flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5 lg:p-6 ${
                isFlash
                  ? "border border-amber-200 bg-white/90 text-slate-900 shadow-[0_14px_34px_rgba(251,191,36,0.15)]"
                : isPractice
                  ? "border-emerald-100 bg-white/95"
                  : "border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"
              }`}
            >
              <div className={`flex flex-wrap items-center gap-3 ${isFlash ? "" : isPractice ? "" : "justify-between"}`}>
                <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`data-chip ${
                    isFlash
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : isPractice
                      ? "bg-white/90 text-slate-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  Question {current.q + 1}
                </span>
                <span
                  className={`data-chip ${
                    isFlash
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : isPractice
                      ? "border-slate-200 bg-slate-50 text-slate-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {question.question_type === "mcq"
                    ? "Multiple choice"
                    : "Single choice"}
                </span>
                {review[questionKey] ? (
                  <span className="data-chip border-amber-200 bg-amber-50 text-amber-700">
                    Marked for review
                  </span>
                ) : null}
                {hasAnswer(answers[questionKey], question.question_type) ? (
                  <span className="data-chip border-emerald-200 bg-emerald-50 text-emerald-700">
                    Response saved
                  </span>
                ) : null}
                </div>
                {isStandard ? (
                  <div className="rounded-[24px] border border-sky-100 bg-white px-4 py-3 text-right shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Current section
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {section.section_name}
                    </p>
                  </div>
                ) : null}
              </div>

              {isFlash ? (
                <div className="mt-4 flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
                  <div className="min-h-0 flex flex-col overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
                    <div
                      className="prose max-w-none max-h-[14vh] overflow-y-auto rounded-xl border border-slate-200/40 bg-slate-50 p-3 prose-p:leading-7 prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-img:rounded-2xl prose-img:shadow-md prose-img:max-h-56 prose-img:w-full prose-img:object-cover"
                      dangerouslySetInnerHTML={{ __html: question.question_text || "" }}
                    />
                  </div>
                </div>
              ) : null}

              <div className={`mt-4 min-h-0 flex-1 pr-1 ${isFlash ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
                {!isFlash ? (
                  <div
                    className={`prose max-w-none prose-p:leading-7 prose-img:rounded-2xl prose-img:shadow-md ${
                      isFlash
                        ? "prose-headings:text-white prose-p:text-slate-100 prose-strong:text-white"
                      : "prose-headings:text-slate-950 prose-p:text-slate-800 prose-strong:text-slate-950"
                    }`}
                    dangerouslySetInnerHTML={{ __html: question.question_text || "" }}
                  />
                ) : null}

                {question.question_type === "mcq" ? (
                  <p className={`rounded-2xl px-4 py-3 text-sm ${isFlash ? "mt-3" : "mt-5"} ${
                    isFlash
                      ? "border border-amber-300/30 bg-amber-100/60 text-slate-800"
                    : isPractice
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-sky-200 bg-sky-50 text-sky-800"
                  }`}>
                    Select all correct options before moving ahead.
                  </p>
                ) : null}

                <div className={`${isFlash ? "mt-3 min-h-0 flex-1 overflow-y-auto grid gap-3 pr-1 md:grid-cols-2 content-start" : "mt-5 space-y-3"}`}>

                  {question.options.map((opt, idx) => {
                    const selected = isOptionSelected(
                      answers[questionKey],
                      opt.id,
                      question.question_type
                    );
                    return (
                      <label
                        key={opt.id}
                        className={`block cursor-pointer rounded-[20px] border px-5 py-5 transition-all duration-200 ${
                          selected
                            ? theme.optionSelected
                            : theme.optionIdle
                        } ${isFlash ? "relative overflow-hidden rounded-[18px] px-4 py-2.5 hover:-translate-y-[0.1rem] hover:shadow-[0_8px_22px_rgba(250,180,0,0.2)]" : ""}`}
                      >
                        {isFlash ? (
                          <div className={`absolute inset-y-0 left-0 w-1.5 ${
                            selected ? "bg-amber-400" : "bg-transparent"
                          }`} />
                        ) : null}
                        <div className="flex items-start gap-4">
                          <input
                            type={question.question_type === "mcq" ? "checkbox" : "radio"}
                            className="mt-1 h-4 w-4 accent-sky-600"
                            checked={selected}
                            onChange={() =>
                              question.question_type === "mcq"
                                ? toggleMultiAnswer(opt.id)
                                : saveAnswer(opt.id)
                            }
                          />
                          <div className="flex min-w-0 flex-1 gap-4">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                                selected
                                  ? theme.optionBadgeSelected
                                  : theme.optionBadgeIdle
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="prose max-w-none prose-p:my-1 prose-p:text-slate-700"
                                dangerouslySetInnerHTML={{ __html: opt.option_text || "" }}
                              />
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {isFlash ? (
              <div className="glass-panel border-slate-700 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    disabled={!hasNextFlashQuestion}
                    onClick={moveNext}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ArrowRight size={14} />
                    Next
                  </button>
                  <button
                    onClick={clearResponse}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    <X size={14} />
                    Clear
                  </button>
                  {pattern.allow_review ? (
                    <button
                      onClick={() => toggleReview(questionKey)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        review[questionKey]
                          ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                          : "border border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                      }`}
                    >
                      <Flag size={14} />
                      {review[questionKey] ? "Marked" : "Review"}
                    </button>
                  ) : null}
                  <button
                    onClick={() => setShowSummary(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    <CheckCircle2 size={14} />
                    Submit
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`glass-panel p-5 sm:p-6 ${
                  isPractice
                    ? "border-emerald-200 bg-gradient-to-br from-white via-emerald-50/50 to-white shadow-[0_12px_30px_rgba(16,185,129,0.08)]"
                    : "border-sky-100 bg-gradient-to-br from-white via-sky-50/50 to-white"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <button
                    disabled={current.q === 0}
                    onClick={() => moveToQuestion(current.q - 1)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      isPractice
                        ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                        : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                    }`}
                  >
                    <ArrowLeft size={16} />
                    Previous
                  </button>

                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                    <button
                      onClick={clearResponse}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                        isPractice
                          ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <X size={16} />
                      Clear
                    </button>

                    {pattern.allow_review ? (
                      <button
                        onClick={() => toggleReview(questionKey)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                          review[questionKey]
                            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200"
                            : isPractice
                            ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Flag size={16} />
                        {review[questionKey] ? "Marked" : "Review"}
                      </button>
                    ) : null}

                    <button
                      disabled={isLastQuestion}
                      onClick={moveNext}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45 shadow-lg ${
                        isPractice
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-200"
                          : "bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600"
                      }`}
                    >
                      Save & Next
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isFlash ? (
            <aside className="min-h-0 flex flex-col gap-3 overflow-hidden">
              <div className={`glass-panel flex min-h-0 flex-col p-4 ${isPractice ? "border-emerald-100 bg-white/95" : "border-sky-100 bg-white"}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Question palette
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {isPractice ? "Study navigator" : "Navigator"}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {section.section_name}
                </span>
              </div>

              {isPractice ? (
                <div className="mt-3 rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Gentle progress
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
                      style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-emerald-900">
                    {answeredCount} of {totalQuestions} questions saved
                  </p>
                </div>
              ) : null}

              <div className="mt-4 grid flex-1 auto-rows-min grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 xl:grid-cols-4">
                {section.questions.map((item, index) => {
                  const key = `${section.id}-${item.id}`;
                  let style = isPractice
                    ? "border-emerald-100 bg-white text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500";

                  if (current.q === index) {
                    style = isPractice
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                      : "border-slate-950 bg-slate-950 text-white shadow-lg";
                  } else if (review[key] && hasAnswer(answers[key], item.question_type)) {
                    style = "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-100 ring-2 ring-emerald-300/60";
                  } else if (review[key]) {
                    style = "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-100";
                  } else if (hasAnswer(answers[key], item.question_type)) {
                    style = "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-100";
                  } else if (visited[key]) {
                    style = isPractice
                      ? "border-rose-300 bg-rose-50 text-rose-700 shadow-md shadow-rose-100"
                      : "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-100";
                  }

                  return (
                    <button
                      key={key}
                      onClick={() => moveToQuestion(index)}
                      className={`h-10 rounded-2xl border text-sm font-semibold transition hover:-translate-y-0.5 ${style}`}
                    >
                      {(index + 1).toString().padStart(2, "0")}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <Legend tone="bg-white border border-slate-200" label="Not visited" />
                <Legend tone="bg-rose-500" label="Not answered" />
                <Legend tone="bg-emerald-500" label="Saved" />
                <Legend tone="bg-amber-500" label="Review" />
              </div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      {showSummary ? (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md sm:p-6 ${
          isFlash
            ? "bg-slate-950/70"
            : isPractice
            ? "bg-emerald-950/20"
            : "bg-slate-950/45"
        }`}>
          <div className={`w-full max-w-4xl overflow-hidden rounded-[32px] border ${
            isFlash
              ? "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96))] text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
              : isPractice
              ? "border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f2fff5_100%)] shadow-[0_30px_90px_rgba(34,197,94,0.12)]"
              : "border-sky-100 bg-white shadow-[0_30px_90px_rgba(14,165,233,0.12)]"
          }`}>
            <div className={`px-6 py-6 sm:px-8 ${
              isFlash
                ? "border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_30%),linear-gradient(135deg,rgba(124,45,18,0.35),rgba(15,23,42,0.12))]"
                : isPractice
                ? "border-b border-emerald-100 bg-emerald-50/70"
                : "border-b border-sky-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eff6ff_100%)]"
            }`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                isFlash
                  ? "text-amber-100"
                  : isPractice
                  ? "text-emerald-700"
                  : "text-sky-700"
              }`}>
                {isFlash ? "Sprint review" : isPractice ? "Practice review" : "Submission review"}
              </p>
              <h2 className={`mt-3 font-display text-4xl tracking-[-0.04em] ${
                isFlash ? "text-white" : "text-slate-950"
              }`}>
                {isFlash
                  ? "Finish the challenge strong"
                  : isPractice
                  ? "Review your practice progress"
                  : "Check your progress"}
              </h2>
              <p className={`mt-2 text-sm ${
                isFlash
                  ? "text-slate-300"
                  : isPractice
                  ? "text-emerald-900"
                  : "text-slate-600"
              }`}>
                {isFlash
                  ? "Scan the sprint scoreboard and confirm whether you want to lock in the attempt now."
                  : isPractice
                  ? "Take a calm look at your section-wise progress before you submit or return to solving."
                  : "Review the section-wise breakdown before final submission."}
              </p>
            </div>

            <div className="space-y-8 px-6 py-6 sm:px-8">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryTile label="Attempted" value={answeredCount} tone="emerald" variant={variant} />
                <SummaryTile label="In review" value={reviewCount} tone="amber" variant={variant} />
                <SummaryTile label="Pending" value={totalQuestions - answeredCount} tone="slate" variant={variant} />
              </div>

              {isFlash ? (
                <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Sprint scoreboard
                    </p>
                    <div className="mt-5 grid grid-cols-5 gap-3">
                      {section.questions.map((item, index) => {
                        const key = `${section.id}-${item.id}`;
                        let style = "border-white/10 bg-white/6 text-slate-300";

                        if (current.q === index) {
                          style = "border-amber-400 bg-amber-400 text-slate-950";
                        } else if (review[key] && hasAnswer(answers[key], item.question_type)) {
                          style = "border-amber-400 bg-amber-500 text-slate-950 ring-2 ring-emerald-300/60";
                        } else if (review[key]) {
                          style = "border-amber-400 bg-amber-500 text-slate-950";
                        } else if (hasAnswer(answers[key], item.question_type)) {
                          style = "border-emerald-400 bg-emerald-500 text-white";
                        } else if (visited[key]) {
                          style = "border-rose-400 bg-rose-500 text-white";
                        }

                        return (
                          <div
                            key={key}
                            className={`flex h-12 items-center justify-center rounded-2xl border text-sm font-semibold ${style}`}
                          >
                            {(index + 1).toString().padStart(2, "0")}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Challenge status
                    </p>
                    <div className="mt-5 space-y-3">
                      <FlashMetric label="Current section" value={section.section_name} />
                      <FlashMetric label="Question timer" value={`${questionTimeLeft}s`} />
                      <FlashMetric label="Overall clock" value={formatTime(timeLeft)} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Sectional breakdown
                  </p>
                  {sections.map((item) => {
                    const saved = item.questions.filter((questionItem) =>
                      hasAnswer(
                        answers[`${item.id}-${questionItem.id}`],
                        questionItem.question_type
                      )
                    ).length;
                    const marked = item.questions.filter((questionItem) => review[`${item.id}-${questionItem.id}`]).length;
                    const completion = item.questions.length ? (saved / item.questions.length) * 100 : 0;

                    return (
                      <div key={item.id} className={`rounded-[24px] border px-5 py-5 ${
                        isPractice
                          ? "border-emerald-100 bg-white/80"
                          : "border-slate-200 bg-white"
                      }`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{item.section_name}</p>
                            <p className={`mt-1 text-xs uppercase tracking-[0.2em] ${
                              isPractice ? "text-emerald-700/70" : "text-slate-400"
                            }`}>
                              {saved}/{item.questions.length} saved | {marked} marked for review
                            </p>
                          </div>
                          <div className="w-full sm:w-48">
                            <div className={`h-2 rounded-full ${
                              isPractice ? "bg-emerald-100" : "bg-slate-100"
                            }`}>
                              <div
                                className={`h-full rounded-full ${
                                  isPractice
                                    ? "bg-gradient-to-r from-emerald-500 to-lime-400"
                                    : "bg-gradient-to-r from-sky-500 to-cyan-500"
                                }`}
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`flex flex-col gap-3 px-6 py-6 sm:flex-row sm:px-8 ${
              isFlash
                ? "border-t border-white/10 bg-slate-950/50"
                : isPractice
                ? "border-t border-emerald-100 bg-emerald-50/50"
                : "border-t border-slate-200 bg-white"
            }`}>
              <button
                onClick={() => setShowSummary(false)}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isFlash
                    ? "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                    : isPractice
                    ? "border border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {isFlash ? "Return to sprint" : isPractice ? "Back to practice" : "Resume exam"}
              </button>
              <button
                onClick={finalSubmit}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                  isFlash
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : isPractice
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-950 hover:bg-slate-800"
                }`}
              >
                {isFlash ? "Lock sprint result" : isPractice ? "Submit practice attempt" : "Final submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showClosePrompt ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
            isFlash
              ? "border-white/15 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-900"
          }`}>
            <h3 className="text-xl font-semibold">Close this test window?</h3>
            <p className={`mt-2 text-sm ${isFlash ? "text-slate-300" : "text-slate-600"}`}>
              Timer keeps running until you submit. Closing now will return you to the exam list.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowClosePrompt(false)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isFlash
                    ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmCloseTest}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isFlash
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                Close test
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showForceSubmit ? (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-rose-600 p-8 text-center text-white">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/14">
            <AlertTriangle size={34} />
          </div>
          <h2 className="font-display text-5xl tracking-[-0.04em]">Security termination</h2>
          <p className="mt-4 max-w-xl text-lg text-white/90">
            Reason: {submitReasonRef.current?.replaceAll("_", " ")}
          </p>
          <button
            onClick={finalSubmit}
            className="mt-10 rounded-2xl bg-white px-8 py-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Exit portal
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StartFeature({ icon, title, copy }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
    </div>
  );
}

function hasAnswer(value, questionType) {
  if (questionType === "mcq") {
    return Array.isArray(value) && value.length > 0;
  }

  return value != null && value !== "";
}

function isOptionSelected(answerValue, optionId, questionType) {
  const normalizedType = String(questionType || "").toLowerCase();
  const isMulti =
    normalizedType === "mcq" ||
    normalizedType === "msq" ||
    normalizedType === "multiple" ||
    normalizedType === "multiple_choice";
  const normalizedOptionId = Number(optionId);

  if (isMulti) {
    if (!Array.isArray(answerValue)) return false;
    return answerValue.map((item) => Number(item)).includes(normalizedOptionId);
  }

  return Number(answerValue) === normalizedOptionId;
}

function ReadyCard({ label, value }) {
  return (
    <div className="soft-panel flex items-center justify-between px-4 py-4">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function FlashMetric({ label, value }) {
  return (
    <div className="rounded-[18px] border border-slate-700 bg-slate-900/70 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Legend({ tone, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${tone}`} />
      <span>{label}</span>
    </div>
  );
}

function SummaryTile({ label, value, tone, variant = "standard" }) {
  const tones = {
    standard: {
      emerald: "bg-emerald-50 text-emerald-700",
      amber: "bg-amber-50 text-amber-700",
      slate: "bg-slate-100 text-slate-700",
    },
    flash: {
      emerald: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
      amber: "border border-amber-400/20 bg-amber-500/10 text-amber-100",
      slate: "border border-white/10 bg-white/6 text-slate-100",
    },
    practice: {
      emerald: "border border-emerald-100 bg-emerald-50 text-emerald-700",
      amber: "border border-amber-100 bg-amber-50 text-amber-700",
      slate: "border border-emerald-100 bg-white text-emerald-800",
    },
  };

  return (
    <div className={`rounded-[24px] px-5 py-5 text-center ${tones[variant]?.[tone] || tones.standard[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">{label}</p>
      <p className="mt-2 font-display text-4xl tracking-[-0.04em]">{value}</p>
    </div>
  );
}

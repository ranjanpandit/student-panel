"use client";

import { useEffect, useState } from "react";
import ExamHeader from "./ExamHeader";
import QuestionNavigator from "./QuestionNavigator";
import QuestionPanel from "./QuestionPanel";
import SubmitModal from "./SubmitModal";

export default function StudentExam({ examId, studentId }) {
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState({ section: 0, question: 0 });
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    fetch(`/api/exam/${examId}/attempt`, {
      headers: { "x-student-id": studentId },
    })
      .then((response) => response.json())
      .then((payload) => {
        setData(payload);
        const initialAnswers = JSON.parse(payload.attempt.answers_json || "{}");
        const firstQuestion = payload.sections?.[0]?.questions?.[0];

        if (firstQuestion) {
          initialAnswers[firstQuestion.id] = {
            ...initialAnswers[firstQuestion.id],
            visited: true,
          };
        }

        setAnswers(initialAnswers);
      });
  }, [examId, studentId]);

  if (!data) {
    return <div className="glass-panel p-6 text-sm text-slate-600">Loading exam...</div>;
  }

  const section = data.sections[current.section];
  const question = section.questions[current.question];

  function canSwitchSection(targetIndex) {
    if (data.pattern?.allow_section_switch) return true;
    return targetIndex <= current.section;
  }

  function submitExam() {
    fetch(`/api/exam/${examId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId }),
    }).then(() => {
      window.location.href = `/exam/${examId}/submitted`;
    });
  }

  const totalQuestions = data.sections.reduce(
    (sum, item) => sum + item.questions.length,
    0
  );

  const answeredCount = Object.values(answers).filter(
    (item) => item?.answer?.length
  ).length;

  function markVisited(sectionIndex, questionIndex) {
    const targetQuestion = data.sections[sectionIndex]?.questions[questionIndex];
    if (!targetQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [targetQuestion.id]: {
        ...prev[targetQuestion.id],
        visited: true,
      },
    }));
  }

  function moveTo(sectionIndex, questionIndex) {
    markVisited(sectionIndex, questionIndex);
    setCurrent({ section: sectionIndex, question: questionIndex });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef4fb_100%)]">
      <ExamHeader
        examId={examId}
        studentId={studentId}
        onSubmit={() => setShowSubmit(true)}
        sections={data.sections}
        currentSection={current.section}
        canSwitchSection={canSwitchSection}
        onSectionChange={(index) => moveTo(index, 0)}
      />

      <div className="flex flex-1 flex-col overflow-hidden xl:flex-row">
        <QuestionNavigator
          section={section}
          answers={answers}
          currentQuestion={current.question}
          onJump={(index) => moveTo(current.section, index)}
        />

        <QuestionPanel
          question={question}
          answer={answers[question.id]}
          allowReview={data.pattern?.allow_review}
          onAnswer={(value) =>
            setAnswers({
              ...answers,
              [question.id]: {
                ...answers[question.id],
                answer: value,
              },
            })
          }
          onReviewToggle={() =>
            setAnswers({
              ...answers,
              [question.id]: {
                ...answers[question.id],
                marked_for_review: !answers[question.id]?.marked_for_review,
              },
            })
          }
          onNext={() =>
            moveTo(
              current.section,
              Math.min(current.question + 1, section.questions.length - 1)
            )
          }
          onPrev={() =>
            moveTo(current.section, Math.max(current.question - 1, 0))
          }
        />
      </div>

      <SubmitModal
        open={showSubmit}
        unanswered={totalQuestions - answeredCount}
        onCancel={() => setShowSubmit(false)}
        onConfirm={submitExam}
      />
    </div>
  );
}

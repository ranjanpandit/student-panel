import { Clock3, SendHorizontal } from "lucide-react";
import useExamTimer, { formatTime } from "./useExamTimer";

export default function ExamHeader({
  examId,
  studentId,
  onSubmit,
  sections,
  currentSection,
  canSwitchSection,
  onSectionChange,
}) {
  const seconds = useExamTimer(examId, studentId, onSubmit);

  return (
    <div className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {sections.map((section, index) => (
            <button
              key={section.id}
              disabled={!canSwitchSection(index)}
              onClick={() => onSectionChange(index)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                index === currentSection
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {section.section_name}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <Clock3 size={16} />
            {seconds !== null ? formatTime(seconds) : "--:--:--"}
          </div>
          <button
            onClick={onSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <SendHorizontal size={16} />
            Submit exam
          </button>
        </div>
      </div>
    </div>
  );
}

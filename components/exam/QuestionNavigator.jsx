export default function QuestionNavigator({
  section,
  answers,
  currentQuestion,
  onJump,
}) {
  function status(question) {
    const answer = answers[question.id];
    if (!answer?.visited) return "bg-slate-100 text-slate-500";
    if (answer.marked_for_review && answer.answer) return "bg-amber-500 text-white";
    if (answer.marked_for_review) return "bg-violet-500 text-white";
    if (answer.answer) return "bg-emerald-500 text-white";
    return "bg-sky-500 text-white";
  }

  return (
    <div className="w-full border-b border-slate-200 bg-white/70 p-4 backdrop-blur xl:w-80 xl:border-b-0 xl:border-r">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Navigator
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900">Questions</p>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-5">
        {section.questions.map((question, index) => (
          <button
            key={question.id}
            onClick={() => onJump(index)}
            className={`h-10 rounded-2xl text-sm font-semibold transition ${status(question)} ${
              index === currentQuestion ? "ring-2 ring-slate-950 ring-offset-2 ring-offset-white" : ""
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-600">
        <Legend color="bg-slate-100" label="Not visited" />
        <Legend color="bg-sky-500" label="Visited" />
        <Legend color="bg-emerald-500" label="Answered" />
        <Legend color="bg-violet-500" label="Review" />
        <Legend color="bg-amber-500" label="Answer + review" full />
      </div>
    </div>
  );
}

function Legend({ color, label, full = false }) {
  return (
    <div className={`flex items-center gap-2 ${full ? "col-span-2" : ""}`}>
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

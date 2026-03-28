export default function QuestionPanel({
  question,
  answer,
  allowReview,
  onAnswer,
  onReviewToggle,
  onNext,
  onPrev,
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6">
      <div className="glass-panel p-6 sm:p-7">
        <div
          className="prose max-w-none prose-p:my-2 prose-img:rounded-xl prose-img:shadow-sm"
          dangerouslySetInnerHTML={{
            __html: question.question_text,
          }}
        />

        {question.question_type === "scq" ? (
          <div className="mt-6 space-y-3">
            {question.options.map((option) => {
              const checked = answer?.answer?.[0] === option.id;

              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-[24px] border px-4 py-4 transition ${
                    checked
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    checked={checked}
                    onChange={() => onAnswer([option.id])}
                    className="mt-1"
                  />
                  <span className="text-sm leading-6 text-slate-700">
                    {option.option_text}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={onPrev}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Previous
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            {allowReview ? (
              <button
                onClick={onReviewToggle}
                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Mark for review
              </button>
            ) : null}

            <button
              onClick={onNext}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

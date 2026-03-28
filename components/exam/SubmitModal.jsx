export default function SubmitModal({
  open,
  unanswered,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96">
        <h2 className="font-semibold text-lg mb-2">
          Submit Exam?
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          You have <b>{unanswered}</b> unanswered questions.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="border rounded px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white rounded px-4 py-2"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

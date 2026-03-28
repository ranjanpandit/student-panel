"use client";

import { useEffect, useState } from "react";

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/exams")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        return res.json();
      })
      .then((data) => {
        setExams(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  function renderAction(exam) {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (exam.attempt_status === "submitted") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
          Submitted
        </span>
      );
    }

    if (now < start || now > end) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
          Not Active
        </span>
      );
    }

    if (exam.attempt_status === "in_progress") {
      return (
        <a
          href={`/exams/${exam.id}/instructions`}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:opacity-90"
        >
          Resume Exam
        </a>
      );
    }

    return (
      <a
        href={`/exams/${exam.id}/instructions`}
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:opacity-90"
      >
        Start Exam
      </a>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">My Exams</h1>
        <p className="text-sm text-gray-600 mt-1">
          View and attempt your assigned examinations
        </p>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="text-gray-500">Loading exams…</div>
      ) : exams.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
          No exams available right now
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {exams.map((e) => (
            <div
              key={e.id}
              className="border rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              {/* TOP */}
              <div>
                <p className="font-semibold text-base line-clamp-2">
                  {e.title}
                </p>

                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>⏱ Duration: {e.duration_minutes} minutes</p>
                  <p>
                    🗓 {new Date(e.start_time).toLocaleString()} –{" "}
                    {new Date(e.end_time).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* FOOTER */}
              <div className="mt-5 flex items-center justify-between">
                <StatusBadge exam={e} />
                {renderAction(e)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   STATUS BADGE
========================= */
function StatusBadge({ exam }) {
  if (exam.attempt_status === "submitted") {
    return (
      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
        Submitted
      </span>
    );
  }

  if (exam.attempt_status === "in_progress") {
    return (
      <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
        In Progress
      </span>
    );
  }

  return (
    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
      Not Started
    </span>
  );
}

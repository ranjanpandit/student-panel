import { useEffect, useState } from "react";

export default function useExamTimer(examId, studentId, onExpire) {
  const [seconds, setSeconds] = useState(null);

  useEffect(() => {
    let interval;

    async function sync() {
      const res = await fetch(`/api/exam/${examId}/time`, {
        headers: { "x-student-id": studentId },
      });
      const data = await res.json();

      if (data.expired) {
        onExpire();
        return;
      }

      setSeconds(data.remaining_seconds);
    }

    sync();
    interval = setInterval(sync, 10000); // sync every 10s

    return () => clearInterval(interval);
  }, []);

  // local countdown every second
  useEffect(() => {
    if (seconds === null) return;

    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(t);
          onExpire();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [seconds]);

  return seconds;
}
export function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

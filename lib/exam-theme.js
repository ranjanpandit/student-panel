export const EXAM_THEME_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "medical", label: "Medical" },
  { value: "nta", label: "NTA" },
  { value: "flash", label: "Flash" },
  { value: "practice", label: "Practice" },
];

export function normalizeExamTheme(theme) {
  const value = String(theme || "standard").toLowerCase();
  return EXAM_THEME_OPTIONS.some((item) => item.value === value)
    ? value
    : "standard";
}

export function getStudentAttemptPath(examId, theme) {
  const normalizedTheme = normalizeExamTheme(theme);

  if (normalizedTheme === "medical") {
    return `/exams/${examId}/medical/attempt`;
  }

  if (normalizedTheme === "nta") {
    return `/exams/${examId}/NTA/attempt`;
  }

   if (normalizedTheme === "flash") {
    return `/exams/${examId}/flash/attempt`;
  }

  if (normalizedTheme === "practice") {
    return `/exams/${examId}/practice/attempt`;
  }

  return `/exams/${examId}/attempt`;
}

export function getThemePresentation(theme) {
  const normalizedTheme = normalizeExamTheme(theme);

  return (
    EXAM_THEME_OPTIONS.find((item) => item.value === normalizedTheme) ||
    EXAM_THEME_OPTIONS[0]
  );
}

// Day offsets (from the plan start date) for a 5-day exam cycle.
// 1 subject  -> [0]
// 2 subjects -> [0, 4]        (first day and last day)
// 3 subjects -> [0, 2, 4]     (exam, off, exam, off, exam)
// 4 subjects -> [0, 1, 3, 4]  (one day off in the middle)
// 5 subjects -> [0, 1, 2, 3, 4]
// more than 5 -> one exam per consecutive day
export const CYCLE_DAYS = 5;

export const examOffsets = (count: number): number[] => {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count > CYCLE_DAYS) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: count }, (_, i) =>
    Math.round((i * (CYCLE_DAYS - 1)) / (count - 1))
  );
};

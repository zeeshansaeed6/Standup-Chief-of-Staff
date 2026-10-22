/**
 * Small robust natural language date parser for snooze commands.
 * Handles phrases like "tomorrow", "friday", "next week", "in 3 days", ISO dates, etc.
 */
export function parseNaturalDate(input: string, referenceDate: Date = new Date()): Date {
  const trimmed = input.trim().toLowerCase();

  // 1. Try standard ISO/Date parse
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const base = new Date(referenceDate);

  // 2. Relative words
  if (trimmed === "today" || trimmed === "eod" || trimmed === "end of day" || trimmed === "tonight") {
    base.setHours(18, 0, 0, 0);
    if (base.getTime() <= referenceDate.getTime()) {
      base.setDate(base.getDate() + 1);
    }
    return base;
  }

  if (trimmed === "tomorrow") {
    base.setDate(base.getDate() + 1);
    base.setHours(9, 0, 0, 0);
    return base;
  }

  if (trimmed === "next week") {
    // Next Monday at 09:00
    const day = base.getDay();
    const daysUntilMonday = (8 - day) % 7 || 7;
    base.setDate(base.getDate() + daysUntilMonday);
    base.setHours(9, 0, 0, 0);
    return base;
  }

  // 3. Days of the week (e.g. "friday", "next friday", "until friday")
  const cleaned = trimmed.replace(/^until\s+/, "").replace(/^this\s+/, "");
  const weekdays: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  const isNext = cleaned.startsWith("next ");
  const dayStr = isNext ? cleaned.replace("next ", "") : cleaned;

  if (dayStr in weekdays) {
    const targetDay = weekdays[dayStr];
    let diff = (targetDay - base.getDay() + 7) % 7;
    if (diff === 0 || isNext) {
      diff += 7;
    }
    base.setDate(base.getDate() + diff);
    base.setHours(9, 0, 0, 0);
    return base;
  }

  // 4. "in X days" / "in X hours" / "in X weeks"
  const inMatch = cleaned.match(/^in\s+(\d+)\s*(hour|hours|day|days|week|weeks)$/);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    if (unit.startsWith("hour")) {
      base.setHours(base.getHours() + amount);
      return base;
    } else if (unit.startsWith("day")) {
      base.setDate(base.getDate() + amount);
      base.setHours(9, 0, 0, 0);
      return base;
    } else if (unit.startsWith("week")) {
      base.setDate(base.getDate() + amount * 7);
      base.setHours(9, 0, 0, 0);
      return base;
    }
  }

  // Fallback: 24 hours from reference date at 09:00
  base.setDate(base.getDate() + 1);
  base.setHours(9, 0, 0, 0);
  return base;
}

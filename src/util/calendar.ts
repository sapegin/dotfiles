/**
 * Orthodox Pascha (Easter Sunday) on the Gregorian calendar.
 *
 * Uses the Julian Easter algorithm (Meeus): `a`–`e` derive the Julian paschal
 * month/day from the year; the result is shifted by 13 days to Gregorian
 * (typical 20th–21st century). Edge branches handle Julian dates that would
 * fall on 24–25 April.
 */
export function getOrthodoxPaschaSunday(year: number): Temporal.PlainDate {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const d = (19 * a + 15) % 30;
  const e = (2 * b + 4 * c + 6 * d + 6) % 7;

  let month = 3;
  let day = 22 + d + e;

  if (d === 29 && e === 6) {
    month = 4;
    day = 18;
  } else if (d === 28 && e === 6) {
    month = 4;
    day = 25;
  } else if (day > 31) {
    month = 4;
    day -= 31;
  }

  return Temporal.PlainDate.from({ year, month, day }).add({ days: 13 });
}

/**
 * Forgiveness Sunday (last Maslenitsa Sunday), Gregorian — 49 days before
 * Pascha.
 */
export function getMaslenitsaSunday(year: number): Temporal.PlainDate {
  return getOrthodoxPaschaSunday(year).subtract({ days: 49 });
}

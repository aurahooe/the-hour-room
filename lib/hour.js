export function hourKey(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 13);
}

export function msUntilNextHour(date = new Date()) {
  const d = new Date(date);
  const next = new Date(d);
  next.setMinutes(60, 0, 0);
  return next.getTime() - d.getTime();
}

export function formatSlot(isoHour) {
  const d = new Date(isoHour.includes("T") ? isoHour + ":00:00.000Z" : isoHour);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false
  }).format(d) + " UTC";
}

export const EDITORIALS = [
  ["The room is quiet.", "Someone left a window open. The hour notices."],
  ["Ink before noon.", "A public slip is pulled from the drawer and set under glass."],
  ["The ledger turns.", "Private work stays private. The public page is for the street."],
  ["Paper has a grain.", "We do not sand it down. The hour keeps whatever you marked public."],
  ["A small ceremony.", "Every sixty minutes the glass is wiped and a new piece is set."],
  ["No algorithm, just a clock.", "If there are public slips, one of them sits in the frame."],
  ["Hands, not feeds.", "Write something you would leave on a kitchen table."],
  ["The hour is the editor.", "It does not ask permission. It only reads what you made public."]
];

export function editorialFor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) >>> 0;
  return EDITORIALS[h % EDITORIALS.length];
}

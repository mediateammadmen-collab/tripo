// Line icons used across the app. <Icon name="mic" size={16} />

const P = {
  menu: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>,
  userPlus: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></>,
  back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
  wave: <><line x1="4" y1="10" x2="4" y2="14" /><line x1="8" y1="6" x2="8" y2="18" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="16" y1="7" x2="16" y2="17" /><line x1="20" y1="10" x2="20" y2="14" /></>,
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />,
  headset: <><path d="M3 18v-6a9 9 0 0118 0v6" /><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" /></>,
  mic: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>,
  micRound: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 01-14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" /></>,
  send: <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>,
  pin: <><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  chat: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  spark: <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4z" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.4.3.5.7.5 1.1v.5h6v-.5c0-.4.1-.8.5-1.1A6 6 0 0012 3z" />,
  suitcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="3" y1="13" x2="21" y2="13" /></>,
  user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  chevRight: <polyline points="9 18 15 12 9 6" />,
  chevDown: <polyline points="6 9 12 15 18 9" />,
  x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  bed: <><path d="M2 20V8" /><path d="M2 12h20v8" /><path d="M22 16H2" /><path d="M6 12V9h5a3 3 0 013 3" /></>,
  swap: <><path d="M7 16V4M3 8l4-4 4 4" /><path d="M17 8v12M21 16l-4 4-4-4" /></>,
  ext: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
  ticks: <><path d="M1 5.5l3 3 6-7" /><path d="M6 5.5l3 3 6-7" /></>,
  speaker: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.5 8.5a5 5 0 010 7" /><path d="M19 5a10 10 0 010 14" /></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="10" /><line x1="10" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="14" y2="10" /><line x1="18" y1="10" x2="18" y2="10" /><line x1="7" y1="14" x2="17" y2="14" /></>,
  target: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15 15 0 010 20 15 15 0 010-20z" /></>,
  pencil: <path d="M9 20l-5.5 2 2-6L17 4l4 4L9.5 20z" />,
  box: <><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><line x1="3.3" y1="8.5" x2="12" y2="13" /><line x1="20.7" y1="8.5" x2="12" y2="13" /><line x1="12" y1="13" x2="12" y2="22" /></>,
  house: <><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></>,
};

// Solid (filled) icons.
const SOLID = {
  plane: <path d="M21 16v-2l-8-5V4a1.5 1.5 0 00-3 0v5l-8 5v2l8-2.5V19l-2.5 1.5V22l4-1 4 1v-1.5L13 19v-5.5z" />,
  sparkSolid: <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4z" />,
  whatsapp: <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z" />,
};

export default function Icon({ name, size = 20, sw = 2, color, fill, style, className, id }) {
  const common = { width: size, height: size, style, className, id, "aria-hidden": true };
  if (SOLID[name]) {
    return (
      <svg {...common} viewBox="0 0 24 24" fill={fill || color || "currentColor"}>
        {SOLID[name]}
      </svg>
    );
  }
  const vb = name === "ticks" ? "0 0 16 11" : "0 0 24 24";
  return (
    <svg {...common} viewBox={vb} fill={fill || "none"} stroke={color || "currentColor"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}

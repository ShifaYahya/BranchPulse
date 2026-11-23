import type { DriverKey } from '../lib/engine';
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p });

export const IUsers = (p: P) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.7 2.8 2.4 3 5.2" /></svg>);
export const IBox = (p: P) => (<svg {...base(p)}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></svg>);
export const IClock = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>);
export const IChat = (p: P) => (<svg {...base(p)}><path d="M4 5.5h16v10H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></svg>);
export const IMap = (p: P) => (<svg {...base(p)}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>);
export const IHelp = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .9-1 1.6v.4M12 16.8v.2" /></svg>);
export const IChart = (p: P) => (<svg {...base(p)}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>);
export const IUpload = (p: P) => (<svg {...base(p)}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4 15v4.5h16V15" /></svg>);
export const IDownload = (p: P) => (<svg {...base(p)}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4 15v4.5h16V15" /></svg>);
export const ICheck = (p: P) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const IX = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IPlus = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const ITrash = (p: P) => (<svg {...base(p)}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></svg>);
export const IPrint = (p: P) => (<svg {...base(p)}><path d="M7 9V3.5h10V9M7 17H4.5V9.5h15V17H17" /><path d="M7 14h10v6.5H7z" /></svg>);
export const ICopy = (p: P) => (<svg {...base(p)}><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" /></svg>);
export const ISpark = (p: P) => (<svg {...base(p)}><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.9L12 18.5l-1.8-5.8-5.7-1.9L10.2 9z" /><path d="M19 3.5v3M17.5 5h3" /></svg>);
export const IArrow = (p: P) => (<svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const IShield = (p: P) => (<svg {...base(p)}><path d="M12 3.5 19.5 6v6c0 4.4-3.2 7.6-7.5 8.5-4.3-.9-7.5-4.1-7.5-8.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>);
export const IFile = (p: P) => (<svg {...base(p)}><path d="M6 3.5h8l4.5 4.5v12.5H6z" /><path d="M14 3.5V8h4.5M9 13h6M9 16.5h6" /></svg>);
export const IAlert = (p: P) => (<svg {...base(p)}><path d="M12 4 21 19.5H3z" /><path d="M12 10v4.5M12 17.2v.2" /></svg>);
export const IMenu = (p: P) => (<svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const ISearch = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>);
export const ILayers = (p: P) => (<svg {...base(p)}><path d="M12 4 21 9l-9 5-9-5z" /><path d="m3 14 9 5 9-5" /></svg>);
export const ITarget = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></svg>);
export const ICompare = (p: P) => (<svg {...base(p)}><path d="M8 4v16M16 4v16M4 8h4M16 12h4M4 14h4M16 17h4" /></svg>);
export const ISettings = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></svg>);
export const IQuestion = IHelp;

export const DRIVER_ICON: Record<DriverKey, (p: P) => JSX.Element> = {
  staffing: IUsers,
  stock: IBox,
  hours: IClock,
  events: IMap,
  feedback: IChat,
  unexplained: IHelp,
};

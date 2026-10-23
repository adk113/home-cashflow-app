export interface ThemePalette {
  // Base backgrounds
  background: string;
  surface: string;
  card: string;
  cardBorder: string;
  cardMuted: string;
  overlay: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Brand / Accents
  primary: string;
  primaryMuted: string;
  primaryText: string;

  // Accounting Flow Indicators
  inflow: string;
  inflowBg: string;
  outflow: string;
  outflowBg: string;
  neutral: string;

  // Cash Flow Activities
  operating: string;
  operatingBg: string;
  investing: string;
  investingBg: string;
  financing: string;
  financingBg: string;

  // Interactive & Forms
  divider: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
}

export const DarkTheme: ThemePalette = {
  // Base backgrounds
  background: '#0B0F19',
  surface: '#151E2E',
  card: '#1E293B',
  cardBorder: '#334155',
  cardMuted: '#0F172A',
  overlay: 'rgba(0, 0, 0, 0.75)',

  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Brand / Accents
  primary: '#38BDF8',
  primaryMuted: 'rgba(56, 189, 248, 0.15)',
  primaryText: '#0B0F19',

  // Accounting Flow Indicators
  inflow: '#10B981', // Emerald
  inflowBg: 'rgba(16, 185, 129, 0.14)',
  outflow: '#F43F5E', // Rose
  outflowBg: 'rgba(244, 63, 94, 0.14)',
  neutral: '#94A3B8',

  // Cash Flow Activities
  operating: '#10B981',
  operatingBg: 'rgba(16, 185, 129, 0.15)',
  investing: '#8B5CF6',
  investingBg: 'rgba(139, 92, 246, 0.15)',
  financing: '#F59E0B',
  financingBg: 'rgba(245, 158, 11, 0.15)',

  // Interactive
  divider: '#1E293B',
  inputBg: '#1E293B',
  inputBorder: '#334155',
  placeholder: '#64748B',
};

export const LightTheme: ThemePalette = {
  // Base backgrounds
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',    // Crisp white
  card: '#FFFFFF',       // Clean white elevated card
  cardBorder: '#E2E8F0', // Slate 200 border
  cardMuted: '#F1F5F9',  // Slate 100 muted container
  overlay: 'rgba(15, 23, 42, 0.45)',

  // Typography
  textPrimary: '#0F172A',   // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8',     // Slate 400

  // Brand / Accents
  primary: '#0284C7',       // Sky 600
  primaryMuted: 'rgba(2, 132, 199, 0.12)',
  primaryText: '#FFFFFF',

  // Accounting Flow Indicators
  inflow: '#059669', // Emerald 600
  inflowBg: 'rgba(5, 150, 105, 0.12)',
  outflow: '#E11D48', // Rose 600
  outflowBg: 'rgba(225, 29, 72, 0.12)',
  neutral: '#64748B',

  // Cash Flow Activities
  operating: '#059669',
  operatingBg: 'rgba(5, 150, 105, 0.12)',
  investing: '#7C3AED', // Violet 600
  investingBg: 'rgba(124, 58, 237, 0.12)',
  financing: '#D97706', // Amber 600
  financingBg: 'rgba(217, 119, 6, 0.12)',

  // Interactive
  divider: '#E2E8F0',
  inputBg: '#F1F5F9',
  inputBorder: '#CBD5E1',
  placeholder: '#94A3B8',
};

// Backwards-compatible default export
export const Colors = DarkTheme;

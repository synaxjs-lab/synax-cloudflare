import { ProfessionalLogo } from '../types';

export const DEFAULT_LOGOS: ProfessionalLogo[] = [
  {
    id: 'astral_crest',
    name: 'Astral Crest',
    accentColor: '#6366f1', // Indigo
    glowColor: 'rgba(99, 102, 241, 0.4)',
    svgPath: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z'
  },
  {
    id: 'lunar_chrono',
    name: 'Lunar Chrono',
    accentColor: '#ec4899', // Rose/Pink
    glowColor: 'rgba(236, 72, 153, 0.4)',
    svgPath: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'
  },
  {
    id: 'solaris_prism',
    name: 'Solaris Prism',
    accentColor: '#38bdf8', // Sky Cyan
    glowColor: 'rgba(56, 189, 248, 0.4)',
    svgPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'
  },
  {
    id: 'cyber_nexus',
    name: 'Cyber Nexus',
    accentColor: '#10b981', // Emerald
    glowColor: 'rgba(16, 185, 129, 0.4)',
    svgPath: 'M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2zm0 3.8L6.5 8.9v6.2L12 18.2l5.5-3.1V8.9L12 5.8z'
  },
  {
    id: 'valkyrie_wings',
    name: 'Valkyrie Wings',
    accentColor: '#f59e0b', // Amber
    glowColor: 'rgba(245, 158, 11, 0.4)',
    svgPath: 'M12 2L3 9l9 13 9-13-9-7zm0 4.5l5 3.9-5 7.2-5-7.2 5-3.9z'
  },
  {
    id: 'ethereal_lotus',
    name: 'Ethereal Sigil',
    accentColor: '#a855f7', // Purple
    glowColor: 'rgba(168, 85, 247, 0.4)',
    svgPath: 'M12 2c2.5 4 6 7.5 6 10a6 6 0 0 1-12 0c0-2.5 3.5-6 6-10zm0 4.5C10.5 8.5 8 10.5 8 12a4 4 0 0 0 8 0c0-1.5-2.5-3.5-4-5.5z'
  }
];

export const PRESET_LOGOS = DEFAULT_LOGOS;

export const DEFAULT_PERSON_1_LOGO: ProfessionalLogo = {
  id: 'astral_crest',
  name: 'Astral Crest',
  accentColor: '#6366f1',
  glowColor: 'rgba(99, 102, 241, 0.5)',
  svgPath: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z'
};

export const DEFAULT_PERSON_2_LOGO: ProfessionalLogo = {
  id: 'lunar_chrono',
  name: 'Lunar Chrono',
  accentColor: '#ec4899',
  glowColor: 'rgba(236, 72, 153, 0.5)',
  svgPath: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'
};

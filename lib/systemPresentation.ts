import { Colors } from '@/constants/theme';
import type { GameSystemId } from '@/lib/gameSystems';

type SystemPalette = {
  headerBackground: string;
  headerBorder: string;
  tabBackground: string;
  pageTint: string;
  heroSurface: string;
  heroBorder: string;
  panelSurface: string;
  panelMuted: string;
  panelAccent: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  chipSurface: string;
  chipBorder: string;
};

export type SystemPresentation = {
  modeLabel: string;
  posterLabel: string;
  heroTags: string[];
  panelLabel: string;
  palette: SystemPalette;
};

const SYSTEM_PRESENTATIONS: Record<GameSystemId, SystemPresentation> = {
  homebrew: {
    modeLabel: 'Original Fantasy',
    posterLabel: 'Worldbuilder Workshop',
    heroTags: ['Original world lore', 'Flexible progression', 'Table-ready hooks'],
    panelLabel: 'Field Notes',
    palette: {
      headerBackground: '#13192a',
      headerBorder: '#2d4960',
      tabBackground: '#11182a',
      pageTint: '#132033',
      heroSurface: '#1a2a3b',
      heroBorder: '#355672',
      panelSurface: '#172235',
      panelMuted: '#132031',
      panelAccent: '#20364a',
      accent: '#7dd3c7',
      accentSoft: 'rgba(125, 211, 199, 0.16)',
      accentText: '#d5fff9',
      chipSurface: '#183245',
      chipBorder: '#3c6d88',
    },
  },
  dnd5e: {
    modeLabel: '5e SRD Campaign',
    posterLabel: 'Dungeon Master Atlas',
    heroTags: ['Species & backgrounds', 'Magic items & hoards', 'Dungeon & travel prep'],
    panelLabel: 'DM Notes',
    palette: {
      headerBackground: '#1a1110',
      headerBorder: '#614036',
      tabBackground: '#140d0d',
      pageTint: '#1a1110',
      heroSurface: '#241614',
      heroBorder: '#815642',
      panelSurface: '#1a1314',
      panelMuted: '#151012',
      panelAccent: '#241816',
      accent: '#d97706',
      accentSoft: 'rgba(217, 119, 6, 0.16)',
      accentText: '#ffe7c2',
      chipSurface: '#251a17',
      chipBorder: '#7c4d24',
    },
  },
  pathfinder2e: {
    modeLabel: 'Scenario Planning',
    posterLabel: 'Campaign Tactics Ledger',
    heroTags: ['Severity-aware fights', 'Level-banded prep', 'Scenario structure'],
    panelLabel: 'Scenario Notes',
    palette: {
      headerBackground: '#1d1215',
      headerBorder: '#6a353f',
      tabBackground: '#170d10',
      pageTint: '#1a1013',
      heroSurface: '#26171b',
      heroBorder: '#7f3f4b',
      panelSurface: '#191116',
      panelMuted: '#141016',
      panelAccent: '#24141a',
      accent: '#f87171',
      accentSoft: 'rgba(248, 113, 113, 0.16)',
      accentText: '#ffe1e1',
      chipSurface: '#24161a',
      chipBorder: '#79414c',
    },
  },
};

export function getSystemPresentation(systemId: GameSystemId): SystemPresentation {
  return SYSTEM_PRESENTATIONS[systemId];
}

export function getSystemAccentColor(systemId: GameSystemId) {
  return SYSTEM_PRESENTATIONS[systemId].palette.accent;
}

export function getSystemTextColor() {
  return Colors.text;
}

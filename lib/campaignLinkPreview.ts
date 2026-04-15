import type { GameSystemId } from '@/lib/gameSystems';

export type CampaignLinkPreviewTool = 'xp' | 'encounter' | 'loot' | 'quest';

type CampaignLinkPreview = {
  title: string;
  body: string;
  bullets: string[];
};

export const NO_CAMPAIGN_OPTION_LABEL = 'No Campaign';
const CAMPAIGN_PREVIEW_TITLE = 'What adding this to a campaign unlocks';

function getHomebrewPreview(tool: CampaignLinkPreviewTool): CampaignLinkPreview {
  switch (tool) {
    case 'xp':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, this planner stops being a loose draft and becomes part of one shared homebrew campaign binder.',
        bullets: [
          'Carry the campaign thread and current objective into your progression pacing.',
          'Keep milestone or XP planning aligned with one setting-wide adventure arc.',
          'Save advancement beats back into a reusable campaign binder instead of scattered notes.',
        ],
      };
    case 'encounter':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, battle prep can pull from the same campaign pressure that drives the rest of your homebrew world.',
        bullets: [
          'Start from one party context instead of rebuilding assumptions on every encounter draft.',
          'Track NPC or faction pressure as part of the same campaign thread after the fight lands.',
          'Keep battlefield prep, fallout, and save history attached to one campaign binder.',
        ],
      };
    case 'loot':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, generated rewards can stop being one-off rolls and start feeding a real campaign ledger.',
        bullets: [
          'Push treasure, coin, and item ideas into the same campaign stash instead of a separate draft.',
          'Keep reward tone aligned with the campaign frame already driving your prep.',
          'Build a campaign reward history that can be referenced from future sessions.',
        ],
      };
    case 'quest':
    default:
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, quest seeds become connected campaign prep instead of standalone prompts.',
        bullets: [
          'Pull the active objective and main faction into new adventure hooks.',
          'Keep fallout, stakes, and future leads tied to one campaign storyline.',
          'Turn quick quest drafts into saved prep that stays readable across sessions.',
        ],
      };
  }
}

function getDndPreview(tool: CampaignLinkPreviewTool): CampaignLinkPreview {
  switch (tool) {
    case 'xp':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, the D&D advancement planner starts from the live campaign instead of a blank sheet.',
        bullets: [
          'Pull average party level, tier of play, and the current campaign objective straight into the plan.',
          'Keep milestone or XP pacing aligned with the same D&D campaign binder as your encounters and adventures.',
          'Save advancement beats back into one homebrew campaign binder instead of separate planner drafts.',
        ],
      };
    case 'encounter':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, encounter prep becomes part of the campaign binder instead of a disconnected battle sketch.',
        bullets: [
          'Start from the live party mix, class spread, and active D&D threat pressure already tracked in campaign prep.',
          'Write NPC pressure, faction fallout, and threat clocks back into the campaign after a battle plan is saved.',
          'Keep monster-lineup language, stakes, and saved battle plans tied to the same D&D homebrew campaign.',
        ],
      };
    case 'loot':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, treasure design can feed the actual D&D party ledger instead of ending as a generated result card.',
        bullets: [
          'Post coin into the treasury and promote items straight into shared inventory or a named party sheet.',
          'Use party context and attunement pressure to suggest who the reward is really for.',
          'Keep treasure history, item flow, and campaign rewards inside one D&D campaign binder.',
        ],
      };
    case 'quest':
    default:
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, adventure seeds can start from the campaign state already living in your D&D campaign binder.',
        bullets: [
          'Pull the patron, current objective, and NPC web into the next quest frame automatically.',
          'Keep faction fallout and follow-up hooks connected to the same campaign storyline.',
          'Turn one-off quest ideas into saved D&D prep that stays readable between sessions.',
        ],
      };
  }
}

function getPf2Preview(tool: CampaignLinkPreviewTool): CampaignLinkPreview {
  switch (tool) {
    case 'xp':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, advancement planning can stay tied to the same PF2e scenario flow as the rest of your prep.',
        bullets: [
          'Carry the campaign tier and current objective into the progression setup.',
          'Keep pacing aligned with the same scenario pressure driving the rest of your prep.',
          'Save advancement plans back into one PF2e campaign binder instead of isolated drafts.',
        ],
      };
    case 'encounter':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, encounter design can start from the campaign frame instead of rebuilding context every time.',
        bullets: [
          'Use one campaign-backed scenario context for party pressure, role coverage, and tactical fallout.',
          'Keep encounter saves tied to the same PF2e campaign binder as your larger prep thread.',
          'Feed escalation and aftermath back into the campaign instead of leaving fights isolated.',
        ],
      };
    case 'loot':
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, reward planning can stay synchronized with the campaign that will actually hand it out.',
        bullets: [
          'Keep item ideas, payout pressure, and reward summaries inside one scenario-ready campaign binder.',
          'Tie generated rewards back to the same prep thread that produced the encounter and quest pressure.',
          'Build a cleaner reward history instead of standalone loot drafts.',
        ],
      };
    case 'quest':
    default:
      return {
        title: CAMPAIGN_PREVIEW_TITLE,
        body: 'On Pro, quest prep can draw from the same faction and scenario context driving your campaign.',
        bullets: [
          'Pull current objectives and faction motion into the next adventure setup.',
          'Keep fallout and future hooks aligned with one PF2e campaign thread.',
          'Turn fast quest drafts into saved prep that reads like one authored campaign.',
        ],
      };
  }
}

export function getCampaignLinkPreview(
  tool: CampaignLinkPreviewTool,
  systemId: GameSystemId
): CampaignLinkPreview {
  if (systemId === 'dnd5e') {
    return getDndPreview(tool);
  }

  if (systemId === 'pathfinder2e') {
    return getPf2Preview(tool);
  }

  return getHomebrewPreview(tool);
}

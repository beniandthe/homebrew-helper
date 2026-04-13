import { Platform } from 'react-native';
import { hasNativeBillingConfig } from '@/lib/billingConfig';

type UpsellCopy = {
  title: string;
  message: string;
  buttonLabel: string;
};

type CampaignLinkUpsellCopy = UpsellCopy & {
  lockedTitle: string;
  lockedMessage: string;
};

type HomeUpgradeCopy = {
  label: string;
  title: string;
  text: string;
  buttonLabel: string;
};

type LandingPricingCopy = {
  heading: string;
  body: string;
  proLabel: string;
  proDescription: string;
  proBullets: string[];
  footer: string;
  buttonLabel: string;
};

export const isNativePlanPreview = Platform.OS !== 'web' && !hasNativeBillingConfig();

export function getHeaderPlanLabel() {
  return isNativePlanPreview ? 'Plans' : 'Upgrade';
}

export function getPlanActionLabel() {
  return isNativePlanPreview ? 'View Plans' : 'Upgrade to Pro';
}

export function getPlanSummaryCopy(savedProjectCount: number, maxFreeSaves: number, isPro: boolean) {
  if (isPro) {
    return 'Pro plan active. Unlimited saves are available to your account.';
  }

  if (isNativePlanPreview) {
    return `Mobile beta is currently on the free plan. You have used ${savedProjectCount}/${maxFreeSaves} saved projects.`;
  }

  return `Free plan active. You have used ${savedProjectCount}/${maxFreeSaves} saved projects.`;
}

export function getFreeLimitUpsell(maxFreeSaves: number): UpsellCopy {
  if (isNativePlanPreview) {
    return {
      title: 'Free limit reached in mobile beta',
      message: `You have used all ${maxFreeSaves} free saves. Native Pro subscriptions are coming in a later mobile release.`,
      buttonLabel: 'View Plans',
    };
  }

  return {
    title: 'Free plan limit reached',
    message: `You have used all ${maxFreeSaves} free saves. Upgrade to Pro to create additional projects.`,
    buttonLabel: 'Upgrade to Pro',
  };
}

export function getCampaignHubUpsell(): UpsellCopy {
  if (isNativePlanPreview) {
    return {
      title: 'Campaign Hub is coming to mobile Pro',
      message: 'Core tools and save management are ready on mobile. Campaign Hub will unlock once native Pro subscriptions are added.',
      buttonLabel: 'View Plans',
    };
  }

  return {
    title: 'Campaign Hub is Pro-only',
    message: 'Upgrade to Pro to build campaign workspaces, link saved tool projects, and manage prep in one place.',
    buttonLabel: 'Upgrade to Pro',
  };
}

export function getCampaignLinkUpsell(toolName: string): CampaignLinkUpsellCopy {
  if (isNativePlanPreview) {
    return {
      title: 'View Plans',
      message: 'Campaign linking will arrive with native Pro subscriptions.',
      buttonLabel: 'View Plans',
      lockedTitle: 'Coming soon on mobile',
      lockedMessage: `${toolName} can be linked into Campaign Hub once native Pro subscriptions are added.`,
    };
  }

  return {
    title: 'Get Pro',
    message: 'Upgrade to Pro to organize XP, encounters, loot, and quests inside a shared campaign workspace.',
    buttonLabel: 'Get Pro',
    lockedTitle: 'Pro only',
    lockedMessage: `${toolName} can be linked into a Campaign Hub workspace on Pro.`,
  };
}

export function getHomeUpgradeCopy(maxFreeSaves: number): HomeUpgradeCopy {
  if (isNativePlanPreview) {
    return {
      label: 'Mobile beta',
      title: 'Core tools are live on mobile.',
      text: `Use the free toolkit and up to ${maxFreeSaves} saved projects on your phone today. Native Pro subscriptions and Campaign Hub are coming in a later mobile release.`,
      buttonLabel: 'View Plans',
    };
  }

  return {
    label: 'Upgrade to Pro',
    title: 'Unlock the full guild.',
    text: `Remove the ${maxFreeSaves}-project limit and keep unlimited campaigns, encounters, treasure sets, and quest concepts.`,
    buttonLabel: 'View Plans',
  };
}

export function getLandingPricingCopy(maxFreeSaves: number): LandingPricingCopy {
  if (isNativePlanPreview) {
    return {
      heading: 'Start free. Mobile Pro is coming soon.',
      body: 'The mobile beta ships the free toolkit now, with native Pro subscriptions planned for a later release.',
      proLabel: 'Pro - coming soon on mobile',
      proDescription: 'Native subscriptions are not available in this build yet.',
      proBullets: [
        `Core tools and ${maxFreeSaves} saved projects are live today`,
        'Campaign Hub unlocks with future mobile Pro',
        'Native subscription management is planned for a later release',
      ],
      footer: 'Mobile subscriptions coming soon.',
      buttonLabel: 'View Plans',
    };
  }

  return {
    heading: 'Start free. Upgrade when you need more room.',
    body: 'Pro is designed for game masters who want to save more, organize more, and connect their prep in one place.',
    proLabel: 'Pro - $4.99/month',
    proDescription: 'For active GMs and long-running campaigns.',
    proBullets: [
      'Unlimited saved projects',
      'Campaign Hub access',
      'Linked planning workflows',
      'Manage billing anytime',
    ],
    footer: 'Cancel anytime.',
    buttonLabel: 'View Pricing',
  };
}

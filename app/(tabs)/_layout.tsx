import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Pressable } from 'react-native';
import { Label } from '@/components/AppText';
import { getHeaderPlanLabel } from '@/lib/subscriptionUi';
import { useGameSystem } from '@/contexts/GameSystemContext';
import { getSystemPresentation } from '@/lib/systemPresentation';

function UpgradeHeaderButton() {
    return (
    <Pressable
      onPress={() => router.push('/pricing')}
      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
    >
      <Label>{getHeaderPlanLabel()}</Label>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { activeSystem } = useGameSystem();
  const presentation = getSystemPresentation(activeSystem.id);
  const { palette } = presentation;

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <UpgradeHeaderButton />,
        headerStyle: { backgroundColor: palette.headerBackground },
        headerShadowVisible: false,
        headerTintColor: Colors.text,
        tabBarStyle: {
          backgroundColor: palette.tabBackground,
          borderTopColor: palette.headerBorder,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: Colors.mutedText,
        sceneStyle: { backgroundColor: palette.pageTint },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: activeSystem.tabs.home,
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="campaign"
        options={{
          title: activeSystem.tabs.campaign,
        }}
      />
      <Tabs.Screen
        name="xp"
        options={{
          title: activeSystem.tabs.xp,
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="encounters"
        options={{
          title: activeSystem.tabs.encounters,
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="generator"
        options={{
          title: activeSystem.tabs.generator,
          tabBarIcon: ({ color, size }) => <Ionicons name="color-wand-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="quest"
        options={{
          title: activeSystem.tabs.quest,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sword" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: activeSystem.tabs.projects,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: activeSystem.tabs.account,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

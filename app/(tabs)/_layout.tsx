import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Pressable } from 'react-native';
import { Label } from '@/components/AppText';

function UpgradeHeaderButton() {
  return (
    <Pressable
      onPress={() => router.push('/pricing')}
      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
    >
      <Label>Upgrade</Label>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <UpgradeHeaderButton />,
        headerStyle: { backgroundColor: Colors.card },
        headerTintColor: Colors.text,
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.mutedText,
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="xp"
        options={{
          title: 'XP',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="encounters"
        options={{
          title: 'Encounter',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="generator"
        options={{
          title: 'Loot',
          tabBarIcon: ({ color, size }) => <Ionicons name="color-wand-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="quest"
        options={{
          title: 'Quest',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sword" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'My Projects',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

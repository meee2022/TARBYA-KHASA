import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon } from '../../components/ui';

// Declared last to first: the bar is drawn left to right, so the home tab lands on the right where an Arabic reader starts.
const tabs: [name: string, title: string, icon: Icon, header?: string][] = [
  ['desk', 'مكتبي', 'briefcase-outline'],
  ['progress', 'التقدم', 'analytics-outline'],
  ['learners', 'الطلاب', 'people-outline'],
  ['lessons', 'الدروس', 'book-outline'],
  ['index', 'الرئيسية', 'home-outline', 'وتد'],
];
export const unstable_settings = { initialRouteName: 'index' };

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerTitleAlign: 'center',
      headerTitleStyle: { fontFamily: 'Tajawal_700Bold', fontSize: 20, color: colors.bg },
      headerStyle: { backgroundColor: colors.wine },
      headerShadowVisible: false,
      tabBarActiveTintColor: colors.wine,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontFamily: 'Tajawal_700Bold', fontSize: 11 },
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 62 + bottom, paddingBottom: bottom },
      tabBarItemStyle: { paddingTop: 6 },
    }}>
      {tabs.map(([name, title, icon, header]) => (
        <Tabs.Screen key={name} name={name} options={{
          title,
          headerTitle: header ?? title,
          headerShown: name !== 'index',
          tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={typeof color === 'string' ? color : colors.wine} size={size} />,
        }} />
      ))}
    </Tabs>
  );
}

import React from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold } from '@expo-google-fonts/tajawal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../components/store';
import { colors } from '../components/ui';

// Every screen lays itself out right to left by hand (row-reverse, right-aligned text), so the system must not mirror it a second time on an Arabic device.
I18nManager.allowRTL(false);

const screens: [name: string, title: string][] = [
  ['lesson/[id]', 'تحضير الدرس'],
  ['edit/[id]', 'محرر التحضير'],
  ['learner/[id]', 'ملف الطالب'],
  ['presentations', 'استوديو العروض'],
  ['games', 'الألعاب والوصول'],
  ['learn/[kind]', 'مساحة التعلّم'],
  ['play/[pack]/[template]', 'نشاط من الحزمة'],
  ['review', 'مراجعة التحضير'],
  ['timetable', 'الجدول الأسبوعي'],
  ['tasks', 'المهام'],
  ['attendance', 'الحضور والغياب'],
  ['notices', 'التنبيهات'],
  ['assessment', 'سجل التقييم'],
  ['behaviour', 'خطط السلوك'],
  ['ieps', 'الخطط الفردية'],
  ['distribution', 'التوزيع الفصلي'],
  ['team', 'الفريق والإحالات'],
  ['evidence', 'ملف الإنجاز'],
  ['transfer', 'نقل البيانات'],
  ['strategies', 'موسوعة الاستراتيجيات'],
  ['strategy/[id]', 'استراتيجية'],
  ['help', 'دليل الاستخدام'],
  ['prompts', 'مختبر الأوامر'],
  ['udl', 'فحص التصميم الشامل'],
  ['videos', 'مكتبة الفيديو'],
  ['report', 'تقرير الطالب'],
];

export default function RootLayout() {
  const [loaded, error] = useFonts({ Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerTitleAlign: 'center', headerTitleStyle: { fontFamily: 'Tajawal_700Bold', color: colors.bg }, headerTintColor: colors.goldLight, headerStyle: { backgroundColor: colors.wine }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="session/[id]" options={{ title: 'مساحة التعلّم', presentation: 'fullScreenModal' }} />
          {screens.map(([name, title]) => <Stack.Screen key={name} name={name} options={{ title }} />)}
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

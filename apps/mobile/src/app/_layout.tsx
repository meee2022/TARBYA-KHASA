import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold } from '@expo-google-fonts/tajawal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../components/store';
import { colors } from '../components/ui';
export default function RootLayout() { const [loaded, error] = useFonts({ Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold }); if (!loaded && !error) return null; return <SafeAreaProvider><StoreProvider><StatusBar style="dark" /><Stack screenOptions={{ headerTitleStyle: { fontFamily: 'Tajawal_700Bold' }, headerTintColor: colors.wine, headerStyle: { backgroundColor: '#fff' }, contentStyle: { backgroundColor: colors.bg } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="lesson/[id]" options={{ title: 'تحضير الدرس' }} /><Stack.Screen name="edit/[id]" options={{ title: 'محرر التحضير' }} /><Stack.Screen name="learner/[id]" options={{ title: 'ملف الطالب' }} /><Stack.Screen name="session/[id]" options={{ title: 'مساحة التعلّم', presentation: 'fullScreenModal' }} /><Stack.Screen name="presentations" options={{ title: 'استوديو العروض' }} /><Stack.Screen name="games" options={{ title: 'الألعاب والوصول' }} /><Stack.Screen name="learn/[kind]" options={{ title: 'مساحة التعلّم' }} /><Stack.Screen name="review" options={{ title: 'مراجعة التحضير' }} /></Stack></StoreProvider></SafeAreaProvider>; }

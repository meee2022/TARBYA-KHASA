import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Txt, Card, colors, styles } from '../../components/ui';
import { useStore } from '../../components/store';
export default function Learners() { const { data } = useStore(); return <Screen title="لكل طالب مساره" subtitle="نقاط قوته، احتياجاته، وأهدافه الفردية.">{data.learners.map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`ملف ${s.name}`} onPress={() => router.push(`/learner/${s.id}`)}><Card><View style={styles.row}><View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}><Txt bold style={{ fontSize: 24, color: colors.wine }}>{s.initials}</Txt></View><View style={{ flex: 1 }}><Txt bold style={{ fontSize: 21 }}>{s.name}</Txt><Txt style={styles.small}>الصف {s.grade} · {s.goals.length} أهداف</Txt></View></View><Txt style={{ color: colors.muted, fontSize: 13, marginTop: 17 }}>{s.strengths}</Txt></Card></Pressable>)}</Screen>; }

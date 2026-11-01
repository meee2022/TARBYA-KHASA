import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, Txt, Card, Button, Badge, Field, styles } from '../../components/ui';
import { useStore } from '../../components/store';
export default function Lessons() { const { data } = useStore(); const [query, setQuery] = useState(''); return <Screen title="التحضير والدروس" subtitle="مصادرك وأهداف طلابك في مكان واحد."><Field label="البحث في الدروس" value={query} onChangeText={setQuery} placeholder="عنوان الدرس أو المادة" /><Button title="تحضير جديد" icon="add" onPress={() => router.push('/edit/new')} />{data.lessons.filter(l => `${l.title} ${l.subject}`.includes(query)).map(l => <Pressable key={l.id} style={{ marginTop: 17 }} accessibilityRole="button" accessibilityLabel={l.title} onPress={() => router.push(`/lesson/${l.id}`)}><Card><Badge status={l.status} /><Txt bold style={{ fontSize: 22, marginVertical: 8 }}>{l.title || 'مسودة جديدة'}</Txt><Txt style={styles.small}>{l.subject} · الصف {l.grade}</Txt><Txt style={styles.small}>{l.duration} دقيقة · {l.questions.length} أسئلة</Txt></Card></Pressable>)}</Screen>; }

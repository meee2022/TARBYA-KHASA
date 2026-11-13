import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { countOf } from '../../../../../packages/domain';
import { defaultCatalog } from '../../../../../packages/domain/catalog';
import { notices, schoolDay } from '../../../../../packages/domain/desk';
import { referralsDue } from '../../../../../packages/domain/records';
import { today } from '../../../../../packages/domain/planning';
import { Screen, Txt, Card, Tap, Rise, Orb, Icon, Tone, colors, styles } from '../../components/ui';
import { useStore } from '../../components/store';

type Tool = { to: string; title: string; icon: Icon; tone: Tone; state: string };

/** The teacher's desk: ten daily tools, each with one line saying where it stands. */
export default function Desk() {
  const { data } = useStore();
  const now = today();
  const desk = data.desk ?? {};
  const alerts = notices(data, now).length;
  const periods = (desk.timetable?.slots ?? []).filter(s => s.day === schoolDay(now)).length;
  const open = (desk.tasks ?? []).filter(t => !t.done);
  const late = open.filter(t => t.due && t.due < now).length;
  const register = (desk.attendance ?? []).find(d => d.date === now);
  const due = referralsDue(desk.referrals ?? [], now).length;
  const readings = (desk.performance ?? []).length, plans = (desk.behaviourPlans ?? []).filter(p => p.active).length, ieps = (data.ieps ?? []).length;
  const evidence = (desk.evidence ?? []).length, terms = (desk.distributions ?? []).length, referrals = (desk.referrals ?? []).filter(r => r.state !== 'closed').length;
  const videos = (desk.videos ?? []).length;
  const groups: [string, Tool[]][] = [
    ['يومي', [
      { to: '/notices', title: 'التنبيهات', icon: 'notifications-outline', tone: 'wine', state: alerts ? countOf(alerts, 'تنبيه', 'تنبيهان', 'تنبيهات') : 'لا تنبيهات اليوم' },
      { to: '/timetable', title: 'الجدول الأسبوعي', icon: 'calendar-outline', tone: 'gold', state: periods ? `اليوم: ${countOf(periods, 'حصة', 'حصتان', 'حصص')}` : 'لا حصص مسجلة اليوم' },
      { to: '/tasks', title: 'المهام', icon: 'checkbox-outline', tone: 'olive', state: open.length ? `${countOf(open.length, 'مهمة', 'مهمتان', 'مهام')} مفتوحة${late ? ` · ${late} تجاوزت موعدها` : ''}` : 'لا مهام مفتوحة' },
      { to: '/attendance', title: 'الحضور والغياب', icon: 'people-circle-outline', tone: 'wine', state: register ? 'سُجّل حضور اليوم' : 'لم يُسجَّل حضور اليوم بعد' },
    ]],
    ['سجلات الطلاب', [
      { to: '/assessment', title: 'سجل التقييم', icon: 'stats-chart-outline', tone: 'gold', state: readings ? countOf(readings, 'قراءة', 'قراءتان', 'قراءات') : 'لا قراءات بعد' },
      { to: '/behaviour', title: 'خطط السلوك', icon: 'shield-checkmark-outline', tone: 'olive', state: plans ? countOf(plans, 'خطة فعّالة', 'خطتان فعّالتان', 'خطط فعّالة') : 'لا خطط فعّالة' },
      { to: '/ieps', title: 'الخطط الفردية', icon: 'document-text-outline', tone: 'wine', state: ieps ? `${countOf(ieps, 'خطة', 'خطتان', 'خطط')} · للقراءة` : 'لا خطط على هذا الجهاز' },
      { to: '/evidence', title: 'ملف الإنجاز', icon: 'folder-open-outline', tone: 'gold', state: evidence ? countOf(evidence, 'شاهد', 'شاهدان', 'شواهد') : 'لا شواهد بعد' },
    ]],
    ['الفصل والفريق', [
      { to: '/distribution', title: 'التوزيع الفصلي', icon: 'grid-outline', tone: 'olive', state: terms ? `${countOf(terms, 'توزيع', 'توزيعان', 'توزيعات')} · للقراءة` : 'لا توزيع على هذا الجهاز' },
      { to: '/team', title: 'الفريق والإحالات', icon: 'git-network-outline', tone: 'wine', state: due ? `${countOf(due, 'إحالة', 'إحالتان', 'إحالات')} حان موعد متابعتها` : referrals ? `${countOf(referrals, 'إحالة', 'إحالتان', 'إحالات')} مفتوحة` : 'لا إحالات مفتوحة' },
    ]],
    ['المعرفة والتقارير', [
      { to: '/strategies', title: 'موسوعة الاستراتيجيات', icon: 'library-outline', tone: 'gold', state: countOf(defaultCatalog.strategyGuide.length, 'استراتيجية', 'استراتيجيتان', 'استراتيجيات') },
      { to: '/help', title: 'دليل الاستخدام', icon: 'help-circle-outline', tone: 'olive', state: 'خطوات العمل على المنصة' },
      { to: '/prompts', title: 'مختبر الأوامر', icon: 'chatbox-ellipses-outline', tone: 'wine', state: 'طلبات جاهزة تُملأ من درسك' },
      { to: '/udl', title: 'فحص التصميم الشامل', icon: 'checkmark-done-circle-outline', tone: 'olive', state: `${countOf(defaultCatalog.udl.length, 'بند', 'بندان', 'بنود')} لكل درس` },
      { to: '/videos', title: 'مكتبة الفيديو', icon: 'videocam-outline', tone: 'gold', state: videos ? countOf(videos, 'مقطع', 'مقطعان', 'مقاطع') : 'لا مقاطع بعد' },
      { to: '/report', title: 'تقرير الطالب', icon: 'reader-outline', tone: 'wine', state: 'كل ما سُجّل عن طالب واحد · للقراءة' },
    ]],
    ['البيانات', [
      { to: '/transfer', title: 'نقل البيانات', icon: 'swap-vertical-outline', tone: 'neutral', state: 'استيراد نسخة من الموقع، أو تصدير نسخة من هذا الجهاز' },
    ]],
  ];
  let n = 0;
  return (
    <Screen subtitle="أدوات اليوم وسجلات الطلاب، محفوظة على هذا الجهاز.">
      {groups.map(([name, tools]) => (
        <View key={name}>
          <Txt bold style={[styles.sectionTitle, { color: colors.goldDeep, fontSize: 14, marginBottom: 10 }]}>{name}</Txt>
          {tools.map(t => (
            <Rise key={t.to} index={n++}>
              <Tap accessibilityLabel={`${t.title}: ${t.state}`} onPress={() => router.push(t.to as never)}>
                <Card style={{ paddingVertical: 16, marginBottom: 12 }}>
                  <View style={styles.row}>
                    <Orb icon={t.icon} tone={t.tone} />
                    <View style={{ flex: 1 }}>
                      <Txt bold style={{ fontSize: 17 }}>{t.title}</Txt>
                      <Txt style={styles.small}>{t.state}</Txt>
                    </View>
                    <Ionicons name="chevron-back" size={20} color={colors.goldDeep} />
                  </View>
                </Card>
              </Tap>
            </Rise>
          ))}
        </View>
      ))}
    </Screen>
  );
}

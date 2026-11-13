import React from 'react';
import { View } from 'react-native';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { Screen, Txt, Card, Rise, Steps, colors, styles } from '../components/ui';

/** The usage guide: the platform's work in order, each card a few numbered steps. The steps describe the web site; the app has part of them. */
export default function Help() {
  return (
    <Screen subtitle="طريق العمل على منصة وتد خطوة بعد خطوة. بعض الخطوات يُنجَز على الموقع.">
      {defaultCatalog.help.map((card, i) => (
        <Rise key={card.id} index={i}>
          <Card>
            <View style={[styles.row, { marginBottom: 12 }]}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.wine, alignItems: 'center', justifyContent: 'center' }}>
                <Txt bold style={{ color: colors.goldLight, fontSize: 16 }}>{i + 1}</Txt>
              </View>
              <Txt bold style={{ flex: 1, fontSize: 17 }}>{card.title}</Txt>
            </View>
            <Steps items={card.steps} />
          </Card>
        </Rise>
      ))}
    </Screen>
  );
}

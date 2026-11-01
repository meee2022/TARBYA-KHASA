import { latinizeContent } from '../domain/numbers.ts';
import pptxgen from 'pptxgenjs';
import { deckThemes, validateDeck } from '../domain/presentations.ts';
import type { Deck } from '../domain/presentations.ts';

export function buildPowerPoint(input: Deck) {
  const deck = latinizeContent(input);
  const errors = validateDeck(deck);
  if (errors.length) throw new Error(errors[0]);
  if (!deck.reviewed) throw new Error('راجع الشرائح وحدّد اكتمال المراجعة قبل التنزيل.');
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'تربية خاصة'; pptx.subject = deck.subject; pptx.title = deck.title;
  pptx.company = 'مساحة الدعم الإضافي'; const lang = deck.language === 'ar' ? 'ar-QA' : 'en-GB';
  pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
  const theme = deckThemes[deck.theme]; const rtl = deck.language === 'ar';
  const textBase = { fontFace: 'Arial', color: theme.ink, rtlMode: rtl, lang, align: rtl ? 'right' as const : 'left' as const, margin: 0, breakLine: false, fit: 'shrink' as const, valign: 'middle' as const };
  for (const [index, item] of deck.slides.entries()) {
    const slide = pptx.addSlide(); slide.background = { color: theme.background };
    slide.addText(deck.title, { ...textBase, x: .65, y: .28, w: 11.3, h: .35, fontSize: 13, color: theme.accent });
    slide.addShape(pptx.ShapeType.line, { x: .65, y: .85, w: 12.03, h: 0, line: { color: theme.accent, transparency: 65, width: 1 } });
    if (item.kind === 'cover' || item.kind === 'break' || item.kind === 'closing') {
      slide.addShape(pptx.ShapeType.roundRect, { x: .65, y: 1.25, w: 12.03, h: 5.35, rectRadius: .15, line: { color: theme.soft, transparency: 100 }, fill: { color: theme.soft } });
      slide.addText(item.title, { ...textBase, x: 1.15, y: 1.7, w: 11.03, h: 1.7, bold: true, fontSize: deck.largeText ? 44 : 38, align: 'center', color: theme.accent });
      slide.addText(item.body, { ...textBase, x: 1.35, y: 3.65, w: 10.63, h: 2, fontSize: deck.largeText ? 30 : 25, align: 'center' });
    } else {
      slide.addText(item.title, { ...textBase, x: .8, y: 1.2, w: 11.73, h: 1.1, fontSize: deck.largeText ? 36 : 30, bold: true });
      const choice = item.kind === 'choice';
      slide.addText(item.body, { ...textBase, x: item.image && rtl ? 6.45 : .85, y: 2.55, w: item.image ? 5.95 : 11.63, h: choice ? .75 : 3.25, fontSize: deck.largeText ? 30 : 25 });
      if (item.image) slide.addImage({ data: item.image, x: rtl ? .85 : 6.45, y: 2.55, w: 5.2, h: choice ? .75 : 3.3, sizing: { type: 'contain', w: 5.2, h: choice ? .75 : 3.3 }, altText: item.imageAlt || '' });
      if (choice) {
        const width = (11.63 - (item.options.length - 1) * .22) / item.options.length;
        item.options.forEach((option, i) => {
          const pos = rtl ? item.options.length - 1 - i : i; const x = .85 + pos * (width + .22);
          slide.addShape(pptx.ShapeType.roundRect, { x, y: 3.65, w: width, h: 2.05, rectRadius: .1, fill: { color: theme.soft }, line: { color: theme.accent, width: 1 } });
          slide.addText(option, { ...textBase, x: x + .2, y: 3.9, w: width - .4, h: 1.55, fontSize: deck.largeText ? 27 : 23, align: 'center' });
        });
      }
    }
    slide.addText(`${index + 1} / ${deck.slides.length}`, { x: .65, y: 6.95, w: 1, h: .3, fontFace: 'Arial', fontSize: 12, color: theme.ink, align: 'left' });
    slide.addNotes([item.notes, item.kind === 'choice' ? `الإجابة الصحيحة: ${item.options[item.answer!]}` : '', item.imageAlt ? `وصف الصورة: ${item.imageAlt}` : '', 'تكييف طريقة الإجابة: كلام، إشارة أو اختيار بمساعدة الوصول. لا تستنتج تحقق الهدف من إجابة واحدة.'].filter(Boolean).join('\n'));
  }
  return pptx;
}
export function safeDeckFilename(title: string) { return (title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim().slice(0, 70) || 'عرض-تعليمي') + '.pptx'; }
export async function downloadPowerPoint(deck: Deck) { await buildPowerPoint(deck).writeFile({ fileName: safeDeckFilename(deck.title) }); }

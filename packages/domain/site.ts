import { art, defaultCatalog, mediaPath, validateCatalog, type Catalog } from './catalog.ts';
export const moduleLabels = { plans:'التحضير الأسبوعي', iep:'الخطط الفردية', lessons:'الدروس والحصص', learners:'ملفات الطلاب', packs:'المحتوى والأوراق', tools:'أدوات دعم الطالب', presentations:'العروض', games:'الألعاب', library:'المكتبة', progress:'متابعة التقدم', review:'مراجعة التحضير' } as const;
export interface SiteConfig {
  catalog: Catalog; heroImage: string;
  version: 1; revision: number; brandName: string; tagline: string; welcome: string; description: string;
  featureTitle: string; featureDescription: string; featuredLessonId: string; footer: string;
  announcement: string; announcementEnabled: boolean; primaryColor: string;
  modules: Record<keyof typeof moduleLabels,boolean>;
  aiEnabled: boolean; aiRequestLimit: number; maintenance: boolean; maintenanceMessage: string;
}
export const defaultSite: SiteConfig = {
  version:1, revision:0, brandName:'تربية خاصة', tagline:'لكلّ طالب، طريقٌ للتعلّم', welcome:'أهلًا بك، ليومٍ يصنع فرقًا', description:'كل ما تحتاجه لحصة أكثر وضوحًا، وتعلّم أقرب لكل طالب.',
  featureTitle:'عالم صغير، اكتشافات كبيرة.', featureDescription:'درس الحيوانات، بتجارب تراعي اختلاف طرق التعلّم.', featuredLessonId:'animals', footer:'تعلّم يناسب كلّ طالب', announcement:'', announcementEnabled:false, primaryColor:'#801b3b',
  catalog:defaultCatalog, heroImage:art('hero-classroom'), modules:{plans:true,iep:true,lessons:true,learners:true,packs:true,tools:true,presentations:true,games:true,library:true,progress:true,review:true}, aiEnabled:true, aiRequestLimit:15, maintenance:false, maintenanceMessage:'نحدّث المنصة الآن. نعود إليكم قريبًا.',
};
export function validateSite(input: unknown): SiteConfig {
  if (!input || typeof input !== 'object') throw new Error('إعدادات غير صالحة.');
  const v = input as SiteConfig; const clean = structuredClone(defaultSite);
  for (const [key,max] of Object.entries({brandName:60,tagline:100,welcome:100,description:350,featureTitle:100,featureDescription:300,featuredLessonId:100,footer:160,announcement:500,maintenanceMessage:300})) {
    const text = v[key as keyof SiteConfig];
    if(typeof text!=='string'||text.length>max)throw new Error(`راجع طول الحقل ${key}.`);
    (clean as unknown as Record<string,unknown>)[key]=text.trim();
  }
  if(!clean.brandName||!clean.welcome||!clean.maintenanceMessage)throw new Error('اسم المنصة والترحيب ورسالة الصيانة مطلوبة.');
  if(typeof v.primaryColor!=='string'||!/^#[a-f\d]{6}$/i.test(v.primaryColor))throw new Error('اختر لونًا صحيحًا.');
  const channels=v.primaryColor.slice(1).match(/../g)!.map(h=>parseInt(h,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  if(1.05/(channels[0]*.2126+channels[1]*.7152+channels[2]*.0722+.05)<4.5)throw new Error('اختر لونًا أغمق ليبقى النص الأبيض واضحًا على الأزرار.');
  clean.primaryColor=v.primaryColor;
  for(const k of ['announcementEnabled','aiEnabled','maintenance'] as const){if(typeof v[k]!=='boolean')throw new Error('راجع مفاتيح التشغيل.');clean[k]=v[k];}
  // Sections added after a settings file was saved keep their default instead of failing the whole file.
  for(const k of Object.keys(defaultSite.modules)){const on=(v.modules as Record<string,unknown>)?.[k];if(on===undefined)continue;if(typeof on!=='boolean')throw new Error('راجع الأقسام والألعاب.');(clean.modules as Record<string,boolean>)[k]=on;}
  clean.catalog=validateCatalog(v.catalog);
  if(v.heroImage!==undefined){if(typeof v.heroImage!=='string'||!mediaPath.test(v.heroImage))throw new Error('صورة الرئيسية غير صالحة.');clean.heroImage=v.heroImage;}
  if(!Number.isInteger(v.aiRequestLimit)||v.aiRequestLimit<1||v.aiRequestLimit>60)throw new Error('حد الذكاء الاصطناعي من 1 إلى 60 طلبًا كل 10 دقائق.');
  if(!Number.isInteger(v.revision)||v.revision<0)throw new Error('نسخة الإعدادات غير صالحة.');
  clean.aiRequestLimit=v.aiRequestLimit;clean.revision=v.revision;
  return clean;
}

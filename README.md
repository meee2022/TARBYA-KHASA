# تربية خاصة — مساحة الدعم الإضافي

موقع عربي للمعلمين والمنسقين، وتطبيق أصلي باستخدام Expo وReact Native، بهوية عنابية وعاجية وواجهة هادئة.

ابدأ بالموقع:

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5175
```

التطبيق في `apps/mobile`:

```sh
npm install
npx expo start
```

البيانات تجريبية ومحفوظة محليًا. الموقع والتطبيق غير متزامنين حتى الآن، ولم يتم تفعيل حسابات المدرسة والصلاحيات. لا تستخدم بيانات طلاب حقيقية في هذه المرحلة.

[تفاصيل التنفيذ والميزات وحدود الاختبار](docs/IMPLEMENTATION.md)

[متطلبات المنتج](PRODUCT.md) · [تعليمات المشروع السابق](docs/LEGACY-README.md)

الاختبارات: `npm test` و`npm run build`، ثم `npm run typecheck` و`npm run lint` داخل التطبيق.

العروض والذكاء الاصطناعي: افتح `/presentations` أو زر «إنشاء PowerPoint» من الدرس. القالب يعمل محليًا، وإعداد مساعد Claude موضح في [دليل الإنشاء](docs/AUTHORING.md).

المحتوى والألعاب وأدوات الطالب: [التفاصيل والحدود](docs/CONTENT-AND-SUPPORT.md) · [سيناريو العرض](docs/DEMO-SCRIPT.md) · [الخطة الكاملة](docs/MASTER-PROMPT.md)

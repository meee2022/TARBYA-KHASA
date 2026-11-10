# تربية خاصة — مساحة الدعم الإضافي

## Confirmed direction
An Arabic, RTL workspace for primary-school additional-support teachers and coordinators. The user authorized implementation of a polished website and a real native mobile application, suggested Expo or Flutter, and explicitly requested refined cards, typography and organization. React Native with Expo is the native implementation; the existing React/Vite website is retained. No WebView wrapper.

The teacher's supplied lesson, two individual plans, 99 slides and short video were reviewed. The detailed source analysis and implementation brief live in `مراجع واتساب tarbya/تصور المنصة وبرومبت التنفيذ.txt`. Use those pedagogical structures, never the real pupils' identities in demo data.

## Main journey
Select learners and goals → prepare a lesson → adapt activities → review → teach → record independent/prompted responses → review progress. Curriculum level is separate from school grade. Functional access preferences are independent and combinable. No diagnosis-based automatic decisions, child rankings or inferred mastery from a single activity.

## Visual direction
Quiet editorial school workspace: deep maroon and gold identity on warm cream, white layered cards, olive as the second colour, El Messiri headings and Readex Pro text, careful spacing and finely organized cards. Premium means clarity and craft, not glitter, generic gradients or excessive animation. Reference: the local أثر project for polish and role journeys; do not copy its branding. Student mode is calm and free of administrative information.

## Delivery boundaries
Build a functioning local pilot with clearly labeled fictional data, persisted lessons/profiles/review/session results and printable output. Native storage and web storage remain device-local until authenticated school synchronization is implemented. Never imply local role switching is secure authorization. Preserve the older Convex application without deploying schema changes or writing to its remote data. Real school rollout requires authenticated authorization, private file storage and reviewed curricular content.

## Acceptance
Responsive RTL desktop and phone; keyboard and touch paths; no drag-only interaction; editable preparation; honest source extraction limitations; independently recorded prompting; stored learner-specific access preferences; real native screens and native speech; error states; production web build and native TypeScript/bundle verification. Document any native device or iOS verification limits.

## إضافة الألعاب والوصول — 31 أكتوبر 2026

مساحة محلية في الموقع والتطبيق: مطابقة، تصنيف، تسلسل، وخمسة أحرف برايل. لوحة طلبات، استراحة، وصف لفظي، تكبير، تباين، بديلان أو ثلاثة، ومسح بمفتاح واحد في الموقع. يحفظ المعلم إعدادات الطالب وسجل التدريب منفصلًا عن تقييم أهدافه. راجع docs/ACCESSIBILITY.md لنطاق التنفيذ والمراجع وحدود التحقق.

## إنشاء العروض والمساعد — 31 أكتوبر 2026

من الدرس إلى عرض PPTX قابل للتحرير، مع معاينة وملاحظات للمعلم وشرائح قصيرة قابلة للتكييف. القوالب محلية، ومساعد Claude يقدّم مسودة قبل التطبيق والاعتماد. المفتاح غير متاح محليًا، فلا يُعلن نجاح توليد حي. راجع docs/AUTHORING.md للتشغيل وحدود الموقع والتطبيق والمراجع المحلية من مشروع أثر.

## المحتوى وأدوات الطالب — 1 نوفمبر 2026

المحتوى كله كتالوج تديره لوحة الإدارة، وليس ثابتًا في الكود. حزمة المحتوى هي مركز المنصة: منها البطاقات و13 نشاطًا وأوراق العمل وأسئلة الجلسة. جُمّد تطبيق الموبايل مؤقتًا. راجع docs/CONTENT-AND-SUPPORT.md وdocs/DEMO-SCRIPT.md وdocs/MASTER-PROMPT.md.

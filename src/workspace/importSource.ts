import JSZip from 'jszip';
export async function importSource(file: File): Promise<{ text: string; note: string }> {
  if (file.size > 180 * 1024 * 1024) throw new Error('الحد الأقصى 180 ميجابايت. اختر جزءًا أصغر من المصدر.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return { text: await file.text(), note: 'استُخرج النص. راجع المحتوى قبل استخدامه.' };
  if (ext === 'docx' || ext === 'pptx') {
    const zip = await JSZip.loadAsync(file);
    const names = Object.keys(zip.files).filter(n => ext === 'docx' ? n === 'word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] ?? 0) - Number(b.match(/slide(\d+)/)?.[1] ?? 0));
    const sections: string[] = []; let total = 0;
    for (const name of names) {
      const raw = await zip.file(name)!.async('string'); total += raw.length;
      if (total > 12_000_000) throw new Error('المصدر يحتوي نصًا كبيرًا جدًا. قسّمه إلى أجزاء للمراجعة.');
      const doc = new DOMParser().parseFromString(raw, 'application/xml');
      const lines = [...doc.getElementsByTagNameNS('*', 'p')].map(p => [...p.getElementsByTagNameNS('*', 't')].map(n => n.textContent).join(' ')).filter(Boolean);
      sections.push(`${ext === 'pptx' ? `الشريحة ${name.match(/slide(\d+)/)?.[1]}` : 'مستند Word'}\n${lines.join('\n')}`);
    }
    return { text: sections.join('\n\n'), note: 'استُخرج النص القابل للقراءة فقط. الصور والجداول البصرية والفيديو والصوت تحتاج مراجعة في الملف الأصلي؛ لا يتضمن الاستيراد OCR.' };
  }
  if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    if (doc.numPages > 100) { await doc.destroy(); throw new Error('اختر ملفًا لا يتجاوز 100 صفحة للمراجعة المحلية.'); }
    const pages: string[] = [];
    try { for (let n = 1; n <= doc.numPages; n++) { const page = await doc.getPage(n); const content = await page.getTextContent(); pages.push(`صفحة ${n}\n${content.items.map(i => 'str' in i ? i.str : '').join(' ')}`); } } finally { await doc.destroy(); }
    return { text: pages.join('\n\n'), note: 'استُخرج النص فقط. الصفحات المصوّرة تحتاج OCR غير متاح في هذه النسخة.' };
  }
  throw new Error('اختر ملف DOCX أو PPTX أو PDF أو TXT.');
}

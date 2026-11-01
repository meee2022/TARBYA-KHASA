import { packageParts } from '../../packages/domain/docx';

/** Builds the .docx on this device. Nothing is uploaded. */
export async function downloadWord(name: string, body: string) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const [path, content] of Object.entries(packageParts(body))) zip.file(path, content);
  const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'ملف'}.docx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

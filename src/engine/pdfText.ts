/** Pull readable strings from a PDF so a visit file can be read even when the model rejects the file blob. */

export function scrapePdfText(base64: string): string {
  const latin1 = latin1FromBase64(base64);
  if (!latin1) return '';
  const out: string[] = [];
  const re = /\(((?:\\[nrtf()\\]|\\[0-7]{1,3}|[^\\)]){2,})\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(latin1))) {
    const s = unescapePdf(match[1]);
    if (/[A-Za-z]{3,}/.test(s)) out.push(s.trim());
  }
  const joined = out.join('\n').replace(/[ \t]{2,}/g, ' ').trim();
  return joined.length > 20 ? joined.slice(0, 40_000) : '';
}

function latin1FromBase64(base64: string) {
  const clean = base64.replace(/\s/g, '');
  try {
    if (typeof atob !== 'function') return '';
    return atob(clean);
  } catch {
    return '';
  }
}

function unescapePdf(s: string) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\([()\\])/g, '$1');
}

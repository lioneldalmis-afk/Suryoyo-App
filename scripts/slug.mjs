// Macht aus Umschrift eine einfache ASCII-Kennung: „fëš bë šlomo“ → „fes-be-slomo“.
export function slug(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

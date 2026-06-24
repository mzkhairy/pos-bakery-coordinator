// Gunakan nanoid@3 (CommonJS)
const { nanoid } = require('nanoid');

export function generateTxId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = nanoid(8);
  return `TX-${date}-${random}`;
}

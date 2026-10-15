/** "A, B & C" style joiner for generated titles. */
export function joinListShort(items: string[]): string {
  if (items.length <= 2) return items.join(' & ');
  return `${items.slice(0, 2).join(', ')} & ${items.length - 2} more`;
}

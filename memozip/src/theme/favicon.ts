/**
 * Browser tabs cannot read the page's CSS variables, so the favicon is rebuilt from them
 * whenever the theme changes: same mark, current primary and on-primary colors.
 */
export function applyThemeFavicon(): void {
  const styles = getComputedStyle(document.documentElement);
  const toRgb = (token: string) => {
    const parts = styles.getPropertyValue(token).trim().split(/\s+/);
    return parts.length === 3 ? `rgb(${parts.join(',')})` : null;
  };
  const primary = toRgb('--primary');
  const onPrimary = toRgb('--on-primary');
  if (!primary || !onPrimary) return;

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
    `<rect width="48" height="48" rx="14" fill="${primary}"/>` +
    `<path d="M12.5 33V14L24 25.5L35.5 14V33" fill="none" stroke="${onPrimary}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="21.5" y="26" width="5" height="9.5" rx="2.5" fill="${onPrimary}"/>` +
    `<circle cx="24" cy="31.5" r="1.3" fill="${primary}"/>` +
    '</svg>';

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

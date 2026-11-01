export const HEADER_BOTTOM_RADIUS = 22;
export const TAB_BAR_RADIUS = 24;

export function floatingTabGeometry(insets: { bottom: number; left: number; right: number }, viewportWidth?: number, maxWidth = 760) {
  const safeLeft = Math.max(16, insets.left);
  const safeRight = Math.max(16, insets.right);
  const centeredMargin = viewportWidth && viewportWidth > maxWidth ? Math.max(0, (viewportWidth - maxWidth) / 2) : 0;
  return {
    borderRadius: TAB_BAR_RADIUS,
    marginLeft: Math.max(safeLeft, centeredMargin),
    marginRight: Math.max(safeRight, centeredMargin),
    marginBottom: Math.max(12, insets.bottom),
    marginTop: 8,
    height: 76,
    paddingTop: 8,
    paddingBottom: 12,
  };
}

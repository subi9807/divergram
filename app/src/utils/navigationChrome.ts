export const HEADER_BOTTOM_RADIUS = 22;
export const TAB_BAR_RADIUS = 24;

export function floatingTabGeometry(insets: { bottom: number; left: number; right: number }) {
  return {
    borderRadius: TAB_BAR_RADIUS,
    marginLeft: Math.max(16, insets.left),
    marginRight: Math.max(16, insets.right),
    marginBottom: Math.max(12, insets.bottom),
    marginTop: 8,
    height: 76,
    paddingTop: 8,
    paddingBottom: 12,
  };
}

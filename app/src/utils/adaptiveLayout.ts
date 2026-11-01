export type AdaptiveSizeClass = 'compact' | 'medium' | 'expanded';

export type AdaptiveLayout = {
  sizeClass: AdaptiveSizeClass;
  isLandscape: boolean;
  isLargeScreen: boolean;
  contentMaxWidth: number;
  tabBarMaxWidth: number;
  gridColumns: number;
};

export function getAdaptiveLayout(width: number, height: number): AdaptiveLayout {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const sizeClass: AdaptiveSizeClass = safeWidth < 600 ? 'compact' : safeWidth < 1024 ? 'medium' : 'expanded';

  return {
    sizeClass,
    isLandscape: safeWidth > safeHeight,
    isLargeScreen: sizeClass !== 'compact',
    contentMaxWidth: sizeClass === 'expanded' ? 1200 : safeWidth,
    tabBarMaxWidth: sizeClass === 'compact' ? safeWidth : 760,
    gridColumns: sizeClass === 'compact' ? 2 : sizeClass === 'medium' ? 3 : 4,
  };
}

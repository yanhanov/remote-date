import { useWindowDimensions } from 'react-native';

/** Matches Tailwind `md` breakpoint used in the Vue app */
export const TABLET_BREAKPOINT = 768;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= TABLET_BREAKPOINT;

  return {
    width,
    height,
    isWide,
    isMobile: !isWide,
  };
}

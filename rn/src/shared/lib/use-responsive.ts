import { useWindowDimensions } from 'react-native';

/** Matches Tailwind `md` — sidebar / app shell */
export const TABLET_BREAKPOINT = 768;

/** Matches Tailwind `lg` — room page two-column layout */
export const DESKTOP_BREAKPOINT = 1024;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= TABLET_BREAKPOINT;
  const isLg = width >= DESKTOP_BREAKPOINT;

  return {
    width,
    height,
    isWide,
    isLg,
    isMobile: !isWide,
  };
}

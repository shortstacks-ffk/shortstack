import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BreakpointState {
  xs: boolean;  // < 640px
  sm: boolean;  // >= 640px
  md: boolean;  // >= 768px
  lg: boolean;  // >= 1024px
  xl: boolean;  // >= 1280px
  '2xl': boolean; // >= 1536px
  current: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useResponsive(): BreakpointState {
  const [breakpointState, setBreakpointState] = useState<BreakpointState>({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    '2xl': false,
    current: 'xs',
    isMobile: true,
    isTablet: false,
    isDesktop: false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      
      const newState: BreakpointState = {
        xs: width >= breakpoints.xs,
        sm: width >= breakpoints.sm,
        md: width >= breakpoints.md,
        lg: width >= breakpoints.lg,
        xl: width >= breakpoints.xl,
        '2xl': width >= breakpoints['2xl'],
        current: 'xs',
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
      };

      // Determine current breakpoint
      if (width >= breakpoints['2xl']) newState.current = '2xl';
      else if (width >= breakpoints.xl) newState.current = 'xl';
      else if (width >= breakpoints.lg) newState.current = 'lg';
      else if (width >= breakpoints.md) newState.current = 'md';
      else if (width >= breakpoints.sm) newState.current = 'sm';
      else newState.current = 'xs';

      setBreakpointState(newState);
    };

    // Initial call
    updateBreakpoints();

    // Add event listener
    window.addEventListener('resize', updateBreakpoints);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateBreakpoints);
  }, []);

  return breakpointState;
}

// Helper hook for common responsive patterns
export function useResponsiveGrid() {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  const getGridCols = (mobile = 1, tablet = 2, desktop = 3) => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  };
  
  const getGridClass = (mobile = 'grid-cols-1', tablet = 'sm:grid-cols-2', desktop = 'lg:grid-cols-3') => {
    return `grid ${mobile} ${tablet} ${desktop}`;
  };
  
  return { getGridCols, getGridClass, isMobile, isTablet, isDesktop };
}
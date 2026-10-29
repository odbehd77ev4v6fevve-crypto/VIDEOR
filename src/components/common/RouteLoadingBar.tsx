import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const RouteLoadingBar: React.FC = () => {
  const location = useLocation();
  const [progress, setProgress] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Start progress bar animation on route change
    setProgress(25);
    setVisible(true);

    const timer1 = setTimeout(() => {
      setProgress(75);
    }, 100);

    const timer2 = setTimeout(() => {
      setProgress(100);
    }, 250);

    const timer3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[100] h-[2.5px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
};

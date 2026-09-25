import { useEffect, useState } from 'react';
import { Button } from '@chakra-ui/react';

export function BackToTop({
  targetId,
}: {
  targetId: string;
}): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight);
    const frame = window.requestAnimationFrame(update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!visible) return null;

  return (
    <Button
      position="fixed"
      bottom="max(1rem, env(safe-area-inset-bottom))"
      right="max(1rem, env(safe-area-inset-right))"
      zIndex="docked"
      size="sm"
      minH="11"
      px="4"
      gap="2"
      variant="outline"
      bg="wiki.surface"
      color="wiki.muted"
      borderColor="wiki.border"
      borderRadius="wiki.control"
      boxShadow="sm"
      _hover={{ color: 'wiki.accent', borderColor: 'wiki.accent' }}
      onClick={() => {
        document.getElementById(targetId)?.focus({ preventScroll: true });
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'instant'
            : 'smooth',
        });
      }}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 10 6-6 6 6M12 4v16" />
      </svg>
      Back to top
    </Button>
  );
}

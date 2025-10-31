import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';

interface NavigationGuardOptions {
  shouldBlock: boolean;
  message?: string;
  onBlock?: () => boolean | void; // Can return false to completely block navigation
  redirectTo?: string;
}

export const useNavigationGuard = ({
  shouldBlock,
  message = "Are you sure you want to leave? Your progress will be lost.",
  onBlock,
  redirectTo = '/student-quiz'
}: NavigationGuardOptions) => {
  const isBlockingRef = useRef(false);

  useEffect(() => {
    if (!shouldBlock) return;

    isBlockingRef.current = true;

    // Block browser back/forward navigation
    const handlePopState = () => {
      if (isBlockingRef.current) {
        // Always prevent going back first
        window.history.pushState(null, '', window.location.href);
        
        if (onBlock) {
          const result = onBlock();
          // If onBlock returns false, completely block navigation
          if (result === false) {
            return; // Stay on current page, no further action
          }
        } else {
          // Show confirmation and redirect if user confirms
          const shouldLeave = window.confirm(message);
          if (shouldLeave) {
            isBlockingRef.current = false;
            window.location.href = redirectTo;
          }
        }
      }
    };

    // Block page refresh/close
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isBlockingRef.current) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    // Add initial history entry to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    
    // Add multiple history entries to make back navigation harder
    for (let i = 0; i < 10; i++) {
      window.history.pushState(null, '', window.location.href);
    }

    // Add event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also listen for hashchange to prevent hash-based navigation
    const handleHashChange = () => {
      if (isBlockingRef.current) {
        window.location.hash = '';
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    
    // Block right-click context menu
    const handleContextMenu = (event: MouseEvent) => {
      if (isBlockingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        toast({
          title: "Right-click Disabled",
          description: "Context menu is disabled during quiz.",
          variant: "destructive"
        });
        return false;
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Block keyboard shortcuts for navigation and developer tools
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isBlockingRef.current) {
        // Block F5, Ctrl+R, Cmd+R (reload)
        // Block F12, Ctrl+Shift+I, Cmd+Option+I (dev tools)
        // Block Ctrl+U, Cmd+Option+U (view source)
        // Block Alt+Left, Alt+Right (navigation)
        if (
          event.key === 'F5' ||
          event.key === 'F12' ||
          (event.ctrlKey && event.key === 'r') ||
          (event.ctrlKey && event.key === 'R') ||
          (event.metaKey && event.key === 'r') ||
          (event.metaKey && event.key === 'R') ||
          (event.ctrlKey && event.shiftKey && event.key === 'I') ||
          (event.metaKey && event.altKey && event.key === 'I') ||
          (event.ctrlKey && event.key === 'u') ||
          (event.ctrlKey && event.key === 'U') ||
          (event.metaKey && event.altKey && event.key === 'u') ||
          (event.metaKey && event.altKey && event.key === 'U') ||
          (event.altKey && event.key === 'ArrowLeft') ||
          (event.altKey && event.key === 'ArrowRight')
        ) {
          event.preventDefault();
          event.stopPropagation();
          toast({
            title: "Action Blocked",
            description: "This action is disabled during quiz.",
            variant: "destructive"
          });
          return false;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    
    // Periodically push history state to prevent back navigation
    const historyInterval = setInterval(() => {
      if (isBlockingRef.current) {
        window.history.pushState(null, '', window.location.href);
      }
    }, 1000); // Every second

    return () => {
      isBlockingRef.current = false;
      clearInterval(historyInterval);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [shouldBlock, message, onBlock, redirectTo]);

  // Function to disable navigation guard
  const disableGuard = () => {
    isBlockingRef.current = false;
  };

  // Function to enable navigation guard
  const enableGuard = () => {
    isBlockingRef.current = true;
    window.history.pushState(null, '', window.location.href);
  };

  return { disableGuard, enableGuard };
};

// Hook specifically for quiz navigation - BLOCKS ALL NAVIGATION
export const useQuizNavigationGuard = (isQuizActive: boolean, isCompleted: boolean) => {
  const { disableGuard, enableGuard } = useNavigationGuard({
    shouldBlock: isQuizActive && !isCompleted,
    message: "You cannot leave the quiz while it's in progress. Please complete or submit the quiz first.",
    onBlock: () => {
      // COMPLETELY BLOCK navigation during quiz - no confirmation dialog
      toast({
        title: "Navigation Blocked",
        description: "You cannot leave the quiz while it's in progress. Please complete the quiz first.",
        variant: "destructive"
      });
      
      // Force stay on current page by pushing current state again
      window.history.pushState(null, '', window.location.href);
      
      // Do NOT allow leaving - no redirect, no confirmation
      return false;
    }
  });

  return { disableGuard, enableGuard };
};

// Hook for preventing access to completed quiz results via back navigation
export const useResultsNavigationGuard = () => {
  useEffect(() => {
    // Replace current history entry to prevent going back to quiz
    window.history.replaceState(null, '', window.location.href);
    
    const handlePopState = () => {
      // Always redirect to quiz selection when trying to go back from results
      window.location.href = '/student-quiz';
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
};

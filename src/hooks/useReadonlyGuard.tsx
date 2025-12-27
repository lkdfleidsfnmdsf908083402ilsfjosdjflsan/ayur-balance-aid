import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

/**
 * Hook to guard actions for readonly users.
 * Returns a function that wraps actions and blocks them for readonly users.
 */
export function useReadonlyGuard() {
  const { isReadonly } = useAuth();
  const { toast } = useToast();

  const guardAction = useCallback(
    <T extends (...args: any[]) => any>(action: T): T => {
      if (isReadonly) {
        return ((...args: any[]) => {
          toast({
            variant: 'destructive',
            title: 'Keine Berechtigung',
            description: 'Sie haben nur Leserechte und können keine Änderungen vornehmen.',
          });
        }) as T;
      }
      return action;
    },
    [isReadonly, toast]
  );

  const showReadonlyWarning = useCallback(() => {
    if (isReadonly) {
      toast({
        variant: 'destructive',
        title: 'Keine Berechtigung',
        description: 'Sie haben nur Leserechte und können keine Änderungen vornehmen.',
      });
      return true;
    }
    return false;
  }, [isReadonly, toast]);

  return { isReadonly, guardAction, showReadonlyWarning };
}

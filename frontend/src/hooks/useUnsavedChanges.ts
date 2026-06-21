import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

export default function useUnsavedChanges(
  isDirty: boolean,
  onConfirmLeave?: () => Promise<boolean> | boolean,
) {
  const skipNextBlockRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !skipNextBlockRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // reset skip flag after navigation attempt
  useEffect(() => {
    if (blocker.state === 'blocked') {
      (async () => {
        const confirmed = onConfirmLeave
          ? await onConfirmLeave()
          : true;

        if (confirmed) {
          skipNextBlockRef.current = true;
          blocker.proceed();
        } else {
          blocker.reset();
        }
      })();
    }
  }, [blocker.state]);

  return {
    blocker,
    skipNextBlockRef, // optional escape hatch
    allowNextNavigation: () => !isDirty || blocker.state === 'unblocked',
  };
}

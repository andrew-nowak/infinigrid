export const debounce = <F extends ((...a: any[]) => void)>(f: F, delay: number): ((...a: Parameters<F>) => void) => {
  let waiting: number | undefined;

  return (...args: Parameters<F>) => {
    if (waiting !== undefined) {
      clearTimeout(waiting);
    }
    waiting = setTimeout(() => f(...args), delay);
  };
};

type DebounceDecision<T> = { immediate: boolean, skip: boolean, args?: T };

// allow a second function to decide whether debounced function should be run immediately, or even skipped entirely
// func: the function to debounce
// decisionFunc: a function that will return whether to run func immediately, or skip running. also returns the arguments to pass to func
// delay: debounce delay in ms
export const maybeDebounce = <F extends ((...a: any[]) => void), G extends ((...b: any[]) => DebounceDecision<Parameters<F>>)>(
  func: F, decisionFunc: G, delay: number
): ((...a: Parameters<G>) => void) => {
  let waiting: number | undefined;

  return (...args: Parameters<G>) => {
    if (waiting !== undefined) {
      clearTimeout(waiting);
      waiting = undefined;
    }
    const decision = decisionFunc(...args);
    if (decision.skip)
      return;

    const decidedArgs = decision.args || [];
    if (decision.immediate)
      return func(...decidedArgs);

    waiting = setTimeout(() => func(...decidedArgs), delay);
  };
};

export const throttle = <F extends ((...a: any[]) => void)>(f: F, delay: number): ((...a: Parameters<F>) => void) => {
  let throttling = false;
  return (...args: Parameters<F>) => {
    if (throttling) return;
    throttling = true;
    setTimeout(() => {
      f(...args);
      throttling = false;
    }, delay)
  };
};

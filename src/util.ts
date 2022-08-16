export const debounce = <F extends ((...a: any[]) => void)>(f: F, delay: number): ((...a: Parameters<F>) => void) => {
  let waiting: number | undefined;

  return (...args: Parameters<F>) => {
    if (waiting !== undefined) {
      clearTimeout(waiting);
    }
    waiting = setTimeout(() => f(...args), delay);
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

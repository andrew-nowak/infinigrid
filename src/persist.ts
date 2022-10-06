const key = 'infinigrid-scroll-top';

export const persistScrollTop = (scrollTop: number) => {
  try {
    window.sessionStorage.setItem(key, scrollTop.toString());
  } catch { }
};

export const getScrollTop = (): number => {
  try {
    const s = window.sessionStorage.getItem(key);
    if (s === null) return 0;
    return parseInt(s);
  } catch {
    return 0;
  }
};

export const clearScrollTop = () => {
  try {
    window.sessionStorage.removeItem(key);
  } catch { }
};

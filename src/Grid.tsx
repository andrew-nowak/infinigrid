import { PropsWithChildren, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getScrollTop, persistScrollTop } from "./persist";
import { debounce, maybeDebounce } from "./util";

export type ColumnSpecValue = { minWidth: number, columns: number };
export type ColumnSpec = {
  default: number;
  spec?: ColumnSpecValue[];
};

const columnSpecSort = (a: ColumnSpecValue, b: ColumnSpecValue): number =>
  b.minWidth - a.minWidth;

const PAGE_MAX_ELS = 100000;

export type Range = { from: number; to: number };

type CardBackProps = {
  col: number;
  row: number;
};
const CardBack: React.FC<PropsWithChildren<CardBackProps>> = ({ row, col, children }) => {
  const gridArea = `${Math.floor(row) + 1} / ${col + 1} / auto / auto`;

  return <div style={{ gridArea }}>{children}</div>;
};

export type GridProps<T> = {
  load: (range: Range) => Promise<Range & { results: T[] }>;
  columnSpec: ColumnSpec;
  // This card should explicitly set its own height, and take steps to ensure that it does not exceed that height
  Card: React.ComponentType<T> & { height: number };
};

type Data<T> = { loading: true } | { value: T };

export function Grid<T>({
  load: loadRange,
  columnSpec,
  Card
}: GridProps<T>) {
  const r = useRef<HTMLDivElement | null>(null);
  const outerEl = useRef<HTMLDivElement | null>(null);

  const [fv, setFv] = useState<Data<T>[]>(new Array(100000));

  const load = useCallback((r: Range) => {
    setFv((pfv) => {
      const nfv = Array.from(pfv);

      for (let i = r.from; i < r.to; i++) {
        if (nfv[i] === undefined) nfv[i] = { loading: true };
      }

      return nfv;
    });
    loadRange(r).then((res) => {
      setFv((pfv) => {
        const nfv = Array.from(pfv);

        for (let i = 0; i < nfv.length; i++) {
          if (i >= r.from && i < r.to) {
            nfv[i] = { value: res.results[i - r.from] };
          } else if (i < r.from - 500 || i > r.to + 500) {
            // unload results that are significantly outside of current scroll
            delete nfv[i];
          }
        }
        console.log('here')
        return nfv;
      });
    });
  }, []);

  // fetch row height from the computed height of the rows - allows the cards to set their own height
  const [gridViewWidth, setGridViewWidth] = useState(r.current?.clientWidth ?? 400);
  const columnCount =
    columnSpec.spec?.sort(columnSpecSort)?.find(({ minWidth }) => minWidth <= gridViewWidth)?.columns ?? columnSpec.default;

  useLayoutEffect(() => {
    console.log('mounting resize handler', !!r.current);
    r.current?.clientWidth && setGridViewWidth(r.current.clientWidth);
    const resizeHandler = debounce(() => {
      console.log('handling resize');
      r.current?.clientWidth && setGridViewWidth(r.current?.clientWidth)
    }, 100);
    // TODO must be resizeobserver - other elements can change size forcing the width to change
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, [debounce, setGridViewWidth, r.current]);

  const rowsToLoad = 6;
  useEffect(() => {
    const rowHeight = Card.height + 16;
    const scrollTop = getScrollTop();
    if (outerEl.current && scrollTop !== 0) {
      console.log('scrolling to scrollTop', scrollTop, columnCount);
      outerEl.current.scrollTop = scrollTop;
    } else {
      const topRow = getScrollTop() / rowHeight;
      const firstCard = Math.floor(topRow) * columnCount;
      const lastCard = firstCard + (columnCount * rowsToLoad);
      const range = { from: firstCard, to: lastCard };
      console.log('firstload', range);
      load(range);
    }
  }, []);

  useEffect(() => {
    if (outerEl.current !== null && r.current !== null) {
      const el = outerEl.current;

      const doPersistScrollTop = debounce(persistScrollTop, 200);

      const scrollHandler = maybeDebounce(
        ({ from, to }: { from: number; to: number }) => {
          console.log('persisting', el.scrollTop);
          load({ from, to });
        },
        () => {
          const rowHeight = Card.height + 16;
          const topRow = Math.max(0, (el.scrollTop / rowHeight) - 2);
          const firstCard = Math.floor(topRow) * columnCount;
          console.log(`scrolled to ${el.scrollTop}; rowHeight is ${rowHeight}; columnCount is ${columnCount}`, `first in view is ${firstCard}`);
          doPersistScrollTop(el.scrollTop);

          const from = Math.max(0, firstCard)
          const to = Math.min(PAGE_MAX_ELS, firstCard + (columnCount * rowsToLoad))

          const fromLoaded = !!fv[from];
          const toLoaded = !!fv[to - 1];

          // skip load if entire range is already loaded
          // FIXME that's not what this does though! this only checks that the start and end have been loaded! but I don't want to loop in this func D:
          const skipLoad = fromLoaded && toLoaded;
          // skip the debouncing if the range to load touches a range already loaded (ie. user is scrolling slowly rather than quickly)
          const loadImmediately = (fromLoaded || toLoaded) && !(fromLoaded && toLoaded);

          return ({ immediate: loadImmediately, skip: skipLoad, args: [{ from, to }] });
        },
        333
      );

      el.addEventListener('scroll', scrollHandler);
      return function() {
        el.removeEventListener('scroll', scrollHandler);
      };
    }
  }, [load, columnCount, outerEl.current, fv]);

  const columnTemplate = `repeat(${columnCount}, 1fr)`;
  const rowTemplate = `repeat(${Math.ceil(PAGE_MAX_ELS / columnCount)}, ${Card.height}px)`;

  return (
    <>
      <div ref={outerEl} style={{ overflowY: 'scroll', width: '100%' }} className="hide-scrollbar">
        <div
          ref={r}
          style={{
            display: 'grid',
            width: '100%',
            height: 'fit-content',
            gridTemplateRows: rowTemplate,
            gridTemplateColumns: columnTemplate,
            gridAutoRows: '1fr',
            gap: '1rem',
          }}
        >
          {fv.map(
            (i, l) =>
              !!i && <CardBack key={l} row={l / columnCount} col={l % columnCount}>{
                ("value" in i ? (
                  <Card {...i.value} />
                ) : (
                  <p>LOADING</p>
                ))
              }</CardBack>
          )}
        </div>
      </div>
      <div>
        <div style={{ backgroundColor: 'orange', width: '25px', height: '25px' }}></div>
        <div style={{ backgroundColor: 'green', width: '25px', height: '25px' }}></div>
        <div style={{ backgroundColor: 'blue', width: '25px', height: '25px' }}></div>
      </div>
    </>
  );
};

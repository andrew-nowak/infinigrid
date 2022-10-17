import { PropsWithChildren, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getScrollTop, persistScrollTop } from "./persist";
import { debounce } from "./util";

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
      const scrollHandler = debounce(() => {
        const rowHeight = Card.height + 16;
        console.log(`scrolled to ${el.scrollTop}; rowHeight is ${rowHeight}; columnCount is ${columnCount}`);
        const topRow = el.scrollTop / rowHeight;
        const firstCard = Math.floor(topRow) * columnCount;
        console.log(`first in view is ${firstCard}`);
        console.log('persisting', el.scrollTop);
        persistScrollTop(el.scrollTop);
        load({ from: Math.max(0, firstCard), to: Math.min(PAGE_MAX_ELS, firstCard + (columnCount * rowsToLoad)) });
      }, 333);
      el.addEventListener('scroll', scrollHandler);
      return function() {
        el.removeEventListener('scroll', scrollHandler);
      };
    }
  }, [load, columnCount, outerEl.current]);

  const columnTemplate = `repeat(${columnCount}, 1fr)`;
  const rowTemplate = `repeat(${Math.ceil(PAGE_MAX_ELS / columnCount)}, ${Card.height}px)`;

  return (
    <div ref={outerEl} style={{ overflowY: 'scroll', width: '100%' }}>
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
                <Card
                  {...i.value}
                />
              ) : (
                <p>LOADING</p>
              ))
            }</CardBack>
        )}
      </div>
    </div>
  );
};

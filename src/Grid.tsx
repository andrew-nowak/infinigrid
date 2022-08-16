import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "./util";

export type ColumnSpecSpec = { minWidth: number, columns: number };
export type ColumnSpec = {
  default: number;
  spec?: ColumnSpecSpec[]
};

const columnSpecSort = (a: ColumnSpecSpec, b: ColumnSpecSpec): number =>
  b.minWidth - a.minWidth;

const PAGE_MAX_ELS = 10000;

export type Range = { from: number; to: number };

type CardBackProps = {
  col: number;
  row: number;
};
const CardBack: React.FC<PropsWithChildren<CardBackProps>> = ({ row, col, children }) => {
  const gridArea = `${Math.floor(row) + 1} / ${col + 1} / auto / auto`;

  return <div className="card" style={{ gridArea }}>{children}</div>;
};

export type GridProps<T> = {
  load: (range: Range) => Promise<Range & { results: T[] }>;
  columnSpec: ColumnSpec;
  Card: React.ComponentType<T>;
};

type Data<T> = { loading: true } | { value: T };

export function Grid<T>({
  load: loadRange,
  columnSpec,
  Card
}: GridProps<T>) {
  const r = useRef<HTMLDivElement | null>(null);

  const [fv, setFv] = useState<Data<T>[]>(new Array(100000));

  const load = useCallback((r: Range) => {
    setFv((pfv) => {
      const nfv = Array.from(pfv);

      for (let i = 0; i < nfv.length; i++) {
        if (i >= r.from && i < r.to && nfv[i] === undefined) {
          nfv[i] = { loading: true };
        } else if (i < r.from - 500 || i > r.to + 500) {
          // unload results that are significantly outside of current scroll
          delete nfv[i];
        }
      }

      return nfv;
    });
    loadRange(r).then((res) => {
      setFv((pfv) => {
        const nfv = Array.from(pfv);

        for (let i = 0; i < r.to - r.from; i++) {
          nfv[i + r.from] = { value: res.results[i] };
        }
        return nfv;
      });
    });
  }, []);

  const getRowHeight = useCallback(() => {
    if (r.current) {
      const rows = getComputedStyle(r.current).gridTemplateRows.split(" ");
      const rowGap = parseInt(getComputedStyle(r.current).rowGap, 10);
      if (rows.length) {
        const firstRow = parseInt(rows[0], 10);
        return (firstRow + rowGap);
      }
    }
    throw new Error("failed to calculate row height!!");
  }, [r.current]);

  const [windowWidth, setWindowWidth] = useState(window.visualViewport.width);
  const columnCount =
    columnSpec.spec?.sort(columnSpecSort).find(({ minWidth }) => minWidth <= windowWidth)?.columns ?? columnSpec.default;
  useEffect(() => {
    console.log('mounting resize handler');
    const resizeHandler = debounce(() => {
      console.log('handling resize');
      setWindowWidth(window.visualViewport.width)
    }, 100);
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, [debounce, setWindowWidth]);

  const rowsToLoad = 4;
  useEffect(() => {
    const rowHeight = getRowHeight();
    const topRow = window.scrollY / rowHeight;
    const firstCard = Math.floor(topRow) * columnCount;
    const lastCard = firstCard + (columnCount * rowsToLoad);
    const range = { from: firstCard, to: lastCard };
    load(range);
  }, []);

  useEffect(() => {
    const scrollHandler = debounce(() => {
      const rowHeight = getRowHeight();
      console.log(`scrolled to ${window.scrollY}; rowHeight is ${rowHeight}`);
      const topRow = window.scrollY / rowHeight;
      const firstCard = Math.floor(topRow) * columnCount;
      console.log(`first in view is ${firstCard}`);
      load({ from: firstCard, to: firstCard + (columnCount * rowsToLoad) });
    }, 333);
    window.addEventListener('scroll', scrollHandler);
    return () => window.removeEventListener('scroll', scrollHandler);
  }, [getRowHeight, load, columnCount]);

  const columnTemplate = `repeat(${columnCount}, 1fr)`;

  return (
    <div
      ref={r}
      className="App"
      id="App"
      style={{
        gridTemplateRows: `repeat(${PAGE_MAX_ELS / columnCount}, 1fr)`,
        gridTemplateColumns: columnTemplate
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
  );
};

import { PropsWithChildren, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./App.css";

const card = (i: string) => ({
  img: i,
  labels: ["lorem", "ipsum"],
  description: `${i} Lorem ipsum yadda yadda ${i}`,
});

type CardProps = {
  img: string;
  labels: string[];
  description: string;
};

type CardBackProps = {
  col: number;
  row: number;
};

const CardBack: React.FC<PropsWithChildren<CardBackProps>> = ({ row, col, children }) => {
  const gridArea = `${Math.floor(row) + 1} / ${col + 1} / auto / auto`;

  return <div className="card" style={{ gridArea }}>{children}</div>;
};

const PAGE_MAX_ELS = 10000;

const Card: React.FC<CardProps> = ({ img, labels, description }) => {
  useEffect(() => {
    console.log(`mounting ${description}`);
    return () => {
      console.log(`unmounting ${description}`);
    };
  }, []);
  return (
    <>
      <p className="no">{img}</p>
      <div className="labelcontainer">
        {labels.map((l) => (
          <span className="label" key={l}>
            {l}
          </span>
        ))}
      </div>
      <p>{description}</p>
    </>
  );
};

type Repo = (a: Range) => Promise<Range & {
  results: { value: string }[];
}>;

type Data = { loading: true } | { value: string };

type Range = { from: number; to: number };

const repo: Repo = async ({ from, to }) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        from,
        to,
        results: new Array(to - from).fill(0).map((_, i) => ({
          value: (i + from).toString(),
        })),
      });
    }, 5000);
  });
};

function App() {
  const r = useRef<HTMLDivElement | null>(null);

  const [columnCount, setColumnCount] = useState(5);
  const [fv, setFv] = useState<Data[]>(new Array(100000));

  const load = useCallback((r: Range) => {
    setFv((pfv) => {
      const nfv = Array.from(pfv);

      for (let i = 0; i < r.to - r.from; i++) {
        nfv[i + r.from] = { loading: true };
      }

      return nfv;
    });
    repo(r).then((res) => {
      setFv((pfv) => {
        const nfv = Array.from(pfv);

        for (let i = 0; i < r.to - r.from; i++) {
          nfv[i + r.from] = { value: res.results[i].value.toString() };
        }
        return nfv;
      });
    });
  }, []);

  useEffect(() => {
    const range = { from: 0, to: 2 };
    load(range);
  }, [load]);

  useLayoutEffect(() => {
    if (r.current)
      setColumnCount(
        getComputedStyle(r.current).gridTemplateColumns.split(" ").length
      );
  }, [r.current]);

  return (
    <>
      <p>There are {columnCount} columns here!</p>
      <button onClick={() => load({ from: 2, to: 72 })}>Add more!</button>
      <div
        ref={r}
        className="App"
        id="App"
        style={{ gridTemplateRows: `repeat(${PAGE_MAX_ELS / columnCount}, 1fr)` }}
      >
        {fv.map(
          (i, l) =>
            !!i && <CardBack key={l} row={l / columnCount} col={l % columnCount}>{
              ("value" in i ? (
                <Card
                  key={l}
                  {...card(i.value)}
                />
              ) : (
                <p key={"loading" + l}>LOADING</p>
              ))
            }</CardBack>
        )}
      </div>
    </>
  );
}

export default App;

import { useEffect } from "react";
import { Range, ColumnSpec, Grid } from "./Grid";
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



const Card: React.FC<CardProps> = ({ img, labels, description }) => {
  useEffect(() => {
    console.log(`mounting ${description}`);
    return () => {
      console.log(`unmounting ${description}`);
    };
  }, []);
  return (
    <div className="card">
      <p className="no">{img}</p>
      <div className="labelcontainer">
        {labels.map((l) => (
          <span className="label" key={l}>
            {l}
          </span>
        ))}
      </div>
      <p>{description}</p>
    </div>
  );
};


class Repo {
  async loadRange({ from, to }: Range): Promise<Range & { results: CardProps[] }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          from,
          to,
          results: new Array(to - from).fill(0).map((_, i) => ({
            ...card((i + from).toString()),
          })),
        });
      }, 250);
    });
  }
}

const repo: Repo = new Repo();

const columnSpec: ColumnSpec = {
  default: 2,
  spec: [{ minWidth: 800, columns: 3 }, { minWidth: 1200, columns: 4 }, { minWidth: 1600, columns: 5 }]
};

function App() {

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '4rem'
      }}>
        SEARCH BAR AND STUFF HERE
      </div>
      <div style={{ width: '100%', display: 'flex', overflowY: 'hidden' }}>
        <div style={{ width: '24rem' }}>COLLECTION PANEL</div>
        {/*<p>There are {columnCount} columns here!</p>*/}
        <Grid load={repo.loadRange} columnSpec={columnSpec} Card={Card} />
      </div>
    </div>
  );
}

export default App;

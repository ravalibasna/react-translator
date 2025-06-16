import { useEffect, useRef, useState } from "react";
import "./App.css";
import LanguageSelector from "./components/LanguageSelector";
import Progress from "./components/Progress";

function App() {
  // Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [input, setInput] = useState("I love walking my dog.");
  const [sourceLanguage, setSourceLanguage] = useState("eng_Latn");
  const [targetLanguage, setTargetLanguage] = useState("fra_Latn");
  const [output, setOutput] = useState("");

  const worker = useRef(null);

  useEffect(() => {
    worker.current ??= new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });

    // cb func for messages from worker threads
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case "initiate":
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
              }
              return item;
            })
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case "update":
          // Generation update: update the output text.
          setOutput((o) => o + e.data.output);
          break;

        case "complete":
          // Generation complete: re-enable the "Translate" button
          setDisabled(false);
          break;
      }
    };

    worker.current.addEventListener("message", onMessageReceived);

    return () =>
      worker.current.removeEventListener("message", onMessageReceived);
  });

  const translate = () => {
    setDisabled(true);
    setOutput("");
    worker.current.postMessage({
      text: input,
      src_lang: sourceLanguage,
      tgt_lang: targetLanguage,
    });
  };

  return (
    <>
      <h1>Transformers.js</h1>
      <h2>ML-powered multilingual translation in React!</h2>

      <div className="container">
        <div className="language-container">
          <LanguageSelector
            type={"Source"}
            defaultLanguage={"eng_Latn"}
            onChange={(x) => setSourceLanguage(x.target.value)}
          />
          <LanguageSelector
            type={"Target"}
            defaultLanguage={"fra_Latn"}
            onChange={(x) => setTargetLanguage(x.target.value)}
          />
        </div>

        <div className="textbox-container">
          <textarea
            value={input}
            rows={3}
            onChange={(e) => setInput(e.target.value)}
          ></textarea>
          <textarea value={output} rows={3} readOnly></textarea>
        </div>
      </div>

      <button disabled={disabled} onClick={translate}>
        Translate
      </button>

      <div className="progress-bars-container">
        {ready === false && <label>Loading models... (only run once)</label>}
        {progressItems.map((data) => (
          <div key={data.file}>
            <Progress text={data.file} percentage={data.progress} />
          </div>
        ))}
      </div>
    </>
  );
}

export default App;

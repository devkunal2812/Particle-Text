import { useState } from "react";
import ParticleCanvas from "./components/ParticleCanvas";
import Controls from "./components/Controls";

export default function App() {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState(undefined);

  return (
    <>
      <ParticleCanvas text={text} mode={mode} />
      <Controls mode={mode} onMode={setMode} onTextChange={setText} />
    </>
  );
}

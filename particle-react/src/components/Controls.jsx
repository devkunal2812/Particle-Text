import { useState, useRef } from "react";

const MODES = [
  { id: "text",    icon: "¶", label: "Text"    },
  { id: "wave",    icon: "∿", label: "Wave"    },
  { id: "spiral",  icon: "◎", label: "Spiral"  },
  { id: "scatter", icon: "✦", label: "Scatter" },
  { id: "gravity", icon: "↓", label: "Gravity" },
];

export default function Controls({ mode, onMode, onTextChange }) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef();

  function handleApply() {
    const v = inputVal.trim();
    if (v.length > 2) {
      onTextChange(v);
      setInputVal("");
      inputRef.current?.blur();
    }
  }

  return (
    <>
      {/* Brand — top left */}
      <div className="brand">
        <span className="brand-name">Kunal's</span>
        <span className="brand-tag">Build</span>
      </div>

      {/* Hint — top center */}
      <div className="hint">
        Move cursor to interact &nbsp;·&nbsp; Click a mode to transform
      </div>

      {/* Bottom control panel */}
      <div className="ui">
        <div className="controls" role="group" aria-label="Animation mode">
          {MODES.map(m => (
            <button
              key={m.id}
              className={`btn${mode === m.id ? " active" : ""}`}
              onClick={() => onMode(m.id)}
              aria-pressed={mode === m.id}
            >
              <span className="btn-icon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        <div className="input-row">
          <div className="input-wrap">
            <span className="input-icon">✎</span>
            <input
              ref={inputRef}
              className="text-input"
              type="text"
              maxLength={160}
              placeholder="Type your own text…"
              autoComplete="off"
              spellCheck="false"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleApply()}
            />
          </div>
          <button className="apply-btn" onClick={handleApply} title="Apply (Enter)">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

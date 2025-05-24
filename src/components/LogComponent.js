import React, { useEffect, useState, useRef } from 'react';
import '../css/LogComponent.css';

let appendExternalLog = null;

export function appendTextToLogComponent(text, options = {}) {
  if (appendExternalLog) {
    appendExternalLog({
      id: Date.now(),
      text: String(text),  // ensure it's a string
      error: !!options.error,
      warning: !!options.warning,
      blink: !!options.blink,
    });
  } else {
    console.warn("LogComponent is not ready to receive logs");
  }
}

export default function LogComponent() {
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    appendExternalLog = (log) => {
      setLogs(prev => [...prev, log]);
      console.log(log.id, log.text, log.warning, log.error, log.blink);  // Log the current length and the new log text);
    };
    return () => {
      appendExternalLog = null;
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={logRef}
      style={{
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid black',
        padding: '10px',
      }}
    >
      {logs.map(log => (
        <div
          key={log.id}
          className={`log-line${log.error ? ' error' : log.warning ? ' warn' : ''}${log.blink ? ' blink' : ''}`}
          style={{ margin: '4px 0' }}
        >
          {log.text}
        </div>
      ))}
    </div>
  );
}

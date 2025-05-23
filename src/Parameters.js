import React, { useRef, useState, useEffect } from 'react';

export default function Parameters() {
  const containerRef = useRef(null);
  const [parentSize, setParentSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      const parent = containerRef.current?.parentElement;
      if (parent) {
        const { width, height } = parent.getBoundingClientRect();
        setParentSize({ width: Math.round(width), height: Math.round(height) });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize(); // initial measure

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div ref={containerRef} className="parameters-container">
      <label className="std-text">
        Parent size — Width: {parentSize.width}px, Height: {parentSize.height}px
      </label>
    </div>
  );
}

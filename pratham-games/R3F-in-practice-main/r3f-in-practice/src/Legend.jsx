import React from "react";

export function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">Controls</div>
      <div>W/S: Accelerate / Reverse</div>
      <div>A/D: Steer Left / Right</div>
      <div>1: Default Camera</div>
      <div>2 or C: Roof Camera</div>
      <div className="legend-hint">Tip: Scroll to zoom</div>
    </div>
  );
}


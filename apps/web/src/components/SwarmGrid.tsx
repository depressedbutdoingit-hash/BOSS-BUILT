import { AGENTS, LAYER_LABELS, type Layer } from "../lib/agents";

export function SwarmGrid({
  active,
  done,
}: {
  active: Set<string>;
  done: Set<string>;
}) {
  const layers = [1, 2, 3, 4, 5, 6, 7] as Layer[];
  return (
    <div className="swarm-grid">
      {layers.map((layer) => {
        const cells = AGENTS.filter((a) => a.layer === layer);
        if (!cells.length) return null;
        return (
          <div className="layer" key={layer}>
            <div className="layer-label">{LAYER_LABELS[layer]}</div>
            <div className="layer-cells">
              {cells.map((a) => {
                const isActive = active.has(a.key);
                const isDone = done.has(a.key) && !isActive;
                return (
                  <div
                    key={a.key}
                    className={`cell ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    title={a.name}
                  >
                    {a.short}
                    {isActive && <span className="dot" />}
                    {isDone && (
                      <span className="dot" style={{ background: "hsl(140 80% 45%)" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

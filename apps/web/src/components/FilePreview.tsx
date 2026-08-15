export interface PreviewFile {
  path: string;
  content?: string;
  lines?: number;
}

export function FilePreview({
  files,
  selected,
  onSelect,
}: {
  files: PreviewFile[];
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const current = files.find((f) => f.path === selected) ?? files[0] ?? null;

  return (
    <div className="panel" style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className="panel-title">GENERATED FILES</div>
      {files.length === 0 ? (
        <div style={{ padding: 12, fontSize: 11, color: "hsl(40 5% 45%)" }}>
          Files appear here as Workers write them.
        </div>
      ) : (
        <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
          <div
            style={{
              width: 140,
              borderRight: "1px solid hsl(40 8% 14%)",
              overflow: "auto",
              fontSize: 10,
            }}
          >
            {files.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => onSelect(f.path)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  border: "none",
                  borderBottom: "1px solid hsl(40 8% 10%)",
                  background:
                    (current?.path === f.path
                      ? "hsl(42 40% 20% / 0.35)"
                      : "transparent"),
                  color:
                    current?.path === f.path
                      ? "hsl(42 95% 52%)"
                      : "hsl(220 8% 72%)",
                  fontFamily: "inherit",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {f.path.split("/").pop()}
                {f.lines != null && (
                  <span style={{ opacity: 0.5, marginLeft: 4 }}>{f.lines}L</span>
                )}
              </button>
            ))}
          </div>
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: 10,
              overflow: "auto",
              fontSize: 10,
              lineHeight: 1.45,
              color: "hsl(40 10% 85%)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {current?.content ??
              `// ${current?.path ?? ""}\n// Content streams in on live builds.\n// Demo mode shows paths only.`}
          </pre>
        </div>
      )}
    </div>
  );
}

import { useMemo, useRef, useState } from "react";

const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
const cols = Array.from({ length: 12 }, (_, i) => i + 1);

const exampleMapping = `1, TGCAATGCCAGTAG
2, TGCCATGTTAAGTA
3, CCGTAATGCTAGGC
4, GGTACCATTAAGCC
5, ATCGGCTAATCGTA`;

const modifications = [
  { value: "", label: "None" },
  { value: "/5FAM/", label: "5 Prime FAM" },
  { value: "/5Phos/", label: "5 Prime Phosphate" },
  { value: "/3BHQ1/", label: "3 Prime BHQ1" },
  { value: "/5Bio/", label: "5 Prime Biotin" },
];

function createInitialPlate() {
  return Object.fromEntries(rows.flatMap((r) => cols.map((c) => [`${r}${c}`, ""])));
}

function parseMapping(text: string) {
  const map: Record<string, string> = {};
  const issues: string[] = [];

  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const parts = line.split(",");
      if (parts.length < 2) {
        issues.push(`Line ${index + 1} is missing a comma`);
        return;
      }
      const id = parts[0].trim();
      const sequence = parts.slice(1).join(",").trim().replace(/\s+/g, "").toUpperCase();
      if (!id || !sequence) {
        issues.push(`Line ${index + 1} is incomplete`);
        return;
      }
      map[id] = sequence;
    });

  return { map, issues };
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [plate, setPlate] = useState<Record<string, string>>(createInitialPlate());
  const [mapping, setMapping] = useState(exampleMapping);
  const [modification, setModification] = useState("");
  const [preview, setPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState("MerMade_run_001");
  const [namePrefix, setNamePrefix] = useState("Oligo");
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { map, issues } = useMemo(() => parseMapping(mapping), [mapping]);
  const assignedCount = useMemo(() => Object.values(plate).filter(Boolean).length, [plate]);

  function updateWell(well: string, value: string) {
    setPlate((prev) => ({ ...prev, [well]: value }));
  }

  function buildPreviewText() {
    const output: string[] = [];
    const missing: string[] = [];
    let counter = 1;

    cols.forEach((c) => {
      rows.forEach((r) => {
        const well = `${r}${c}`;
        const id = plate[well]?.trim();
        if (!id) return;
        const sequence = map[id];
        if (!sequence) {
          missing.push(`${well} → ${id}`);
          return;
        }
        output.push(`${namePrefix}${counter}, ${modification}${sequence}`);
        counter += 1;
      });
    });

    return {
      text: output.join("\n"),
      missing,
    };
  }

  function generatePreview() {
    const { text, missing } = buildPreviewText();
    setMissingIds(missing);
    setPreview(text);
    setShowPreview(true);
  }

  function fillExamplePlate() {
    const next = createInitialPlate();
    next.A1 = "1";
    next.B1 = "2";
    next.C1 = "3";
    next.D1 = "4";
    next.E1 = "5";
    setPlate(next);
  }

  function clearPlate() {
    setPlate(createInitialPlate());
    setPreview("");
    setMissingIds([]);
    setShowPreview(false);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMapping(text);
    event.target.value = "";
  }

  function exportTxt() {
    const text = preview.trim() ? preview : buildPreviewText().text;
    if (!text.trim()) return;
    downloadFile(`${fileName || "sequence_file"}.txt`, text, "text/plain;charset=utf-8");
  }

  function exportCsv() {
    const text = preview.trim() ? preview : buildPreviewText().text;
    if (!text.trim()) return;
    downloadFile(`${fileName || "sequence_file"}.csv`, text, "text/csv;charset=utf-8");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eef4fb 0%, #f7f9fc 100%)",
        fontFamily: 'Inter, system-ui, Arial, sans-serif',
        color: "#142033",
        padding: 28,
      }}
    >
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <section
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #edf4ff 100%)",
            border: "1px solid #dce6f3",
            borderRadius: 28,
            padding: 30,
            boxShadow: "0 20px 50px rgba(17, 24, 39, 0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ maxWidth: 820 }}>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 10 }}>
                Oligo Sequence File Builder
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7, color: "#4d5d74" }}>
                A professional plate based interface for generating oligonucleotide sequence files for automated synthesizers.
                Paste or upload an ID to sequence directory, assign IDs visually on a 96 well plate, apply one modification
                across the run, then preview and export an instrument friendly sequence file.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(150px, 1fr))", gap: 14, flex: 1, minWidth: 360 }}>
              {[
                ["Plate format", "96 well"],
                ["Mapped IDs", String(Object.keys(map).length)],
                ["Assigned wells", String(assignedCount)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    border: "1px solid #dde7f4",
                    borderRadius: 20,
                    padding: 16,
                    boxShadow: "0 8px 20px rgba(17, 24, 39, 0.05)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#728198", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            background: "white",
            border: "1px solid #dde6f3",
            borderRadius: 26,
            padding: 24,
            boxShadow: "0 14px 34px rgba(20, 32, 51, 0.06)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 24, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Directory Mapping</div>
              <div style={{ color: "#5f6f86", fontSize: 14, marginBottom: 14, lineHeight: 1.6 }}>
                Paste ID and sequence pairs here or upload a CSV or TXT file. Example content is included so users can understand the expected format immediately.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <button onClick={handleUploadClick} style={secondaryButton}>Upload CSV or TXT</button>
                <button onClick={() => setMapping(exampleMapping)} style={secondaryButton}>Reset example mapping</button>
              </div>
              <textarea
                value={mapping}
                onChange={(e) => setMapping(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 220,
                  borderRadius: 18,
                  border: "1px solid #cfdaea",
                  padding: 16,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 14,
                  background: "#fbfcff",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {issues.length > 0 && (
                <div style={{ marginTop: 16, border: "1px solid #f1c1c1", background: "#fff5f5", color: "#a33a3a", borderRadius: 16, padding: 14, fontSize: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Mapping issues</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Quick Start</div>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  "1. Keep the example mapping or upload your own CSV or TXT ID and sequence list",
                  "2. Type IDs into the plate wells",
                  "3. Choose one modification and edit the naming prefix if needed",
                  "4. Click Preview and then export TXT or CSV",
                ].map((step) => (
                  <div
                    key={step}
                    style={{
                      border: "1px solid #e3eaf5",
                      borderRadius: 18,
                      padding: 14,
                      background: "linear-gradient(180deg, #fbfdff 0%, #f5f8fc 100%)",
                      fontSize: 14,
                      color: "#415069",
                      lineHeight: 1.6,
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            background: "white",
            border: "1px solid #dde6f3",
            borderRadius: 26,
            padding: 24,
            boxShadow: "0 14px 34px rgba(20, 32, 51, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Plate Editor</div>
              <div style={{ color: "#5f6f86", fontSize: 14, lineHeight: 1.6 }}>
                Type short IDs directly into the circular wells. Invalid or unmapped IDs are highlighted automatically.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={fillExamplePlate} style={primaryButton}>Load example</button>
              <button onClick={clearPlate} style={secondaryButton}>Clear plate</button>
            </div>
          </div>

          <div style={{ overflowX: "auto", paddingBottom: 8 }}>
            <div style={{ minWidth: 1120, display: "grid", gridTemplateColumns: "56px repeat(12, 1fr)", gap: 14, alignItems: "start" }}>
              <div />
              {cols.map((c) => (
                <div key={c} style={{ textAlign: "center", fontSize: 12, color: "#65758d", fontWeight: 800, letterSpacing: "0.04em" }}>
                  {c}
                </div>
              ))}

              {rows.map((r) => (
                <>
                  <div
                    key={`${r}-label`}
                    style={{
                      height: 104,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#65758d",
                    }}
                  >
                    {r}
                  </div>
                  {cols.map((c) => {
                    const well = `${r}${c}`;
                    const currentId = plate[well] || "";
                    const known = !currentId || Boolean(map[currentId]);
                    return (
                      <div key={well} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 11, color: "#75849a", fontWeight: 800 }}>{well}</div>
                        <input
                          value={currentId}
                          onChange={(e) => updateWell(well, e.target.value)}
                          placeholder="ID"
                          maxLength={3}
                          style={{
                            width: 74,
                            height: 74,
                            borderRadius: "50%",
                            border: known ? "2px solid #cfd9e8" : "2px solid #e58a8a",
                            background: known ? "radial-gradient(circle at 30% 25%, #ffffff 0%, #f6f9ff 100%)" : "#fff1f1",
                            textAlign: "center",
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#142033",
                            outline: "none",
                            boxShadow: known
                              ? "inset 0 2px 8px rgba(20, 32, 51, 0.04), 0 8px 14px rgba(20, 32, 51, 0.04)"
                              : "inset 0 2px 8px rgba(163, 58, 58, 0.08)",
                          }}
                        />
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            background: "white",
            border: "1px solid #dde6f3",
            borderRadius: 26,
            padding: 24,
            boxShadow: "0 14px 34px rgba(20, 32, 51, 0.06)",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Run Settings</div>
          <div style={{ color: "#5f6f86", fontSize: 14, marginBottom: 18, lineHeight: 1.6 }}>
            Choose naming and one modification to apply to the full sequence file.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <label style={labelStyle}>Output file name</label>
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={textInputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Name prefix</label>
              <input value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)} style={textInputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Modification for all wells</label>
              <select value={modification} onChange={(e) => setModification(e.target.value)} style={textInputStyle}>
                {modifications.map((m) => (
                  <option key={m.label} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Preview format</label>
              <input
                value={`${namePrefix || "Oligo"}1, SEQUENCE`}
                readOnly
                style={{ ...textInputStyle, background: "#f7f9fc", color: "#66758c" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            <button onClick={generatePreview} style={primaryButton}>Preview</button>
            <button onClick={exportTxt} style={secondaryButton} disabled={!preview.trim()}>Export TXT</button>
            <button onClick={exportCsv} style={secondaryButton} disabled={!preview.trim()}>Export CSV</button>
          </div>
        </section>

        {missingIds.length > 0 && (
          <section
            style={{
              background: "linear-gradient(180deg, #fff8f8 0%, #fff2f2 100%)",
              border: "1px solid #efc3c3",
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 10px 24px rgba(163, 58, 58, 0.05)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: "#a33a3a" }}>Missing sequence warning</div>
            <div style={{ color: "#8e4747", fontSize: 14, marginBottom: 12, lineHeight: 1.6 }}>
              These plate IDs do not have a corresponding sequence in the directory mapping and were not included in the preview.
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#8e4747", fontSize: 14, lineHeight: 1.7 }}>
              {missingIds.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {showPreview && (
          <section
            style={{
              background: "white",
              border: "1px solid #dde6f3",
              borderRadius: 26,
              padding: 24,
              boxShadow: "0 14px 34px rgba(20, 32, 51, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Preview</div>
                <div style={{ color: "#5f6f86", fontSize: 14, lineHeight: 1.6 }}>
                  Generated sequence lines appear here in column wise plate order while keeping the output naming format compatible with instruments such as Mermade.
                </div>
              </div>
              <div style={{
                border: "1px solid #dde6f3",
                borderRadius: 16,
                padding: "10px 14px",
                background: "#f8fbff",
                fontSize: 13,
                color: "#53637a",
                fontWeight: 700,
              }}>
                Total exported sequences: {preview ? preview.split("\n").filter(Boolean).length : 0}
              </div>
            </div>
            <textarea
              value={preview}
              readOnly
              placeholder="Oligo1, TGCAATGCCAGTAG"
              style={{
                width: "100%",
                minHeight: 280,
                borderRadius: 18,
                border: "1px solid #cfdaea",
                padding: 16,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 14,
                background: "#fbfcff",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 800,
  color: "#54657d",
  marginBottom: 8,
};

const textInputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #cfdaea",
  padding: "12px 14px",
  fontSize: 14,
  background: "#fbfcff",
  outline: "none",
  boxSizing: "border-box",
  color: "#1a2a40",
};

const primaryButton: React.CSSProperties = {
  border: "none",
  borderRadius: 14,
  background: "linear-gradient(180deg, #2a6bff 0%, #1f5eff 100%)",
  color: "white",
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(31, 94, 255, 0.22)",
};

const secondaryButton: React.CSSProperties = {
  border: "1px solid #d3ddec",
  borderRadius: 14,
  background: "white",
  color: "#25354c",
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(20, 32, 51, 0.04)",
};

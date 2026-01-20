import { useState } from "react";
import { Button, TextField, Paper } from "@mui/material";
import LayoutPreviewSVG from "./LayoutPreviewSVG";
import { LayoutJSON } from "../../../shared/types/layout";

const LayoutEditor: React.FC = () => {
  const [layout, setLayout] = useState<LayoutJSON>({
    version: 1,
    stage: { x: 300, y: 40, width: 400, height: 50, label: "Stage" },
    sections: [
      {
        id: "platea",
        label: "Platea",
        origin: { x: 500, y: 200 },
        rowSpacing: 64,
        seatSpacing: 52,
        rows: [
          { rowId: "A", seatCount: 12, curve: -2, stretch: 1.1 },
          { rowId: "B", seatCount: 14, curve: -2, stretch: 1.1 },
          { rowId: "C", seatCount: 18, curve: -2, stretch: 1.1 }
        ]
      }
    ]
  });

  async function save() {
    await fetch("/api/v1/layouts/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout)
    });
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Button variant="contained" onClick={save}>
        Save layout
      </Button>

      <LayoutPreviewSVG layout={layout} />
    </Paper>
  );
}

export default LayoutEditor;

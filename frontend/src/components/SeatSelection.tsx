// SeatSelection.tsx
import { useEffect, useState } from "react";
import { SeatMapSVG } from "./SeatMapSVG";

export function SeatSelection({ eventId }) {
  const [layout, setLayout] = useState(null);
  const [seatStates, setSeatStates] = useState({});
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/layout`).then(r => r.json()).then(setLayout);
    fetch(`/api/seats/${eventId}`).then(r => r.json()).then(setSeatStates);
  }, []);

  async function reserve() {
    const res = await fetch(`/api/seats/${eventId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIds: selected })
    });

    if (res.status === 409) {
      alert("Some seats were just taken");
    }
  }

  return (
    <>
      <SeatMapSVG
        layout={layout}
        seatStates={seatStates}
        selected={selected}
        onToggle={id =>
          setSelected(s =>
            s.includes(id) ? s.filter(x => x !== id) : [...s, id]
          )
        }
      />
      <button onClick={reserve}>Reserve</button>
    </>
  );
}

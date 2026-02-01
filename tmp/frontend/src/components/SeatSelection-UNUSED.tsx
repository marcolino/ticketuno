// SeatSelection.tsx
import { useEffect, useState } from "react";
import { Layout } from '../../../shared/types/layout';
import { SeatMapSVG } from "./SeatMapSVG";

interface SeatSelectionProps {
  eventId: string;
}

export function SeatSelection({ eventId }: SeatSelectionProps) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [seatStates, setSeatStates] = useState({});
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/layout`).then(r => r.json()).then(setLayout);
    fetch(`/api/seats/${eventId}`).then(r => r.json()).then(setSeatStates);
  }, [eventId]);

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

  if (!layout) return <div>Loading...</div>; // TODO: return null ...

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

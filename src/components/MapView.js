import React, { useState } from 'react';


const chargerTypes = [
  { type: "Level 1", time: "7 Hours", color: "green" },
  { type: "Level 2", time: "3 Hours", color: "orange" },
  { type: "DC Fast", time: "1.5 Hours", color: "red" }
];

const dummySlots = [
  { id: 1, type: "Level 1", booked: false },
  { id: 2, type: "Level 2", booked: true },
  { id: 3, type: "DC Fast", booked: false },
  { id: 4, type: "Level 2", booked: false },
  { id: 5, type: "Level 1", booked: true },
  { id: 6, type: "DC Fast", booked: false }
];

export default function MapView() {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const handleSlotClick = (slot) => {
    if (!slot.booked) {
      setSelectedSlot(slot);
    }
  };

  const confirmBooking = () => {
    alert(`✅ Slot ${selectedSlot.id} (${selectedSlot.type}) booked successfully!`);
    setSelectedSlot(null);
  };

  return (
    <div className="mapview-container">
      <h2>Select a Charging Slot</h2>
      <div className="legend">
        {chargerTypes.map((c, i) => (
          <span key={i} className="legend-item" style={{ background: c.color }}>
            {c.type} ({c.time})
          </span>
        ))}
      </div>

      <div className="slots-grid">
        {dummySlots.map(slot => (
          <div
            key={slot.id}
            className={`slot ${slot.booked ? "booked" : "available"} ${slot.type.replace(/\s/g, '')}`}
            onClick={() => handleSlotClick(slot)}
          >
            {slot.booked ? "Booked" : `Slot ${slot.id}`}
          </div>
        ))}
      </div>

      {selectedSlot && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirm Booking</h3>
            <p>You selected <strong>Slot {selectedSlot.id}</strong> - {selectedSlot.type}</p>
            <button onClick={confirmBooking}>Confirm</button>
            <button onClick={() => setSelectedSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

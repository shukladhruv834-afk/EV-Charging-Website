import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

function Confirmation() {
  const { state } = useLocation();
  const { booking } = state || {};
  const navigate = useNavigate();

  if (!booking) {
    navigate("/book");
    return null;
  }

  return (
    <Container className="py-5" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
      <Row className="justify-content-center">
        <Col md={6}>
          <Card
            className="border-0 text-center"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              animation: "slideIn 0.5s ease-out",
            }}
          >
            <Card.Body>
              <Card.Title className="text-white mb-4">Booking Confirmed!</Card.Title>
              <svg
                className="w-16 h-16 mx-auto text-green-400 mb-4"
                style={{ animation: "pulse 2s infinite" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-cyan-200">Slot: {booking.station_id.chargerType}</p>
              <p className="text-cyan-200">Location: {booking.station_id.location}</p>
              <p className="text-cyan-200">Time: {new Date(booking.startTime).toLocaleString()}</p>
              <p className="text-cyan-200">Total: ₹{booking.totalCost}</p>
              <p className="text-cyan-300 italic mt-3">A confirmation SMS has been sent to your phone</p>
              <Button
                variant="primary"
                onClick={() => navigate("/book")}
                className="mt-4"
                style={{ boxShadow: "0 0 10px rgba(0, 242, 254, 0.7)" }}
              >
                Book Another Slot
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </Container>
  );
}

export default Confirmation;
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, ProgressBar, Button, Alert, Card, Modal } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaBolt, FaCar, FaCheckCircle, FaMoneyBillWave } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

function ChargingScreen() {
  const { state } = useLocation();
  const { slot } = state || {};
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [chargingStatus, setChargingStatus] = useState("Initializing...");
  const [timeRemaining, setTimeRemaining] = useState("Calculating...");
  const [energyAdded, setEnergyAdded] = useState(0);
  const [cost, setCost] = useState(0);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!slot) {
      navigate("/book");
      return;
    }

    // Simulate charging process
    const timeline = [
      { time: 1000, status: "Connecting to vehicle", progress: 5 },
      { time: 3000, status: "Handshake established", progress: 10 },
      { time: 5000, status: "Charging started", progress: 15 },
      { time: 8000, status: "Charging at 25%", progress: 25 },
      { time: 12000, status: "Charging at 50%", progress: 50 },
      { time: 15000, status: "Charging at 75%", progress: 75 },
      { time: 18000, status: "Finalizing charge", progress: 90 },
      { time: 20000, status: "Charge complete", progress: 100 }
    ];

    timeline.forEach(({ time, status, progress }) => {
      setTimeout(() => {
        setChargingStatus(status);
        setProgress(progress);
        
        // Calculate simulated values
        if (progress > 0) {
          const minutes = Math.floor((100 - progress) * 0.2);
          setTimeRemaining(`${minutes} min remaining`);
          
          const energy = Math.round((progress / 100) * 60 * 100) / 100; // Assuming 60kWh battery
          setEnergyAdded(energy);
          
          const calculatedCost = Math.round((progress / 100) * slot.pricePerHour * 0.5 * 100) / 100; // 0.5 hour
          setCost(calculatedCost);
        }

        if (progress === 100) {
          setTimeout(() => setShowPayment(true), 1500);
        }
      }, time);
    });

    return () => {
      // Cleanup timers if component unmounts
      timeline.forEach(({ time }) => clearTimeout(time));
    };
  }, [slot, navigate]);

  const handleStopCharging = () => {
    navigate("/payment", { state: { slot, cost, energyAdded } });
  };

  return (
    <Container fluid className="charging-screen py-5">
      <Row className="justify-content-center">
        <Col lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="charging-container p-4"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "20px",
              border: "1px solid rgba(0, 242, 254, 0.5)",
              boxShadow: "0 0 30px rgba(0, 150, 255, 0.3)"
            }}
          >
            <h2 className="text-center text-white mb-4">
              <FaBolt className="me-2" />
              Charging Session
            </h2>
            
            {/* Charging Progress */}
            <div className="charging-progress mb-5">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-cyan-200">Charging Progress</span>
                <span className="text-cyan-200">{progress}%</span>
              </div>
              <ProgressBar 
                now={progress} 
                animated 
                striped 
                variant="success"
                style={{
                  height: "15px",
                  borderRadius: "10px",
                  background: "rgba(0, 0, 0, 0.3)"
                }}
              />
              <div className="text-center mt-2">
                <span className="text-info">{chargingStatus}</span>
                <span className="text-white ms-2">• {timeRemaining}</span>
              </div>
            </div>

            {/* Charging Details */}
            <Row className="mb-4">
              <Col md={4} className="text-center">
                <Card className="detail-card mb-3">
                  <Card.Body>
                    <h5 className="text-cyan-200">
                      <FaCar className="me-2" />
                      Vehicle
                    </h5>
                    <p className="text-white">Tesla Model 3</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="text-center">
                <Card className="detail-card mb-3">
                  <Card.Body>
                    <h5 className="text-cyan-200">
                      <FaBolt className="me-2" />
                      Energy Added
                    </h5>
                    <p className="text-white">{energyAdded} kWh</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="text-center">
                <Card className="detail-card mb-3">
                  <Card.Body>
                    <h5 className="text-cyan-200">
                      <FaMoneyBillWave className="me-2" />
                      Estimated Cost
                    </h5>
                    <p className="text-white">₹{cost}</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Station Info */}
            {slot && (
              <Card className="station-info mb-4">
                <Card.Body>
                  <h5 className="text-cyan-200">Charging Station Details</h5>
                  <Row>
                    <Col md={6}>
                      <p className="text-white">
                        <strong>Type:</strong> {slot.chargerType}
                      </p>
                      <p className="text-white">
                        <strong>Location:</strong> {slot.location}
                      </p>
                    </Col>
                    <Col md={6}>
                      <p className="text-white">
                        <strong>Power:</strong> {slot.powerRating} kW
                      </p>
                      <p className="text-white">
                        <strong>Rate:</strong> ₹{slot.pricePerHour}/hour
                      </p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="text-center mt-4">
              {progress < 100 ? (
                <Button
                  variant="danger"
                  onClick={handleStopCharging}
                  style={{
                    padding: "10px 30px",
                    borderRadius: "50px",
                    boxShadow: "0 0 15px rgba(255, 0, 0, 0.5)"
                  }}
                >
                  Stop Charging
                </Button>
              ) : (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <Button
                    variant="success"
                    onClick={() => setShowPayment(true)}
                    style={{
                      padding: "10px 30px",
                      borderRadius: "50px",
                      boxShadow: "0 0 15px rgba(0, 200, 83, 0.5)"
                    }}
                  >
                    <FaCheckCircle className="me-2" />
                    Proceed to Payment
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Payment Modal */}
      <Modal
        show={showPayment}
        onHide={() => setShowPayment(false)}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Body
          style={{
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: "1px solid rgba(0, 242, 254, 0.5)",
            borderRadius: "20px",
            color: "white"
          }}
        >
          <div className="text-center p-4">
            <h3 className="text-success mb-4">
              <FaCheckCircle size={50} />
            </h3>
            <h4 className="text-white mb-3">Charging Session Complete!</h4>
            <p className="text-cyan-200 mb-4">
              You've added {energyAdded} kWh to your vehicle.
            </p>
            
            <Card className="mb-4" style={{ 
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(0, 242, 254, 0.3)"
            }}>
              <Card.Body>
                <h5 className="text-white">Payment Summary</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-cyan-200">Energy Consumed:</span>
                  <span className="text-white">{energyAdded} kWh</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-cyan-200">Rate:</span>
                  <span className="text-white">₹{slot?.pricePerHour}/hour</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-cyan-200">Duration:</span>
                  <span className="text-white">~30 minutes</span>
                </div>
                <hr style={{ borderColor: "rgba(0, 242, 254, 0.3)" }} />
                <div className="d-flex justify-content-between">
                  <span className="text-cyan-200"><strong>Total:</strong></span>
                  <span className="text-white"><strong>₹{cost}</strong></span>
                </div>
              </Card.Body>
            </Card>
            
            <div className="d-flex justify-content-center gap-3">
              <Button
                variant="outline-light"
                onClick={() => navigate("/book")}
                style={{ borderRadius: "50px" }}
              >
                Book Another Session
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate("/payment", { state: { slot, cost, energyAdded } })}
                style={{ 
                  background: "linear-gradient(90deg, #00f2fe, #4facfe)",
                  border: "none",
                  borderRadius: "50px"
                }}
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default ChargingScreen;
import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { FaBolt, FaPlug } from "react-icons/fa";
import "./ChargingStationDemo.css";

function ChargingStationDemo() {
  const [charging, setCharging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voltage, setVoltage] = useState(400);
  const [current, setCurrent] = useState(50);
  const [power, setPower] = useState(20);

  useEffect(() => {
    let interval;
    if (charging) {
      interval = setInterval(() => {
        setProgress(prev => (prev >= 100 ? 100 : prev + 1));
        setVoltage(400 + Math.random() * 10 - 5);
        setCurrent(50 + Math.random() * 5 - 2.5);
        setPower(20 + Math.random() * 2 - 1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [charging]);

  const handleStartStop = () => {
    setCharging(!charging);
    if (!charging) setProgress(0);
  };

  return (
    <div className="station-demo-container">
      <div className="grid-overlay"></div>
      <div className="video-wrapper">
        <video autoPlay loop muted playsInline className="background-video">
          <source src="/videos/ev-background.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      <Container className="content-container">
        <Row className="justify-content-center text-center header-section">
          <Col xs={12} md={10} lg={8}>
            <h1 className="station-title">
              ZAPCHARGE STATION DEMO
              <span className="title-gradient">FUTURE OF EV CHARGING</span>
            </h1>
          </Col>
        </Row>

        <Row className="justify-content-center station-section">
          <Col xs={12} md={6} lg={4} className="station-visual">
            <div className="station-model">
              <div className="station-base"></div>
              <div className="station-pole"></div>
              <div className="station-head">
                <div className={`station-connector ${charging ? 'connected' : ''}`}></div>
              </div>
              <div className="station-glow"></div>
            </div>
          </Col>
          <Col xs={12} md={6} lg={4} className="station-controls">
            <div className="control-panel">
              <h3>Control Panel</h3>
              <div className="stats-display">
                <div className="stat-item">
                  <FaBolt className="stat-icon" />
                  <span>Voltage: {voltage.toFixed(1)} V</span>
                </div>
                <div className="stat-item">
                  <FaPlug className="stat-icon" />
                  <span>Current: {current.toFixed(1)} A</span>
                </div>
                <div className="stat-item">
                  <FaBolt className="stat-icon" />
                  <span>Power: {power.toFixed(1)} kW</span>
                </div>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${progress}%` }}></div>
                </div>
                <span>Charge: {progress}%</span>
              </div>
              <button
                className={`control-btn ${charging ? 'stop' : 'start'}`}
                onClick={handleStartStop}
                disabled={progress >= 100}
              >
                {charging ? 'STOP CHARGING' : 'START CHARGING'}
              </button>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ChargingStationDemo;
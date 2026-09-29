import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserLock, FaUserPlus, FaDownload, FaPlug, FaUserCog } from "react-icons/fa";
import { Container, Row, Col, Modal, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import evBackground from "./ev-background.mp4.mp4";
import "./Main.css";

const carArrivalVideo = "/videos/cararrival.mp4";
const hologramVideo = "/videos/hologram.mp4";
const particleVideo = "/videos/particles.mp4";

function MainPage() {
  const navigate = useNavigate();
  const zapRef = useRef(null);
  const chargeRef = useRef(null);
  const downloadBtnRef = useRef(null);
  const hologramRef = useRef(null);
  const particleCanvasRef = useRef(null);

  // Charging demo state
  const [showChargingDemo, setShowChargingDemo] = useState(false);
  const [carArrived, setCarArrived] = useState(false);
  const [charging, setCharging] = useState(false);
  const [chargingProgress, setChargingProgress] = useState(0);
  const [hologramActive, setHologramActive] = useState(false);
  const [particlesActive, setParticlesActive] = useState(true);

  useEffect(() => {
    // Initialize particle canvas
    if (particleCanvasRef.current) {
      const canvas = particleCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Particle system
      const particles = [];
      const particleCount = Math.floor(window.innerWidth / 10);
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          color: `rgba(0, 242, 254, ${Math.random() * 0.5 + 0.1})`
        });
      }
      
      const animateParticles = () => {
        if (!particlesActive) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw connecting lines
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
              ctx.strokeStyle = `rgba(0, 242, 254, ${1 - distance / 100})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
        
        // Draw particles
        particles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Update position
          p.x += p.speedX;
          p.y += p.speedY;
          
          // Boundary check
          if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
          if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        });
        
        requestAnimationFrame(animateParticles);
      };
      
      animateParticles();
      
      // Handle resize
      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [particlesActive]);

  useEffect(() => {
    // Logo animation
    const pulseAnimation = () => {
      let scale = 1;
      let direction = 0.005;

      const animate = () => {
        scale += direction;

        if (scale > 1.1) {
          direction = -0.005;
        } else if (scale < 1) {
          direction = 0.005;
        }

        if (zapRef.current && chargeRef.current) {
          zapRef.current.style.transform = `scale(${scale})`;
          chargeRef.current.style.transform = `scale(${1 + (1.1 - scale)})`;
        }

        requestAnimationFrame(animate);
      };
      animate();
    };

    pulseAnimation();

    // Ripple effects
    const downloadBtn = downloadBtnRef.current;
    const handleRipple = (e) => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      downloadBtn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 1000);
    };

    if (downloadBtn) downloadBtn.addEventListener("click", handleRipple);

    const demoButtons = document.querySelectorAll(".control-btn, .simulate-btn");
    const handleDemoRipple = (e) => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      e.target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 1000);
    };

    demoButtons.forEach((btn) => btn.addEventListener("click", handleDemoRipple));

    // Hologram interaction
    const hologram = hologramRef.current;
    if (hologram) {
      hologram.addEventListener('mouseenter', () => setHologramActive(true));
      hologram.addEventListener('mouseleave', () => setHologramActive(false));
    }

    return () => {
      if (downloadBtn) downloadBtn.removeEventListener("click", handleRipple);
      demoButtons.forEach((btn) => btn.removeEventListener("click", handleDemoRipple));
      if (hologram) {
        hologram.removeEventListener('mouseenter', () => setHologramActive(true));
        hologram.removeEventListener('mouseleave', () => setHologramActive(false));
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (charging) {
      const interval = setInterval(() => {
        setChargingProgress((prev) => (prev >= 100 ? 100 : prev + 1));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [charging]);

  const handleCarArrival = () => {
    setCarArrived(true);
    setTimeout(() => setCharging(true), 2000);
  };

  const handleStartStop = () => {
    setCharging(!charging);
  };

  const RedirectUser = () => {
    navigate("/login", { state: { redirectTo: "/book" } });
  };

  const RedirectRegistration = () => {
    navigate("/register");
  };

  const toggleParticles = () => {
    setParticlesActive(!particlesActive);
  };

  return (
    <div className="main-page-container">
      <div className="video-wrapper">
        <video autoPlay loop muted playsInline className="background-video">
          <source src={evBackground} type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      <canvas ref={particleCanvasRef} className="particle-canvas" id="particle-canvas"></canvas>
      <div className="grid-overlay"></div>
      <div className="cyberpunk-grid"></div>
      <div className="neon-grid"></div>

      <Container className="content-container">
        {/* Header Section */}
        <Row className="justify-content-center text-center header-section">
          <Col xs={12} md={10} lg={8}>
            <div className="hologram-container" ref={hologramRef}>
              <div className="hologram-effect">
                {hologramActive ? (
                  <video autoPlay loop muted playsInline className="hologram-video">
                    <source src={hologramVideo} type="video/mp4" />
                  </video>
                ) : (
                  <video autoPlay loop muted playsInline className="hologram-video">
                    <source src={particleVideo} type="video/mp4" />
                  </video>
                )}
              </div>
            </div>
            <h1 className="main-title neon-text">
              <span className="title-line">BUILDING THE LARGEST</span>
              <span className="main-gradient">EV CHARGING NETWORK</span>
              <span className="title-line">IN INDIA</span>
            </h1>
          </Col>
        </Row>

        {/* Tagline Section */}
        <Row className="justify-content-center tagline-section">
          <Col xs={12} md={8}>
            <div className="tagline-wrapper">
              <div className="tagline-item">
                <span className="tagline-icon">
                  <div className="neon-circle"></div>
                  <span className="icon-text">⚡</span>
                </span>
                <span>DISCOVER</span>
              </div>
              <div className="tagline-divider"></div>
              <div className="tagline-item">
                <span className="tagline-icon">
                  <div className="neon-circle"></div>
                  <span className="icon-text">🔋</span>
                </span>
                <span>CHARGE</span>
              </div>
              <div className="tagline-divider"></div>
              <div className="tagline-item">
                <span className="tagline-icon">
                  <div className="neon-circle"></div>
                  <span className="icon-text">💳</span>
                </span>
                <span>PAY</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* Logo Section */}
        <Row className="justify-content-center logo-section">
          <Col xs={12} md={6}>
            <div className="logo-wrapper">
              <span ref={zapRef} className="logo-part zap neon-text">ZAP</span>
              <span ref={chargeRef} className="logo-part charge neon-text">CHARGE</span>
              <div className="car-graphic">
                <div className="car-light left"></div>
                <div className="car-light right"></div>
              </div>
              <div className="logo-underline"></div>
            </div>
          </Col>
        </Row>

        {/* Download Section */}
        <Row className="justify-content-center download-section">
          <Col xs={12} md={6}>
            <button ref={downloadBtnRef} className="download-btn neon-btn">
              <span className="btn-ripple"></span>
              <FaDownload className="download-icon" />
              <span>DOWNLOAD THE APP NOW</span>
              <div className="neon-border-animation"></div>
            </button>
          </Col>
        </Row>

        {/* Portal Section */}
        <Row className="justify-content-center portal-section">
          <Col xs={12} sm={10} md={8} lg={6}>
            <Row>
              <Col xs={12} md={6} className="mb-4">
                <button onClick={RedirectUser} className="portal-btn user-portal glassmorphism">
                  <div className="portal-icon-wrapper">
                    <div className="portal-pulse"></div>
                    <FaUserLock className="portal-icon" />
                  </div>
                  <div className="portal-text">
                    <h3 className="neon-text">USER PORTAL</h3>
                    <p>Find and book charging stations</p>
                  </div>
                  <div className="portal-arrow">
                    <div className="arrow-line"></div>
                    <div className="arrow-head"></div>
                  </div>
                  <div className="portal-hover-effect"></div>
                </button>
              </Col>
              <Col xs={12} md={6} className="mb-4">
                <button onClick={RedirectRegistration} className="portal-btn registration-portal glassmorphism">
                  <div className="portal-icon-wrapper">
                    <div className="portal-pulse"></div>
                    <FaUserPlus className="portal-icon" />
                  </div>
                  <div className="portal-text">
                    <h3 className="neon-text">USER REGISTRATION</h3>
                    <p>Join our EV charging network</p>
                  </div>
                  <div className="portal-arrow">
                    <div className="arrow-line"></div>
                    <div className="arrow-head"></div>
                  </div>
                  <div className="portal-hover-effect"></div>
                </button>
              </Col>
            </Row>

            <Row className="mt-4">
              <Col xs={12} md={6} className="mb-3">
                <button onClick={() => setShowChargingDemo(true)} className="demo-btn charging-demo-btn neon-btn">
                  <FaPlug className="me-2" /> View Charging Demo
                </button>
              </Col>
              <Col xs={12} md={6} className="mb-3">
                <button onClick={() => navigate("/admin")} className="demo-btn admin-demo-btn neon-btn">
                  <FaUserCog className="me-2" /> Admin Dashboard
                </button>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Footer Section */}
        <Row className="justify-content-center footer-section">
          <Col xs={12} md={8}>
            <p className="copyright neon-text">
              © 2025 <span>ZAPCHARGE TECHNOLOGIES</span>. ALL RIGHTS RESERVED.
            </p>
            <button onClick={toggleParticles} className="particle-toggle-btn">
              {particlesActive ? 'Disable' : 'Enable'} Particle Network
            </button>
          </Col>
        </Row>
      </Container>

      {/* Charging Demo Modal */}
      <Modal
        show={showChargingDemo}
        onHide={() => {
          setShowChargingDemo(false);
          setCarArrived(false);
          setCharging(false);
          setChargingProgress(0);
        }}
        size="lg"
        centered
        className="glassmorphism-modal"
      >
        <Modal.Header closeButton className="neon-border">
          <Modal.Title className="neon-text">Charging Station Demo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="charging-demo-container">
            <div className="charger-visual">
              <div className="charger-head">
                <div className={`connector ${carArrived ? "connected" : ""}`}>
                  <div className="electric-sparks"></div>
                </div>
              </div>
              <div className="charger-body glassmorphism">
                <div className="display neon-text">
                  {!carArrived && <span>READY</span>}
                  {carArrived && !charging && <span>CONNECTED</span>}
                  {charging && (
                    <>
                      <span>CHARGING</span>
                      <div className="progress-bar">
                        <div className="progress" style={{ width: `${chargingProgress}%` }}>
                          <div className="progress-sparkles"></div>
                        </div>
                      </div>
                      <span>{chargingProgress}%</span>
                    </>
                  )}
                </div>
                <button
                  className={`control-btn ${charging ? "stop" : "start"} neon-btn`}
                  onClick={handleStartStop}
                  disabled={!carArrived || chargingProgress >= 100}
                >
                  {charging ? "STOP" : "START"}
                  <div className="btn-electric-effect"></div>
                </button>
              </div>
            </div>

            <div className="car-simulator-section">
              <button
                className="simulate-btn neon-btn"
                onClick={handleCarArrival}
                disabled={carArrived}
              >
                Simulate Car Arrival
                <div className="btn-electric-effect"></div>
              </button>

              {carArrived && (
                <div className="car-animation">
                  <video autoPlay muted loop className="car-video">
                    <source src={carArrivalVideo} type="video/mp4" />
                  </video>
                  <div className="car-electric-field"></div>
                </div>
              )}
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default MainPage;
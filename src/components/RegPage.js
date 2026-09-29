import React, { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { IoFlashSharp } from "react-icons/io5";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Register.css";

const API_BASE_URL = process.env.REACT_APP_BACKEND_API || "http://localhost:3001";

function RegPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    phoneNumber: "",
    city: "Lucknow",
    state: "Uttar Pradesh",
    vehicleInfo: { model: "", batteryCapacity: "" },
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const formRef = useRef(null);
  const mountRef = useRef(null);
  const navigate = useNavigate();

  // Particle initialization
  const particlesInit = async (main) => {
    await loadFull(main);
  };

  // Three.js setup for 3D car model
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(300, 300);

    // Capture mountRef.current in a variable to use in cleanup
    const mountElement = mountRef.current;
    mountElement.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(2, 1, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
    const car = new THREE.Mesh(geometry, material);
    scene.add(car);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      car.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      // Use the captured variable in cleanup
      mountElement.removeChild(renderer.domElement);
    };
  }, []);

  // Form input handling
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "model" || name === "batteryCapacity") {
      setFormData((prev) => ({
        ...prev,
        vehicleInfo: { ...prev.vehicleInfo, [name]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    // Clear form error for this field when the user starts typing
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Client-side form validation
  const validateForm = () => {
    const errors = {};
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const phoneRegex = /^\+91[0-9]{10}$/;

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    }
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      errors.email = "Please provide a valid email";
    }
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (!formData.phoneNumber) {
      errors.phoneNumber = "Phone number is required";
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      errors.phoneNumber = "Phone must be +91 followed by 10 digits (e.g., +919876543210)";
    }
    if (!formData.city.trim()) {
      errors.city = "City is required";
    }
    if (!formData.state.trim()) {
      errors.state = "State is required";
    }
    if (formData.vehicleInfo.batteryCapacity && isNaN(parseFloat(formData.vehicleInfo.batteryCapacity))) {
      errors.batteryCapacity = "Battery capacity must be a number";
    }

    return errors;
  };

  // Form submission with sound effect
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    setFormErrors({});

    // Client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    const zapSound = new Audio("/zap.mp3");
    zapSound.play();

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          vehicleInfo: {
            ...formData.vehicleInfo,
            batteryCapacity: parseFloat(formData.vehicleInfo.batteryCapacity) || 0,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Button hover sound
  const playHoverSound = () => {
    const hoverSound = new Audio("/engine-hum.mp3");
    hoverSound.play();
  };

  return (
    <div className="register-container">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          fullScreen: { enable: true, zIndex: -1 },
          particles: {
            number: { value: 100, density: { enable: true, value_area: 1000 } },
            color: { value: ["#00ffcc", "#ff00ff", "#00ffff", "#ffffff"] },
            shape: { type: ["circle", "edge", "star"] },
            opacity: { value: 0.8, random: true, anim: { enable: true, speed: 1, opacity_min: 0.3 } },
            size: { value: 3, random: true, anim: { enable: true, speed: 2, size_min: 0.5 } },
            line_linked: { enable: false },
            move: {
              enable: true,
              speed: 4,
              direction: "bottom",
              random: true,
              straight: false,
              out_mode: "out",
              attract: { enable: true, rotateX: 600, rotateY: 1200 },
            },
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: { enable: true, mode: "bubble" },
              onclick: { enable: true, mode: "push" },
              resize: true,
            },
            modes: {
              bubble: { distance: 200, size: 5, duration: 2, opacity: 0.8 },
              push: { quantity: 4 },
            },
          },
          retina_detect: true,
        }}
      />
      <div className="car-silhouette" />
      <Container fluid className="register-content">
        <Row className="w-100 justify-content-center">
          <Col xl={8} lg={10} md={12} className="registration-column">
            <div className="holographic-card" ref={formRef}>
              <div className="card-glow"></div>
              <div className="holographic-elements">
                <div className="holo-orb orb-1"></div>
                <div className="holo-orb orb-2"></div>
                <div className="holo-orb orb-3"></div>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <div className="logo-container">
                    <IoFlashSharp className="logo-icon" />
                    <h1 className="neon-text">
                      ZAP<span className="neon-glow">CHARGE</span>
                    </h1>
                  </div>
                  <div ref={mountRef} className="car-hologram" />
                  <p className="card-subtitle neon-subtitle">
                    Join the Intergalactic EV Revolution
                  </p>
                </div>
                {error && (
                  <div className="status-message error">
                    <span className="neon-error">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="status-message success">
                    <span className="neon-success">{success}</span>
                  </div>
                )}
                <Form onSubmit={handleSubmit} className="registration-form">
                  <div className="form-grid">
                    <div className="form-column">
                      <h3 className="form-section-title neon-title">Personal Data Matrix</h3>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">Username*</Form.Label>
                        <Form.Control
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="Enter Cyber ID"
                          className="form-field neon-input"
                          aria-label="Username"
                          required
                          isInvalid={!!formErrors.username}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.username}
                        </Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">Email*</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your@galaxy.com"
                          className="form-field neon-input"
                          aria-label="Email"
                          required
                          isInvalid={!!formErrors.email}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.email}
                        </Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">Password*</Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Quantum Passcode"
                          className="form-field neon-input"
                          aria-label="Password"
                          required
                          isInvalid={!!formErrors.password}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.password}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </div>
                    <div className="form-column">
                      <h3 className="form-section-title neon-title">Location Coordinates</h3>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">Phone Number*</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="+919876543210"
                          pattern="\+91[0-9]{10}"
                          className="form-field neon-input"
                          aria-label="Phone Number"
                          required
                          isInvalid={!!formErrors.phoneNumber}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.phoneNumber}
                        </Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">City*</Form.Label>
                        <Form.Control
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Enter Colony"
                          className="form-field neon-input"
                          aria-label="City"
                          required
                          isInvalid={!!formErrors.city}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.city}
                        </Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">State*</Form.Label>
                        <Form.Control
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="Enter Region"
                          className="form-field neon-input"
                          aria-label="State"
                          required
                          isInvalid={!!formErrors.state}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.state}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </div>
                    <div className="form-column">
                      <h3 className="form-section-title neon-title">Vehicle Blueprint</h3>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">Vehicle Model</Form.Label>
                        <Form.Control
                          as="select"
                          name="model"
                          value={formData.vehicleInfo.model}
                          onChange={handleChange}
                          className="form-field neon-input"
                          aria-label="Vehicle Model"
                        >
                          <option value="">Select Hypercraft</option>
                          <option value="Mahindra">Mahindra eVerito</option>
                          <option value="Tata">Tata Nexon EV</option>
                          <option value="Kia">Kia EV6</option>
                          <option value="MG">MG ZS EV</option>
                          <option value="Hyundai">Hyundai Kona</option>
                          <option value="Tesla">Tesla Model 3</option>
                          <option value="Other">Other Hypercraft</option>
                        </Form.Control>
                      </Form.Group>
                      <Form.Group className="form-field-container">
                        <Form.Label className="neon-label">Battery Capacity (kWh)</Form.Label>
                        <Form.Control
                          type="number"
                          name="batteryCapacity"
                          value={formData.vehicleInfo.batteryCapacity}
                          onChange={handleChange}
                          placeholder="e.g. 40.5"
                          className="form-field neon-input"
                          aria-label="Battery Capacity"
                          isInvalid={!!formErrors.batteryCapacity}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.batteryCapacity}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </div>
                  </div>
                  <div className="submit-container">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="submit-button neon-button"
                      onMouseEnter={playHoverSound}
                    >
                      {isSubmitting ? "Initializing..." : "Activate Registration"}
                    </Button>
                  </div>
                </Form>
                <div className="login-redirect">
                  <p className="neon-text">
                    Already Synced?{" "}
                    <a href="/login" className="login-link neon-link">
                      Access Portal
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default RegPage;
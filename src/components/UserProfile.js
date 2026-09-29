import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Alert, Spinner } from "react-bootstrap";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const API_BASE_URL = process.env.REACT_APP_BACKEND_API || "http://localhost:3001";

function UserPortal() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/book");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("UserData", JSON.stringify(data.user));

      setSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        navigate("/book", { state: { from: location }, replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Container
      fluid
      className="py-5"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Row className="w-100">
        <Col md={6} className="d-none d-md-block">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center text-white"
          >
            <h1 style={{ fontSize: "3rem", textShadow: "0 0 15px rgba(0, 242, 254, 0.7)" }}>
              Welcome to ZapCharge User Portal
            </h1>
            <p style={{ fontSize: "1.2rem", color: "rgba(0, 242, 254, 0.9)" }}>
              Log in to access EV charging stations across India
            </p>
          </motion.div>
        </Col>

        <Col md={6} xs={12}>
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(0, 242, 254, 0.5)",
              borderRadius: "15px",
              padding: "30px",
              boxShadow: "0 0 20px rgba(0, 242, 254, 0.3)",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            <h3 className="text-center text-white mb-4" style={{ textShadow: "0 0 10px rgba(0, 242, 254, 0.7)" }}>
              User Login
            </h3>
            {error && (
              <Alert variant="danger" onClose={() => setError("")} dismissible>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" onClose={() => setSuccess("")} dismissible>
                {success}
              </Alert>
            )}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="text-white">Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    borderColor: "rgba(0, 242, 254, 0.5)",
                    color: "#fff",
                  }}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="text-white">Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    borderColor: "rgba(0, 242, 254, 0.5)",
                    color: "#fff",
                  }}
                />
              </Form.Group>
              <Button
                type="submit"
                variant="primary"
                className="w-100"
                disabled={loading}
                style={{
                  background: "linear-gradient(90deg, #00f2fe, #4facfe)",
                  border: "none",
                  boxShadow: "0 0 15px rgba(0, 242, 254, 0.7)",
                }}
              >
                {loading ? (
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                ) : (
                  "Log In"
                )}
              </Button>
            </Form>
            <p className="text-center text-white mt-3">
              Don't have an account?{" "}
              <a
                href="/register"
                style={{ color: "rgba(0, 242, 254, 0.9)", textDecoration: "none" }}
              >
                Register
              </a>
            </p>
            <div className="text-center mt-3">
              <Button
                variant="outline-light"
                onClick={() => navigate("/user/login")}
                className="w-100"
              >
                Login with Google
              </Button>
            </div>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
}

export default UserPortal;
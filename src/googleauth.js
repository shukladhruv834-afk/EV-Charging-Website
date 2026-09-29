import React, { useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";


const API_BASE_URL = process.env.REACT_APP_BACKEND_API || "http://localhost:3001";

// Main component that wraps everything with GoogleOAuthProvider
export default function GoogleAuthWrapper() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <GoogleAuthLogin />
    </GoogleOAuthProvider>
  );
}

function GoogleAuthLogin() {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState(() => {
    try {
      const data = localStorage.getItem("loginData");
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error parsing login data:", error);
      return null;
    }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (credentialResponse) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data._id || !data.token) {
        throw new Error("Invalid response data");
      }

      localStorage.setItem("loginData", JSON.stringify(data));
      setLoginData(data);
      navigate(`/user/${data._id}`);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("loginData");
      setLoginData(null);
      setError(null);
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Logout failed. Please try again.");
    }
  };

  useEffect(() => {
    if (loginData?.token) {
      navigate(`/user/${loginData._id}`);
    }
  }, [loginData, navigate]);

  // Inline styles (same as before)
  const styles = {
    // ... your existing styles ...
  };

  return (
    <div style={styles.authContainer}>
      <Container fluid style={{ height: "100%" }}>
        <Row style={{ height: "100%", alignItems: "center" }}>
          <Col xs={12} md={{ span: 6, offset: 3 }} style={styles.authBox}>
            {error && (
              <div style={styles.alert}>
                {error}
              </div>
            )}
            
            {loading ? (
              <div style={{ textAlign: "center" }}>
                <div 
                  style={styles.spinner}
                  className="spinner-border text-primary" 
                  role="status"
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p>Logging you in...</p>
              </div>
            ) : loginData ? (
              <div style={styles.loggedInContainer}>
                <h3 style={styles.welcomeText}>Welcome, {loginData.name || loginData.email}!</h3>
                <p style={styles.emailText}>{loginData.email}</p>
                <button 
                  onClick={handleLogout} 
                  style={styles.logoutBtn}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div style={styles.googleLoginContainer}>
                <h2 style={styles.loginTitle}>Sign in with Google</h2>
                <GoogleLogin 
                  onSuccess={handleLogin}
                  onError={() => {
                    console.log('Login Failed');
                    setError('Google login failed. Please try again.');
                  }}
                  useOneTap
                  auto_select
                  theme="filled_blue"
                  size="large"
                  shape="rectangular"
                  text="signin_with"
                />
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
}
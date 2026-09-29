import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Alert, Modal, Spinner, ProgressBar, Form } from "react-bootstrap";
import { motion } from "framer-motion";
import GoogleMapReact from "google-map-react";
import {
  FaCreditCard,
  FaCheckCircle,
  FaTimesCircle,
  FaCar,
  FaBolt,
  FaDirections,
  FaUser,
  FaMapMarkerAlt,
  FaClock,
  FaMoneyBillWave,
  FaWallet,
  FaSync
} from "react-icons/fa";
import { GiEvilTree } from "react-icons/gi";
import { IoMdSpeedometer } from "react-icons/io";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import io from 'socket.io-client';
import { debounce } from 'lodash';
import "bootstrap/dist/css/bootstrap.min.css";
import "./Book.css";

const API_BASE_URL = process.env.REACT_APP_BACKEND_API || "http://localhost:3001";
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
const carArrivalVideo = "/videos/cararrival.mp4";

const config = {
  defaultBookingDurationHours: parseInt(process.env.REACT_APP_DEFAULT_BOOKING_DURATION) || 1,
  maxRetries: parseInt(process.env.REACT_APP_MAX_RETRIES) || 3,
  rfidTimeout: parseInt(process.env.REACT_APP_RFID_TIMEOUT) || 30000,
};

const Marker = ({ text, isUser, type, onClick, isSelected, distance }) => (
  <motion.div
    className={`map-marker ${isUser ? 'user-marker' : 'station-marker'} ${type}`}
    whileHover={{ scale: 1.2 }}
    onClick={onClick}
    role="button"
    aria-label={isUser ? "Your location" : `Charging station: ${text}`}
    tabIndex={0}
    onKeyPress={(e) => e.key === 'Enter' && onClick()}
  >
    {isUser ? (
      <div className="pulse-dot">
        <div className="pulse-ring"></div>
        <div className="user-label">You</div>
      </div>
    ) : (
      <>
        <div className="marker-icon">
          <FaBolt className={`bolt-icon ${type === 'fast' ? 'fast' : ''}`} />
          <div className="marker-pulse"></div>
        </div>
        <span className="marker-text">{text}</span>
        {isSelected && type === "fast" && distance && (
          <div className="distance-label">
            {distance} km
          </div>
        )}
      </>
    )}
  </motion.div>
);

function BookSlot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showChargingDemo, setShowChargingDemo] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [bookingData, setBookingData] = useState(null);
  const [map, setMap] = useState(null);
  const [maps, setMaps] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [selectedDistance, setSelectedDistance] = useState(null);
  const [rfidStatus, setRfidStatus] = useState('waiting');
  const [rfidCardId, setRfidCardId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [cardBalance, setCardBalance] = useState(0);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [carArrived, setCarArrived] = useState(false);
  const [charging, setCharging] = useState(false);
  const [chargingProgress, setChargingProgress] = useState(0);

  // Fetch card balance from backend
  const fetchBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view balance");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    try {
      console.log('[Frontend] Fetching balance with token:', token);
      const response = await fetch(`${API_BASE_URL}/api/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        console.log('[Frontend] Balance fetched:', data.balance);
        setCardBalance(data.balance);
      } else {
        throw new Error(data.message || "Failed to fetch balance");
      }
    } catch (err) {
      console.error('[Frontend] Fetch balance error:', err);
      if (err.message.includes("Session expired") || err.status === 401) {
        setError("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login", { state: { from: location.pathname } });
      } else {
        setError("Failed to fetch card balance: " + err.message);
      }
    }
  }, [navigate, location]);

  // Fetch chargers
  const fetchSlots = useCallback(async (retryCount = 0) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view charging stations");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chargers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(response.status === 401 ? "Session expired" : "Failed to fetch slots");
      }

      const data = await response.json();
      const chargers = data.success && data.chargers
        ? data.chargers.map(charger => ({
            ...charger,
            lat: charger.geoLocation?.coordinates?.[1] || 26.8467,
            lng: charger.geoLocation?.coordinates?.[0] || 80.9462
          }))
        : [];
      
      setSlots(chargers);
      setError("");
      console.log('[Frontend] Fetched chargers:', chargers);
    } catch (err) {
      console.error('[Frontend] Fetch slots error:', err);
      if (err.message.includes("Session expired") || err.status === 401) {
        setError("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login", { state: { from: location.pathname } });
      } else if (retryCount < config.maxRetries) {
        setTimeout(() => fetchSlots(retryCount + 1), 2000 * (retryCount + 1));
      } else {
        setError(err.message || "Error fetching charging slots");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, location]);

  const debouncedFetchSlots = debounce(fetchSlots, 300);

  // Handle RFID tap
  const handleRfidTap = useCallback(async (rfidData) => {
    console.log('[Frontend] Received rfid-tap:', rfidData);
    console.log('[Frontend] Selected slot ID:', selectedSlot?._id, 'RFID station ID:', rfidData.stationId);
    
    if (!showPaymentModal) {
      console.log('[Frontend] Ignoring rfid-tap: Payment modal not open');
      setError('Please click "Book This Slot" to open the payment modal before tapping RFID card');
      return;
    }

    if (!selectedSlot || rfidData.stationId !== selectedSlot._id.toString()) {
      console.log('[Frontend] Ignoring rfid-tap: Station ID mismatch or no slot selected');
      setPaymentError('Selected charger does not match RFID reader. Please select the correct charger.');
      setRfidStatus('failed');
      return;
    }

    try {
      setRfidStatus('detected');
      const normalizedRfidCardId = rfidData.rfidCardId.toUpperCase();
      setRfidCardId(normalizedRfidCardId);
      console.log('[Frontend] Normalized RFID Card ID:', normalizedRfidCardId, 'Expected:', 'CFCFB1C4');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRfidStatus('processing');
      console.log('[Frontend] Initiating RFID payment request...');

      const token = localStorage.getItem("token");
      console.log('[Frontend] Using token:', token);
      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      const totalCost = selectedSlot.pricePerHour * config.defaultBookingDurationHours;
      if (cardBalance < totalCost) {
        throw new Error(`Insufficient balance: ₹${cardBalance.toFixed(2)} available, ₹${totalCost.toFixed(2)} required. Please recharge your card.`);
      }

      console.log('[Frontend] Sending POST /api/rfid-payment with:', {
        rfidCardId: normalizedRfidCardId,
        stationId: selectedSlot._id,
        startTime: rfidData.startTime,
        endTime: rfidData.endTime,
        readerId: rfidData.readerId
      });

      const response = await fetch(`${API_BASE_URL}/api/rfid-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          rfidCardId: normalizedRfidCardId,
          stationId: selectedSlot._id,
          startTime: rfidData.startTime,
          endTime: rfidData.endTime,
          readerId: rfidData.readerId
        })
      });

      const paymentData = await response.json();
      console.log('[Frontend] Received /api/rfid-payment response:', paymentData);
      
      if (!response.ok) {
        throw new Error(paymentData.message || `Payment failed with status ${response.status}`);
      }

      setCardBalance(paymentData.walletBalance);
      setBookingData(paymentData.booking);
      setRfidStatus('success');
      setPaymentStatus('success');
      setRetryCount(0);
      console.log('[Frontend] Payment successful, booking:', paymentData.booking);

      setTimeout(() => {
        setShowPaymentModal(false);
        setShowChargingDemo(true);
      }, 2000);

    } catch (err) {
      console.error("[Frontend] RFID Payment Error:", err);
      setRfidStatus('failed');
      setPaymentStatus('failed');
      setPaymentError(err.message || "Payment failed. Please try again or pay with balance.");
      if (retryCount < config.maxRetries) {
        setTimeout(() => {
          setRfidStatus('waiting');
          setPaymentStatus(null);
          setPaymentError("");
          setRetryCount(prev => prev + 1);
        }, 2000);
      }
    }
  }, [selectedSlot, showPaymentModal, cardBalance, retryCount]);

  // Handle recharge by calling the backend /api/recharge endpoint
  const handleRecharge = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setPaymentError("Please log in to recharge");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Please enter a valid amount (minimum ₹100)");
      return;
    }
    if (amount < 100) {
      setPaymentError("Minimum recharge amount is ₹100");
      return;
    }

    try {
      setIsPaying(true);
      console.log(`[Frontend] Sending POST /api/recharge with amount: ₹${amount}, token: ${token}`);
      const response = await fetch(`${API_BASE_URL}/api/recharge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      console.log("[Frontend] Received /api/recharge response:", data);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please log in again.");
        } else if (response.status === 400) {
          throw new Error(data.message || "Invalid recharge amount");
        } else {
          throw new Error(data.message || `Recharge failed with status ${response.status}`);
        }
      }

      if (!data.success || typeof data.walletBalance === 'undefined') {
        throw new Error(data.message || "Invalid response from server");
      }

      setCardBalance(data.walletBalance);
      await fetchBalance(); // Refresh balance to ensure consistency
      setRechargeAmount("");
      setPaymentError("");
      setPaymentStatus("recharged");
      setSuccess(`Successfully recharged ₹${amount}. New balance: ₹${data.walletBalance}`);
      setRfidStatus("waiting");
      console.log(`[Frontend] Recharged card with ₹${amount}. New balance: ₹${data.walletBalance}`);

      setTimeout(() => {
        setPaymentStatus(null);
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("[Frontend] Recharge Error:", err);
      if (err.message.includes("Session expired") || err.message.includes("No token provided")) {
        setPaymentError("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login", { state: { from: location.pathname } });
      } else {
        setPaymentError(err.message || "Recharge failed. Please try again.");
      }
    } finally {
      setIsPaying(false);
    }
  }, [rechargeAmount, navigate, location, fetchBalance]);

  // Debounce the recharge function
  const debouncedHandleRecharge = useCallback(debounce(handleRecharge, 1000), [handleRecharge]);

  // Handle direct payment with balance
  const handlePayWithBalance = useCallback(async () => {
    if (!selectedSlot) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setPaymentError("Please log in to pay with balance");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    try {
      setIsPaying(true);
      setRfidStatus('processing');
      const totalCost = selectedSlot.pricePerHour * config.defaultBookingDurationHours;
      if (cardBalance < totalCost) {
        throw new Error(`Insufficient balance: ₹${cardBalance.toFixed(2)} available, ₹${totalCost.toFixed(2)} required. Please recharge your card.`);
      }

      console.log('[Frontend] Using token for balance payment:', token);
      const now = new Date();
      const endTime = new Date(now.getTime() + config.defaultBookingDurationHours * 60 * 60 * 1000);

      console.log('[Frontend] Sending POST /api/rfid-payment with balance payment:', {
        rfidCardId: 'DUMMY_CFCFB1C4',
        stationId: selectedSlot._id,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        readerId: 'DUMMY_READER001'
      });

      const response = await fetch(`${API_BASE_URL}/api/rfid-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          rfidCardId: 'DUMMY_CFCFB1C4',
          stationId: selectedSlot._id,
          startTime: now.toISOString(),
          endTime: endTime.toISOString(),
          readerId: 'DUMMY_READER001'
        })
      });

      const paymentData = await response.json();
      console.log('[Frontend] Received /api/rfid-payment response:', paymentData);
      
      if (!response.ok) {
        throw new Error(paymentData.message || `Payment failed with status ${response.status}`);
      }

      setCardBalance(paymentData.walletBalance);
      setBookingData(paymentData.booking);
      setRfidStatus('success');
      setPaymentStatus('success');
      setRetryCount(0);
      console.log('[Frontend] Balance payment successful, booking:', paymentData.booking);

      setTimeout(() => {
        setShowPaymentModal(false);
        setShowChargingDemo(true);
      }, 2000);

    } catch (err) {
      console.error("[Frontend] Balance Payment Error:", err);
      setRfidStatus('failed');
      setPaymentStatus('failed');
      setPaymentError(err.message || "Payment failed. Please try again.");
      if (retryCount < config.maxRetries) {
        setTimeout(() => {
          setRfidStatus('waiting');
          setPaymentStatus(null);
          setPaymentError("");
          setRetryCount(prev => prev + 1);
        }, 2000);
      }
    } finally {
      setIsPaying(false);
    }
  }, [selectedSlot, cardBalance, retryCount, navigate, location]);

  // Handle RFID errors
  const handleRfidError = useCallback((errorData) => {
    console.error('[Frontend] RFID Error:', errorData);
    setRfidStatus('failed');
    setPaymentStatus('failed');
    setPaymentError(errorData.message || "RFID processing failed");
    if (retryCount < config.maxRetries) {
      setTimeout(() => {
        setRfidStatus('waiting');
        setPaymentStatus(null);
        setPaymentError("");
        setRetryCount(prev => prev + 1);
      }, 2000);
    }
  }, [retryCount]);

  // Charging demo logic
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

  // Socket.IO and initial setup
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError("Map unavailable: API key missing");
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5
    });

    socket.on('connect', () => console.log('[Frontend] Connected to WebSocket'));
    socket.on('disconnect', () => console.log('[Frontend] Disconnected from WebSocket'));
    socket.on('rfid-tap', handleRfidTap);
    socket.on('rfid-error', handleRfidError);

    fetchSlots();
    fetchBalance();
    getUserLocation();

    return () => {
      socket.disconnect();
    };
  }, [fetchSlots, handleRfidTap, handleRfidError, fetchBalance]);

  // RFID timeout handling
  useEffect(() => {
    if (showPaymentModal && rfidStatus === 'waiting') {
      const timer = setTimeout(() => {
        if (rfidStatus === 'waiting') {
          setRfidStatus('failed');
          setPaymentStatus('failed');
          setPaymentError("No RFID card detected. Please try again or pay with balance.");
          if (retryCount < config.maxRetries) {
            setTimeout(() => {
              setRfidStatus('waiting');
              setPaymentStatus(null);
              setPaymentError("");
              setRetryCount(prev => prev + 1);
            }, 2000);
          }
        }
      }, config.rfidTimeout);

      return () => clearTimeout(timer);
    }
  }, [showPaymentModal, rfidStatus, retryCount]);

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setUserLocation({ lat: 26.8467, lng: 80.9462 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setUserLocation({ lat: 26.8467, lng: 80.9462 });
    }
  };

  const handleSelectSlot = (slot) => {
    if (!slot.available) {
      setError("This slot is already booked");
      return;
    }
    setSelectedSlot(slot);
    setError("");
    console.log('[Frontend] Selected slot:', slot);
    if (slot.chargerType === "DC Fast") {
      getDirections({ lat: slot.lat, lng: slot.lng });
    } else {
      setSelectedDistance(null);
    }
  };

  const handleBookSlot = () => {
    setShowConfirmModal(true);
  };

  const confirmBooking = () => {
    setShowConfirmModal(false);
    setShowPaymentModal(true);
    setPaymentStatus(null);
    setPaymentError("");
    setRfidStatus('waiting');
    setRfidCardId(null);
    setRetryCount(0);
  };

  const getDirections = async (destination) => {
    try {
      if (!userLocation) {
        throw new Error("Your location is not available");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      console.log('[Frontend] Fetching directions...');
      const response = await fetch(
        `${API_BASE_URL}/api/directions?` +
        `originLat=${userLocation.lat}&originLng=${userLocation.lng}&` +
        `destinationLat=${destination.lat}&destinationLng=${destination.lng}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to get directions");
      }

      if (data.success) {
        const route = data.directions.routes?.[0];
        const distanceText = route?.legs?.[0]?.distance?.text;
        if (distanceText) {
          const distanceKm = parseFloat(distanceText.replace(" km", ""));
          setSelectedDistance(distanceKm.toFixed(1));
        }
        renderDirections(data.directions);
      }
    } catch (error) {
      console.error("[Frontend] Directions Error:", error);
      setError(`Directions error: ${error.message}`);
      setSelectedDistance(null);
    }
  };

  const renderDirections = (directionsData) => {
    if (!map || !maps || !directionsData) return;

    if (directionsRenderer) {
      directionsRenderer.setMap(null);
    }

    const newDirectionsRenderer = new maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#00b4ff",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      },
      preserveViewport: true,
    });

    newDirectionsRenderer.setMap(map);
    newDirectionsRenderer.setDirections(directionsData);
    setDirectionsRenderer(newDirectionsRenderer);
  };

  const handleMapLoad = (map, maps) => {
    setMap(map);
    setMaps(maps);
  };

  const handleMarkerClick = (slot) => {
    handleSelectSlot(slot);
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="map-error">
        <p>Unable to load map: Missing API key</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading charging stations...</span>
      </div>
    );
  }

  return (
    <Container fluid className="booking-container futuristic-bg">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="header-section"
      >
        <h2 className="booking-title neon-text">Book Your Charging Station</h2>
        <p className="subtitle">Find and book chargers in Lucknow and Sitapur</p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Alert variant="danger" className="error-alert" onClose={() => setError("")} dismissible>
            {error}
          </Alert>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Alert variant="success" className="success-alert" onClose={() => setSuccess("")} dismissible>
            {success}
          </Alert>
        </motion.div>
      )}

      <Row className="main-content">
        <Col lg={8} className="map-column">
          <div className="map-container glass-card">
            <GoogleMapReact
              bootstrapURLKeys={{ key: GOOGLE_MAPS_API_KEY }}
              center={userLocation || { lat: 26.8467, lng: 80.9462 }}
              defaultZoom={12}
              yesIWantToUseGoogleMapApiInternals
              onGoogleApiLoaded={({ map, maps }) => handleMapLoad(map, maps)}
              options={{
                styles: [
                  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
                  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
                ],
                gestureHandling: "greedy"
              }}
            >
              {slots.map((slot) => (
                <Marker
                  key={slot._id}
                  lat={slot.lat}
                  lng={slot.lng}
                  text={slot.chargerType}
                  type={slot.chargerType.includes("Fast") ? "fast" : "standard"}
                  onClick={() => handleMarkerClick(slot)}
                  isSelected={selectedSlot?._id === slot._id}
                  distance={selectedSlot?._id === slot._id ? selectedDistance : null}
                />
              ))}
              {userLocation && (
                <Marker lat={userLocation.lat} lng={userLocation.lng} isUser />
              )}
            </GoogleMapReact>
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-icon user"></span>
                <span>Your Location</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon fast"></span>
                <span>Fast Charger</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon standard"></span>
                <span>Standard Charger</span>
              </div>
            </div>
          </div>
        </Col>

        <Col lg={4} className="slots-column">
          <div className="slots-container glass-card">
            <div className="slots-header">
              <h4>Available Stations</h4>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => debouncedFetchSlots()}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : 'Refresh'}
              </Button>
            </div>

            {slots.length === 0 ? (
              <div className="no-slots">
                <GiEvilTree size={48} />
                <p>No charging stations available in your area</p>
                <Button variant="primary" onClick={() => debouncedFetchSlots()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="slots-grid">
                {slots.map((slot) => (
                  <motion.div
                    key={slot._id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className={`slot-card ${selectedSlot?._id === slot._id ? 'selected' : ''} ${slot.available ? '' : 'booked'}`}
                    onClick={() => handleSelectSlot(slot)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && handleSelectSlot(slot)}
                  >
                    <div className="slot-header">
                      <div className="charger-type">
                        <FaBolt className={`type-icon ${slot.chargerType.includes("Fast") ? 'fast' : 'standard'}`} />
                        <span>{slot.chargerType}</span>
                      </div>
                      <div className={`availability ${slot.available ? 'available' : 'booked'}`}>
                        {slot.available ? 'Available' : 'Booked'}
                      </div>
                    </div>

                    <h5 className="location">
                      <FaMapMarkerAlt className="me-2" />
                      {slot.address}
                    </h5>

                    <div className="slot-details">
                      <div className="detail-item">
                        <IoMdSpeedometer className="detail-icon" />
                        <span>{slot.powerRating} kW</span>
                      </div>
                      <div className="deal-item">
                        <RiMoneyDollarCircleLine className="detail-icon" />
                        <span>₹{slot.pricePerHour}/hr</span>
                      </div>
                    </div>

                    <div className="car-icon-container">
                      <FaCar className="car-icon" />
                      <div className="distance-indicator">
                        {selectedSlot?._id === slot._id && slot.chargerType === "DC Fast" && selectedDistance
                          ? `${selectedDistance} km`
                          : `${Math.floor(Math.random() * 10) + 1} km`}
                      </div>
                    </div>

                    <Button
                      variant="outline-info"
                      size="sm"
                      className="directions-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        getDirections({ lat: slot.lat, lng: slot.lng });
                      }}
                    >
                      <FaDirections /> Get Directions
                    </Button>

                    {selectedSlot?._id === slot._id && (
                      <motion.div
                        className="selection-indicator"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <div className="pulse-ring"></div>
                        <div className="inner-circle"></div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Col>
      </Row>

      {selectedSlot && (
        <motion.div
          className="booking-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(0, 180, 255, 0.6)" }}
            whileTap={{ scale: 0.95 }}
            className="book-btn futuristic-btn"
            onClick={handleBookSlot}
          >
            <FaBolt className="btn-icon" />
            Book This Slot
            <span className="btn-glow"></span>
          </motion.button>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
        className="confirm-modal futuristic-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to book this slot at {selectedSlot?.address} for ₹{(selectedSlot?.pricePerHour * config.defaultBookingDurationHours).toFixed(2)}?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmBooking}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* RFID Payment Modal */}
      <Modal
        show={showPaymentModal}
        onHide={() => {
          setShowPaymentModal(false);
          setPaymentStatus(null);
          setPaymentError("");
          setRfidStatus('waiting');
          setRetryCount(0);
          setRechargeAmount('');
        }}
        centered
        className="payment-modal futuristic-modal"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton className="modal-header">
          <Modal.Title>
            <FaCreditCard className="title-icon" />
            <span>RFID Payment</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {paymentStatus === 'success' && (
            <Alert variant="success" className="mb-3">
              Payment Successful! Your slot is booked.
            </Alert>
          )}
          {paymentStatus === 'recharged' && (
            <Alert variant="success" className="mb-3">
              Card recharged successfully! New Balance: ₹{cardBalance.toFixed(2)}
            </Alert>
          )}
          {paymentStatus === 'failed' && (
            <Alert variant="danger" className="mb-3">
              Payment Failed: {paymentError}
            </Alert>
          )}

          <div className="payment-details glass-card mb-4">
            <h5>{selectedSlot?.address}</h5>
            <div className="detail-row">
              <span><FaBolt /> Charger Type:</span>
              <span className="value">{selectedSlot?.chargerType}</span>
            </div>
            <div className="detail-row">
              <span><FaMoneyBillWave /> Total:</span>
              <span className="value price">₹{(selectedSlot?.pricePerHour * config.defaultBookingDurationHours).toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span><FaWallet /> Card Balance:</span>
              <span className="value">₹{cardBalance.toFixed(2)}</span>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              className="mt-2"
              onClick={fetchBalance}
              disabled={isPaying}
            >
              <FaSync className="me-2" />
              Refresh Balance
            </Button>
          </div>

          {rfidStatus === 'waiting' && (
            <div className="rfid-waiting">
              <div className="rfid-animation">
                <div className="rfid-reader">
                  <div className="rfid-light"></div>
                  <div className="rfid-slot"></div>
                </div>
                <div className="rfid-card"></div>
              </div>
              
              <h4 className="mt-4">Waiting for RFID Card</h4>
              <p className="text-muted">Tap your RFID card or pay with balance (Attempt {retryCount + 1}/{config.maxRetries + 1})</p>

              <div className="recharge-section mt-4">
                <h5><FaWallet className="me-2" /> Recharge Card</h5>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="number"
                    placeholder="Enter amount (min ₹100)"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    min="100"
                    step="1"
                    isInvalid={rechargeAmount && (isNaN(rechargeAmount) || parseFloat(rechargeAmount) <= 0 || parseFloat(rechargeAmount) < 100)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Amount must be at least ₹100
                  </Form.Control.Feedback>
                </Form.Group>
                <Button
                  variant="success"
                  onClick={debouncedHandleRecharge}
                  disabled={isPaying || !rechargeAmount || parseFloat(rechargeAmount) < 100 || isNaN(rechargeAmount)}
                >
                  {isPaying ? <Spinner size="sm" /> : <FaWallet className="me-2" />}
                  {isPaying ? 'Processing...' : 'Recharge Now'}
                </Button>
              </div>

              <Button
                variant="primary"
                className="mt-3"
                onClick={handlePayWithBalance}
                disabled={isPaying || cardBalance < (selectedSlot?.pricePerHour * config.defaultBookingDurationHours)}
              >
                {isPaying ? <Spinner size="sm" /> : <FaMoneyBillWave className="me-2" />}
                {isPaying ? 'Processing...' : 'Pay with Balance'}
              </Button>
            </div>
          )}

          {rfidStatus === 'detected' && (
            <div className="rfid-detected">
              <div className="success-animation">
                <div className="checkmark-circle">
                  <div className="checkmark"></div>
                </div>
              </div>
              <h4 className="mt-4">Card Detected!</h4>
              <p className="text-muted">Processing your payment...</p>
              <div className="card-id">
                <FaUser className="me-2" />
                {rfidCardId}
              </div>
            </div>
          )}

          {rfidStatus === 'processing' && (
            <div className="rfid-processing">
              <div className="processing-animation">
                <div className="orbit">
                  <div className="electron"></div>
                </div>
                <div className="orbit">
                  <div className="electron"></div>
                </div>
                <div className="orbit">
                  <div className="electron"></div>
                </div>
                <div className="core"></div>
              </div>
              <h4 className="mt-4">Processing Payment</h4>
              <p className="text-muted">Please wait while we verify your transaction</p>
              <ProgressBar animated now={75} className="mt-3" />
            </div>
          )}

          {rfidStatus === 'success' && (
            <div className="rfid-success">
              <div className="success-animation">
                <FaCheckCircle className="success-icon" />
                <div className="success-circle"></div>
              </div>
              <h4 className="mt-4 text-success">Payment Successful!</h4>
              <h5 className="mt-3">Slot Booked!</h5>
              
              <div className="booking-summary glass-card mt-4">
                <h5>Booking Confirmed</h5>
                <div className="summary-item">
                  <span><FaMapMarkerAlt /> Location:</span>
                  <span>{selectedSlot?.address}</span>
                </div>
                <div className="summary-item">
                  <span><FaClock /> Duration:</span>
                  <span>1 hour</span>
                </div>
                <div className="summary-item">
                  <span><FaMoneyBillWave /> Amount:</span>
                  <span className="price">₹{bookingData?.totalCost || (selectedSlot?.pricePerHour * config.defaultBookingDurationHours).toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span><FaWallet /> New Balance:</span>
                  <span>₹{cardBalance.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="redirect-message mt-3">
                <Spinner size="sm" className="me-2" />
                Redirecting to charging demo...
              </div>
            </div>
          )}

          {rfidStatus === 'failed' && (
            <div className="rfid-failed">
              <div className="failed-animation">
                <FaTimesCircle className="failed-icon" />
              </div>
              <h4 className="mt-4 text-danger">Payment Failed</h4>
              <p className="text-danger">{paymentError}</p>
              
              {retryCount < config.maxRetries ? (
                <Button
                  variant="primary"
                  className="mt-3"
                  onClick={() => {
                    setRfidStatus('waiting');
                    setPaymentStatus(null);
                    setPaymentError("");
                    setRetryCount(prev => prev + 1);
                  }}
                >
                  Try Again (Attempt {retryCount + 2}/{config.maxRetries + 1})
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentStatus(null);
                    setPaymentError("");
                    setRfidStatus('waiting');
                    setRetryCount(0);
                  }}
                >
                  Close
                </Button>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Charging Demo Modal */}
      <Modal
        show={showChargingDemo}
        onHide={() => {
          setShowChargingDemo(false);
          setCarArrived(false);
          setCharging(false);
          setChargingProgress(0);
          navigate("/charging", {
            state: {
              booking: bookingData,
              stationData: selectedSlot,
            },
          });
        }}
        size="lg"
        centered
        className="charging-demo-modal futuristic-modal"
      >
        <Modal.Header closeButton className="modal-header">
          <Modal.Title className="neon-text">Charging Station Demo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="charging-demo-container">
            <div className="charger-visual">
              <div className="charger-head">
                <div className={`connector ${carArrived ? "connected" : ""}`}></div>
              </div>
              <div className="charger-body glass-card">
                <div className="display neon-text">
                  {!carArrived && <span>READY</span>}
                  {carArrived && !charging && <span>CONNECTED</span>}
                  {charging && (
                    <>
                      <span>CHARGING</span>
                      <div className="progress-bar">
                        <div className="progress" style={{ width: `${chargingProgress}%` }}></div>
                      </div>
                      <span>{chargingProgress}%</span>
                    </>
                  )}
                </div>
                <Button
                  className={`control-btn ${charging ? "stop" : "start"} futuristic-btn`}
                  onClick={handleStartStop}
                  disabled={!carArrived || chargingProgress >= 100}
                >
                  {charging ? "STOP" : "START"}
                </Button>
              </div>
            </div>

            <div className="car-simulator-section">
              <Button
                className="simulate-btn futuristic-btn"
                onClick={handleCarArrival}
                disabled={carArrived}
              >
                Simulate Car Arrival
              </Button>

              {carArrived && (
                <div className="car-animation">
                  <video autoPlay muted loop className="car-video">
                    <source src={carArrivalVideo} type="video/mp4" />
                  </video>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="primary"
            className="mt-3 futuristic-btn"
            onClick={() => {
              setShowChargingDemo(false);
              setCarArrived(false);
              setCharging(false);
              setChargingProgress(0);
              navigate("/charging", {
                state: {
                  booking: bookingData,
                  stationData: selectedSlot,
                },
              });
            }}
          >
            Proceed to Charging
          </Button>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default BookSlot;
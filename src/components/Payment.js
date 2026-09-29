import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { FaCreditCard, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_BACKEND_API || "http://localhost:3001";
const socket = io(API_BASE_URL);

const RfidPaymentModal = ({ show, onHide, station, user, durationHours }) => {
  const [status, setStatus] = useState('waiting'); // waiting, detected, processing, success, failed
  const [error, setError] = useState('');
  const [rfidCardId, setRfidCardId] = useState('');
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    const handleRfidTap = (data) => {
      if (data.stationId !== station._id) return;
      
      setRfidCardId(data.rfidCardId);
      setStatus('detected');
      
      // Process payment after short delay
      setTimeout(() => processPayment(data.rfidCardId), 1000);
    };

    socket.on('rfid-tap', handleRfidTap);
    return () => socket.off('rfid-tap', handleRfidTap);
  }, [station]);

  const processPayment = async (cardId) => {
    try {
      setStatus('processing');
      
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
      const totalCost = station.pricePerHour * durationHours;

      const response = await fetch(`${API_BASE_URL}/api/rfid-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rfidCardId: cardId,
          stationId: station._id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Payment failed');

      setBookingData(data.booking);
      setStatus('success');
      
      // Close modal after delay
      setTimeout(() => {
        onHide();
        window.location.href = `/charging/${data.booking._id}`;
      }, 2000);

    } catch (err) {
      console.error('Payment error:', err);
      setStatus('failed');
      setError(err.message);
    }
  };

  const resetPayment = () => {
    setStatus('waiting');
    setError('');
    setRfidCardId('');
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaCreditCard className="me-2" />
          RFID Payment
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {status === 'waiting' && (
          <div className="payment-waiting">
            <div className="rfid-animation mb-3">
              <div className="rfid-reader"></div>
              <div className="rfid-card"></div>
            </div>
            <h4>Waiting for RFID Card</h4>
            <p className="text-muted">Please tap your RFID card on the reader</p>
            
            <div className="payment-details mt-4 p-3 bg-light rounded">
              <h5>{station.address}</h5>
              <p>Charger: {station.chargerType}</p>
              <p>Duration: {durationHours} hours</p>
              <p className="fw-bold">
                Total: ₹{(station.pricePerHour * durationHours).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {status === 'detected' && (
          <div className="payment-detected">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h4>Card Detected!</h4>
            <p className="text-muted">Processing your payment...</p>
            <p className="text-muted small">{rfidCardId}</p>
          </div>
        )}

        {status === 'processing' && (
          <div className="payment-processing">
            <ProgressBar animated now={75} className="mb-3" />
            <h4>Processing Payment</h4>
            <p className="text-muted">Please wait while we verify your transaction</p>
          </div>
        )}

        {status === 'success' && (
          <div className="payment-success">
            <FaCheckCircle className="text-success mb-3" size={48} />
            <h4>Payment Successful!</h4>
            <p>Your booking is confirmed</p>
            <div className="spinner-border text-success mt-3" role="status">
              <span className="visually-hidden">Redirecting...</span>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="payment-failed">
            <FaTimesCircle className="text-danger mb-3" size={48} />
            <h4>Payment Failed</h4>
            <Alert variant="danger" className="mt-3">
              {error || 'Unknown error occurred'}
            </Alert>
            <Button variant="primary" onClick={resetPayment}>
              Try Again
            </Button>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default RfidPaymentModal;
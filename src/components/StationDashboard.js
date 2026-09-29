import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Table, 
  Spinner, 
  Alert, 
  Modal,
  Form
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaChargingStation, FaChartLine, FaBell, FaPowerOff, FaQrcode, FaPlus } from "react-icons/fa";
import ParticleBackground from "./Common/ParticleBackground";
import "bootstrap/dist/css/bootstrap.min.css";

const API_BASE_URL = process.env.REACT_APP_BACKEND_API || "http://localhost:3001";

function StationDashboard() {
  const [stations, setStations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddStation, setShowAddStation] = useState(false);
  const [newStation, setNewStation] = useState({
    chargerType: "Level 2",
    location: "",
    powerRating: 22,
    pricePerHour: 200,
    lat: 0,
    lng: 0,
    status: "active"
  });
  const [activeTab, setActiveTab] = useState("stations");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/admin/login");
          return;
        }

        // Fetch stations
        const stationsRes = await fetch(`${API_BASE_URL}/api/chargers`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const stationsData = await stationsRes.json();
        if (!stationsRes.ok) throw new Error(stationsData.message);
        setStations(stationsData.chargers);

        // Fetch bookings
        const bookingsRes = await fetch(`${API_BASE_URL}/api/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const bookingsData = await bookingsRes.json();
        if (!bookingsRes.ok) throw new Error(bookingsData.message);
        setBookings(bookingsData.bookings);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleAddStation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/chargers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newStation)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setStations([...stations, data.charger]);
      setShowAddStation(false);
      setNewStation({
        chargerType: "Level 2",
        location: "",
        powerRating: 22,
        pricePerHour: 200,
        lat: 0,
        lng: 0,
        status: "active"
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewStation({
            ...newStation,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => setError("Unable to fetch location. Please allow location access.")
      );
    }
  };

  const toggleStationStatus = async (stationId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus === "active" ? "maintenance" : "active";
      const response = await fetch(`${API_BASE_URL}/api/chargers/${stationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      setStations(stations.map(station => 
        station._id === stationId ? { ...station, status: newStatus } : station
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", minHeight: "100vh" }}>
      <ParticleBackground />
      <Container fluid className="py-4" style={{ position: "relative", zIndex: 1 }}>
        <Row className="mb-4">
          <Col>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-white d-flex align-items-center">
                <FaChargingStation className="me-3" />
                <span style={{ textShadow: "0 0 10px rgba(0, 242, 254, 0.7)" }}>
                  STATION MANAGEMENT DASHBOARD
                </span>
              </h2>
              <p className="text-info">Manage your charging stations and view analytics</p>
            </motion.div>
          </Col>
        </Row>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Alert variant="danger" onClose={() => setError("")} dismissible>
              {error}
            </Alert>
          </motion.div>
        )}

        <Row className="mb-4">
          <Col md={4}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-100 dashboard-card">
                <Card.Body className="text-center">
                  <div className="card-icon bg-primary">
                    <FaChargingStation size={30} className="text-white" />
                  </div>
                  <h3 className="text-white mt-3">{stations.length}</h3>
                  <p className="text-info">Total Stations</p>
                  <Button 
                    variant="outline-primary"
                    onClick={() => setShowAddStation(true)}
                    size="sm"
                  >
                    <FaPlus className="me-1" /> Add Station
                  </Button>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
          <Col md={4}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-100 dashboard-card">
                <Card.Body className="text-center">
                  <div className="card-icon bg-success">
                    <FaChartLine size={30} className="text-white" />
                  </div>
                  <h3 className="text-white mt-3">
                    {bookings.filter(b => b.status === 'completed').length}
                  </h3>
                  <p className="text-success">Completed Sessions</p>
                  <Button variant="outline-success" size="sm">
                    View Reports
                  </Button>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
          <Col md={4}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-100 dashboard-card">
                <Card.Body className="text-center">
                  <div className="card-icon bg-warning">
                    <FaBell size={30} className="text-white" />
                  </div>
                  <h3 className="text-white mt-3">
                    {bookings.filter(b => b.status === 'pending').length}
                  </h3>
                  <p className="text-warning">Pending Requests</p>
                  <Button variant="outline-warning" size="sm">
                    View Alerts
                  </Button>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>

        <div className="dashboard-tabs mb-4">
          <Button
            variant={activeTab === "stations" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("stations")}
            className="me-2"
          >
            My Stations
          </Button>
          <Button
            variant={activeTab === "bookings" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("bookings")}
          >
            Booking Sessions
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <>
            {activeTab === "stations" && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="mb-4 station-table-card">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <span className="text-white">My Charging Stations</span>
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => setShowAddStation(true)}
                    >
                      <FaPlus className="me-1" /> Add Station
                    </Button>
                  </Card.Header>
                  <Card.Body>
                    <div className="table-responsive">
                      <Table striped hover variant="dark">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Location</th>
                            <th>Power (kW)</th>
                            <th>Price/Hour</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stations.map((station) => (
                            <tr key={station._id}>
                              <td>{station.chargerType}</td>
                              <td>{station.location}</td>
                              <td>{station.powerRating}</td>
                              <td>₹{station.pricePerHour}</td>
                              <td>
                                <span className={`badge ${
                                  station.status === 'active' ? 'bg-success' : 
                                  station.status === 'maintenance' ? 'bg-warning' : 'bg-danger'
                                }`}>
                                  {station.status}
                                </span>
                              </td>
                              <td>
                                <Button 
                                  size="sm" 
                                  variant={
                                    station.status === 'active' ? 'outline-warning' : 'outline-success'
                                  }
                                  onClick={() => toggleStationStatus(station._id, station.status)}
                                  className="me-2"
                                >
                                  {station.status === 'active' ? 'Maintenance' : 'Activate'}
                                </Button>
                                <Button size="sm" variant="outline-danger">
                                  <FaPowerOff />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            )}

            {activeTab === "bookings" && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="mb-4 booking-table-card">
                  <Card.Header className="text-white">
                    Recent Booking Sessions
                  </Card.Header>
                  <Card.Body>
                    <div className="table-responsive">
                      <Table striped hover variant="dark">
                        <thead>
                          <tr>
                            <th>Station</th>
                            <th>User</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.slice(0, 10).map((booking) => (
                            <tr key={booking._id}>
                              <td>{booking.station_id?.chargerType || 'N/A'}</td>
                              <td>{booking.user?.username || 'Guest'}</td>
                              <td>{new Date(booking.startTime).toLocaleTimeString()}</td>
                              <td>
                                <span className={`badge ${
                                  booking.status === 'completed' ? 'bg-success' : 
                                  booking.status === 'pending' ? 'bg-warning' : 
                                  booking.status === 'in-progress' ? 'bg-info' : 'bg-secondary'
                                }`}>
                                  {booking.status}
                                </span>
                              </td>
                              <td>₹{booking.totalCost}</td>
                              <td>
                                <Button size="sm" variant="outline-info">
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </Container>

      <Modal
        show={showAddStation}
        onHide={() => setShowAddStation(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPlus className="me-2" />
            Add New Charging Station
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Charger Type</Form.Label>
                  <Form.Select
                    value={newStation.chargerType}
                    onChange={(e) => setNewStation({...newStation, chargerType: e.target.value})}
                  >
                    <option value="Level 1">Level 1 (Slow Charging)</option>
                    <option value="Level 2">Level 2 (Medium Charging)</option>
                    <option value="DC Fast">DC Fast (Rapid Charging)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={newStation.status}
                    onChange={(e) => setNewStation({...newStation, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="offline">Offline</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Location Name</Form.Label>
              <Form.Control
                type="text"
                value={newStation.location}
                onChange={(e) => setNewStation({...newStation, location: e.target.value})}
              />
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Power Rating (kW)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={newStation.powerRating}
                    onChange={(e) => setNewStation({...newStation, powerRating: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price Per Hour (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={newStation.pricePerHour}
                    onChange={(e) => setNewStation({...newStation, pricePerHour: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Location Coordinates</Form.Label>
              <div className="d-flex">
                <Form.Control
                  type="number"
                  placeholder="Latitude"
                  value={newStation.lat}
                  onChange={(e) => setNewStation({...newStation, lat: e.target.value})}
                  className="me-2"
                />
                <Form.Control
                  type="number"
                  placeholder="Longitude"
                  value={newStation.lng}
                  onChange={(e) => setNewStation({...newStation, lng: e.target.value})}
                />
                <Button 
                  variant="outline-info" 
                  className="ms-2"
                  onClick={handleLocationClick}
                >
                  <FaQrcode /> Get Current
                </Button>
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddStation(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddStation}>
            Add Station
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default StationDashboard;
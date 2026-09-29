import React, { useEffect, useState } from "react";
import { Container, Row, Col, Table, Button, Modal, Form, Badge, Alert } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserCog,
  FaPlug,
  FaCalendarAlt,
  FaUser,
  FaMapMarkerAlt,
  FaEdit,
  FaTrash,
  FaPowerOff,
  FaSearch,
  FaTimesCircle,
} from "react-icons/fa";
import { IoMdTime } from "react-icons/io";
import { BsFillCreditCardFill } from "react-icons/bs";
import "bootstrap/dist/css/bootstrap.min.css";
import "./AdminDashboard.css";

const API_BASE_URL = process.env.REACT_APP_BACKEND_API || "http://localhost:3001";

function AdminDashboard() {
  const [stations, setStations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddStation, setShowAddStation] = useState(false);
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [cancelStatus, setCancelStatus] = useState(null);
  const [newStation, setNewStation] = useState({
    chargerType: "Level 2",
    address: "",
    powerRating: 22,
    pricePerHour: 250,
    geoLocation: { type: "Point", coordinates: [0, 0] },
  });

  useEffect(() => {
    if (adminAuthenticated) {
      fetchStations();
      fetchBookings();
    }
  }, [adminAuthenticated]);

  const fetchStations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/chargers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      const data = await response.json();
      if (response.ok) {
        setStations(data.chargers);
      } else {
        setError(data.message || "Failed to fetch stations");
      }
    } catch (error) {
      console.error("Fetch stations error:", error);
      setError("Failed to fetch stations");
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      const data = await response.json();
      if (response.ok) {
        setBookings(data.bookings);
      } else {
        setError(data.message || "Failed to fetch bookings");
      }
    } catch (error) {
      console.error("Fetch bookings error:", error);
      setError("Failed to fetch bookings");
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setAdminAuthenticated(true);
        localStorage.setItem("adminToken", data.token);
      } else {
        setError(data.message || "Invalid username or password");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setError("Failed to login");
    }

    // Hardcoded credentials for testing (commented out)
    /*
    const validUsername = "admin";
    const validPassword = "1234";
    if (adminUsername === validUsername && adminPassword === validPassword) {
      setAdminAuthenticated(true);
      localStorage.setItem("adminToken", "test-token"); // Placeholder token
    } else {
      setError("Invalid username or password");
    }
    */
  };

  const toggleStationStatus = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/chargers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({
          status: stations.find((station) => station._id === id).status === "active" ? "maintenance" : "active",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setStations(
          stations.map((station) =>
            station._id === id
              ? { ...station, status: station.status === "active" ? "maintenance" : "active" }
              : station
          )
        );
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Toggle station status error:", error);
      setError("Failed to toggle station status");
    }
  };

  const addNewStation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/chargers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify(newStation),
      });

      const data = await response.json();
      if (response.ok) {
        setStations([...stations, data.charger]);
        setShowAddStation(false);
        setNewStation({
          chargerType: "Level 2",
          address: "",
          powerRating: 22,
          pricePerHour: 250,
          geoLocation: { type: "Point", coordinates: [0, 0] },
        });
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Add station error:", error);
      setError("Failed to add new station");
    }
  };

  const deleteStation = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/chargers/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });

      if (response.ok) {
        setStations(stations.filter((station) => station._id !== id));
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (error) {
      console.error("Delete station error:", error);
      setError("Failed to delete station");
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      setCancelStatus("processing");
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setBookings(
          bookings.map((booking) =>
            booking._id === bookingId ? { ...booking, status: "cancelled" } : booking
          )
        );
        await fetchStations(); // Refresh stations to update availability
        setCancelStatus("success");
        setTimeout(() => {
          setShowCancelModal(false);
          setCancelStatus(null);
        }, 1500);
      } else {
        setCancelStatus("failed");
        setError(data.message);
      }
    } catch (error) {
      console.error("Cancel booking error:", error);
      setCancelStatus("failed");
      setError("Failed to cancel booking");
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (response.ok) {
        setBookings(
          bookings.map((booking) =>
            booking._id === bookingId ? { ...booking, status } : booking
          )
        );
        setShowEditBooking(false);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Update booking error:", error);
      setError("Failed to update booking status");
    }
  };

  const filteredBookings = bookings.filter(
    (booking) =>
      booking.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.station_id?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "maintenance":
        return "warning";
      case "offline":
        return "danger";
      case "pending":
        return "secondary";
      case "accepted":
        return "primary";
      case "in-progress":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  return (
    <Container fluid className="admin-dashboard bg-gray-900 text-white min-h-screen">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4"
          >
            <Alert variant="danger" onClose={() => setError("")} dismissible>
              {error}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {!adminAuthenticated ? (
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col md={5} lg={4}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="admin-login-form glass-card p-4 backdrop-blur-lg border border-gray-700 rounded-lg"
            >
              <div className="text-center mb-4">
                <FaUserCog className="admin-icon text-blue-400" size={48} />
                <h4 className="neon-text mt-2 text-2xl font-bold">Admin Portal</h4>
              </div>
              <form onSubmit={handleAdminLogin}>
                <div className="mb-3">
                  <label className="form-label text-gray-100">Username</label>
                  <div className="input-group">
                    <span className="input-group-text bg-gray-900 border-gray-700 text-blue-400">
                      <FaUser />
                    </span>
                    <input
                      type="text"
                      className="form-control bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                      placeholder="Enter username"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label text-gray-100">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-gray-900 border-gray-700 text-blue-400">
                      <BsFillCreditCardFill />
                    </span>
                    <input
                      type="password"
                      className="form-control bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(59, 130, 246, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-100 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                >
                  Login
                </motion.button>
              </form>
            </motion.div>
          </Col>
        </Row>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="admin-header mb-6"
          >
            <h2 className="dashboard-title text-3xl font-bold neon-text">Admin Dashboard</h2>
          </motion.div>

          <Row>
            <Col xl={6} className="mb-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="card-section glass-card p-4 backdrop-blur-lg border border-gray-700 rounded-lg"
              >
                <div className="section-header flex justify-between items-center mb-4">
                  <h4 className="text-xl font-bold">
                    <FaPlug className="me-2 inline" /> Charging Stations
                  </h4>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAddStation(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Station
                  </Button>
                </div>
                <div className="table-responsive">
                  <Table className="stations-table text-gray-200">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Availability</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stations.map((station) => (
                        <motion.tr
                          key={station._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <td>
                            <div className="station-info flex items-center">
                              <FaMapMarkerAlt className="me-2 text-blue-400" />
                              {station.address}
                            </div>
                          </td>
                          <td>{station.chargerType}</td>
                          <td>
                            <Badge bg={getStatusBadge(station.status)}>
                              {station.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={station.available ? "success" : "danger"}>
                              {station.available ? "Available" : "Booked"}
                            </Badge>
                          </td>
                          <td>
                            <div className="action-buttons flex space-x-2">
                              <Button
                                variant={station.status === "active" ? "outline-danger" : "outline-success"}
                                size="sm"
                                onClick={() => toggleStationStatus(station._id)}
                              >
                                {station.status === "active" ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => deleteStation(station._id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </motion.div>
            </Col>

            <Col xl={6} className="mb-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="card-section glass-card p-4 backdrop-blur-lg border border-gray-700 rounded-lg"
              >
                <div className="section-header flex justify-between items-center mb-4">
                  <h4 className="text-xl font-bold">
                    <FaCalendarAlt className="me-2 inline" /> Bookings
                  </h4>
                  <div className="search-box relative">
                    <FaSearch className="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="table-responsive">
                  <Table className="bookings-table text-gray-200">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Station</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                        <motion.tr
                          key={booking._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <td>
                            <div className="user-info flex items-center">
                              <FaUser className="me-2 text-blue-400" />
                              {booking.user?.username || "Unknown"}
                            </div>
                          </td>
                          <td>
                            <div className="station-info flex items-center">
                              <FaMapMarkerAlt className="me-2 text-blue-400" />
                              {booking.station_id?.address || "Unknown"}
                            </div>
                          </td>
                          <td>
                            <div className="time-info flex items-center">
                              <IoMdTime className="me-2 text-blue-400" />
                              {new Date(booking.startTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td>
                            <Badge bg={getStatusBadge(booking.status)}>
                              {booking.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            <div className="action-buttons flex space-x-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  setCurrentBooking(booking);
                                  setShowEditBooking(true);
                                }}
                              >
                                <FaEdit />
                              </Button>
                              {booking.status !== "cancelled" && booking.status !== "completed" && (
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="relative"
                                >
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentBooking(booking);
                                      setShowCancelModal(true);
                                    }}
                                    className="cancel-btn"
                                  >
                                    <FaTimesCircle />
                                  </Button>
                                  <div className="pulse-ring"></div>
                                </motion.div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </motion.div>
            </Col>
          </Row>

          {/* Add Station Modal */}
          <Modal
            show={showAddStation}
            onHide={() => setShowAddStation(false)}
            centered
            className="futuristic-modal"
          >
            <Modal.Header closeButton className="bg-gray-800 border-gray-700">
              <Modal.Title className="text-white">Add New Charging Station</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-gray-800 text-white">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Charger Type</Form.Label>
                  <Form.Select
                    value={newStation.chargerType}
                    onChange={(e) => setNewStation({ ...newStation, chargerType: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="Level 1">Level 1 (Slow)</option>
                    <option value="Level 2">Level 2 (Medium)</option>
                    <option value="DC Fast">DC Fast (Rapid)</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={newStation.address}
                    onChange={(e) => setNewStation({ ...newStation, address: e.target.value })}
                    placeholder="Enter station address"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Power Rating (kW)</Form.Label>
                  <Form.Control
                    type="number"
                    value={newStation.powerRating}
                    onChange={(e) => setNewStation({ ...newStation, powerRating: e.target.value })}
                    placeholder="Enter power rating"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Price Per Hour (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    value={newStation.pricePerHour}
                    onChange={(e) => setNewStation({ ...newStation, pricePerHour: e.target.value })}
                    placeholder="Enter price per hour"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Latitude</Form.Label>
                  <Form.Control
                    type="number"
                    value={newStation.geoLocation.coordinates[1]}
                    onChange={(e) =>
                      setNewStation({
                        ...newStation,
                        geoLocation: {
                          ...newStation.geoLocation,
                          coordinates: [
                            newStation.geoLocation.coordinates[0],
                            parseFloat(e.target.value),
                          ],
                        },
                      })
                    }
                    placeholder="Enter latitude"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Longitude</Form.Label>
                  <Form.Control
                    type="number"
                    value={newStation.geoLocation.coordinates[0]}
                    onChange={(e) =>
                      setNewStation({
                        ...newStation,
                        geoLocation: {
                          ...newStation.geoLocation,
                          coordinates: [
                            parseFloat(e.target.value),
                            newStation.geoLocation.coordinates[1],
                          ],
                        },
                      })
                    }
                    placeholder="Enter longitude"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer className="bg-gray-800 border-gray-700">
              <Button
                variant="secondary"
                onClick={() => setShowAddStation(false)}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={addNewStation}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Station
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Edit Booking Modal */}
          <Modal
            show={showEditBooking}
            onHide={() => setShowEditBooking(false)}
            centered
            className="futuristic-modal"
          >
            <Modal.Header closeButton className="bg-gray-800 border-gray-700">
              <Modal.Title className="text-white">Update Booking Status</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-gray-800 text-white">
              {currentBooking && (
                <>
                  <div className="booking-details mb-4">
                    <p>
                      <strong>User:</strong> {currentBooking.user?.username || "Unknown"}
                    </p>
                    <p>
                      <strong>Station:</strong> {currentBooking.station_id?.address || "Unknown"}
                    </p>
                    <p>
                      <strong>Time:</strong>{" "}
                      {new Date(currentBooking.startTime).toLocaleString()} -{" "}
                      {new Date(currentBooking.endTime).toLocaleTimeString()}
                    </p>
                    <p>
                      <strong>Amount:</strong> ₹{currentBooking.totalCost}
                    </p>
                  </div>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={currentBooking.status}
                      onChange={(e) =>
                        setCurrentBooking({
                          ...currentBooking,
                          status: e.target.value,
                        })
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </Form.Group>
                </>
              )}
            </Modal.Body>
            <Modal.Footer className="bg-gray-800 border-gray-700">
              <Button
                variant="secondary"
                onClick={() => setShowEditBooking(false)}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => updateBookingStatus(currentBooking?._id, currentBooking?.status)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Update Status
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Cancel Booking Modal */}
          <Modal
            show={showCancelModal}
            onHide={() => {
              setShowCancelModal(false);
              setCancelStatus(null);
            }}
            centered
            className="futuristic-modal"
          >
            <Modal.Header closeButton className="bg-gray-800 border-gray-700">
              <Modal.Title className="text-white flex items-center">
                <FaTimesCircle className="mr-2 text-red-500" />
                Cancel Booking
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-gray-800 text-white text-center">
              {currentBooking && !cancelStatus ? (
                <div className="cancel-confirmation">
                  <p className="mb-4">
                    Are you sure you want to cancel the booking for{" "}
                    <strong>{currentBooking.user?.username || "Unknown"}</strong> at{" "}
                    <strong>{currentBooking.station_id?.address || "Unknown"}</strong>?
                  </p>
                  <div className="booking-details glass-card p-4 mb-4">
                    <p>
                      <strong>Time:</strong>{" "}
                      {new Date(currentBooking.startTime).toLocaleString()} -{" "}
                      {new Date(currentBooking.endTime).toLocaleTimeString()}
                    </p>
                    <p>
                      <strong>Amount:</strong> ₹{currentBooking.totalCost}
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Button
                      variant="danger"
                      onClick={() => cancelBooking(currentBooking._id)}
                      className="cancel-confirm-btn bg-red-600 hover:bg-red-700"
                    >
                      Confirm Cancellation
                    </Button>
                    <div className="pulse-ring"></div>
                    <div className="particles">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="particle"
                          style={{ transform: `rotate(${i * 45}deg)` }}
                        ></div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : cancelStatus === "processing" ? (
                <div className="cancel-processing">
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
                  <h4>Canceling Booking...</h4>
                  <p>Please wait while we process the cancellation</p>
                </div>
              ) : cancelStatus === "success" ? (
                <div className="cancel-success">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="success-animation"
                  >
                    <FaTimesCircle className="success-icon text-red-500" size={48} />
                    <div className="success-circle"></div>
                    <div className="success-particles">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="particle"
                          style={{ transform: `rotate(${i * 30}deg)` }}
                        ></div>
                      ))}
                    </div>
                  </motion.div>
                  <h4>Booking Cancelled!</h4>
                  <p>The booking has been successfully cancelled, and the charger is now available.</p>
                </div>
              ) : (
                <div className="cancel-failed">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="failed-animation"
                  >
                    <FaTimesCircle className="failed-icon text-red-500" size={48} />
                    <div className="failure-rays">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="ray"
                          style={{ transform: `rotate(${i * 45}deg)` }}
                        ></div>
                      ))}
                    </div>
                  </motion.div>
                  <h4>Cancellation Failed</h4>
                  <p>{error || "An error occurred while cancelling the booking."}</p>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="bg-gray-800 border-gray-700">
              {cancelStatus === "failed" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelStatus(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Close
                </Button>
              )}
            </Modal.Footer>
          </Modal>
        </>
      )}
    </Container>
  );
}

export default AdminDashboard;
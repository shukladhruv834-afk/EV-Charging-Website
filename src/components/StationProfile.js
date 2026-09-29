import React from 'react';
import { useNavigate } from "react-router-dom";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import './StationProfile.css';

function StationProfile() {
    const navigate = useNavigate();
    const d = JSON.parse(localStorage.getItem('StationData')) || {};  // Null safety
    
    console.log('Station Data:', d);

    const handleLogout = () => {
        localStorage.removeItem('StationData');
        navigate('/');
    };

    const googleMapsLink = d.location ? `https://maps.google.com/?q=${d.location}` : "#";
    const phoneLink = d.phone ? `tel:${d.phone}` : "#";
    const emailLink = d.email ? `mailto:${d.email}` : "#";

    return (
        <div className="station-profile-container">
            <Container fluid className="h-100">
                <Row className="h-100">
                    <Col md={2}></Col>

                    {/* Profile Section */}
                    <Col sm={12} md={4} className="d-flex align-items-center justify-content-center">
                        <div className="card profile-card">
                            <div className="card-body text-center">
                                <img 
                                    src="https://img.freepik.com/free-vector/electric-car_23-2148003400.jpg?w=2000" 
                                    alt="avatar"
                                    className="rounded-circle img-fluid profile-img"
                                />
                                <h1 className="my-3">{d.username || "Unknown User"}</h1>
                                <h4 className="text-muted mb-4">
                                    {d.maxSlots ? `${d.maxSlots - d.slots} Slots` : "No Slot Info"}
                                </h4>
                                <button className="btn btn-danger" onClick={handleLogout}>Log Out</button>
                            </div>
                        </div>
                    </Col>

                    {/* Contact Details */}
                    <Col sm={12} md={6} className="d-flex align-items-center justify-content-start">
                        <div className="contact-card col-lg-8">
                            <div className="card">
                                <div className="card-body">
                                    <div className="contact-header">
                                        <p className="text-success"><strong>CONTACT US</strong></p>
                                        <h1><strong>Get In Touch With Us</strong></h1>
                                    </div>
                                    <hr />

                                    {[
                                        { label: "Location", value: "Get Directions", link: googleMapsLink },
                                        { label: "Email ID", value: d.email, link: emailLink },
                                        { label: "Contact No", value: "Give A Call", link: phoneLink },
                                        { label: "Type", value: d.type },
                                        { label: "State", value: d.state }
                                    ].map(({ label, value, link }, index) => (
                                        <div key={index}>
                                            <div className="row">
                                                <div className="col-sm-5">
                                                    <p><strong>{label}</strong></p>
                                                </div>
                                                <div className="col-sm-7">
                                                    {link ? <a href={link} className="text-muted">{value}</a> : <p className="text-muted">{value}</p>}
                                                </div>
                                            </div>
                                            <hr />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default StationProfile;

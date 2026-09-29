import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { BiPhoneCall } from "react-icons/bi";
import { TbRecharging } from "react-icons/tb";
import { IoMailOpenOutline } from "react-icons/io5";
import { MdEvStation } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import './ListedBookings.css'; 

const link = process.env.REACT_APP_BACKEND_API;

const UserNotifications = () => {
    const [avail, setAvail] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const obj = JSON.parse(localStorage.getItem('loginData'));
                if (!obj) return;

                const res = await fetch(`${link}/api/users/getbookings`, {
                    method: 'POST',
                    body: JSON.stringify({ email: obj.email }),
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await res.json();
                if (data.bookings) {
                    setAvail(data.bookings);
                }
            } catch (error) {
                console.error("Error fetching bookings:", error);
            }
        };

        fetchBookings();
    }, []);

    const goPreviousPage = () => {
        const d = JSON.parse(localStorage.getItem('loginData'));
        navigate(`/user/${d._id}`);
    };

    const handleStation = async (e, action) => {
        e.preventDefault();
        const id_extract = e.target.id;

        try {
            const obj = JSON.parse(localStorage.getItem('loginData'));
            const res = await fetch(`${link}/api/users/bookingsupdate`, {
                method: 'POST',
                body: JSON.stringify({ email: obj.email, id_extract }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            console.log("Updated data:", data);

            if (action === "accept") {
                setAvail(prev => prev.filter(st => st._id !== id_extract));
            } else {
                setAvail(prev => prev.filter(st => st._id !== id_extract));
            }
        } catch (error) {
            console.error("Error updating booking:", error);
        }
    };

    return (
        <div className="head">
            <div className="d-flex justify-content-center"><h1><strong>Bookings</strong></h1></div>
            <Container>
                <Row>
                    <Col sm={1}></Col>
                    <Col sm={10}>
                        <h4>Available Bookings</h4>
                        {avail.length === 0 ? (
                            <div className="card mb-3 border d-flex justify-content-center align-items-center" style={{ borderRadius: '0.75rem' }}>
                                <h4 className="text-primary p-2">No Pending Bookings</h4>
                                <button type="button" className="btn btn-outline-primary m-1" onClick={goPreviousPage}>Go Back</button>
                            </div>
                        ) : avail.map(station => (
                            <div className="card mb-3 border" key={station._id} style={{ borderRadius: '0.75rem' }}>
                                <div className="row">
                                    <div className="col-md-3 d-flex justify-content-center align-items-center">
                                        <MdEvStation className="m-1 border" style={{ fontSize: '200px', color: "#198754" }} />
                                    </div>
                                    <div className="col-md-9 p-0">
                                        <div className="card-body">
                                            <h4 className="card-title fw-bold text-primary">{station.username}</h4>
                                            <p className="card-text"><strong>{station.location}</strong></p>
                                            <p className="card-text d-flex align-items-center">
                                                <TbRecharging className="me-1" style={{ fontSize: '22px', color: "#198754" }} /> <h5>{station.type}</h5>
                                            </p>
                                            <p className="card-text">
                                                <strong><BiPhoneCall style={{ fontSize: '20px' }} /> {station.phone}</strong>
                                            </p>
                                            <p className="card-text d-flex flex-row justify-content-between">
                                                <p className="card-text">
                                                    <IoMailOpenOutline className="me-1" style={{ fontSize: '30px' }} /> {station.email}
                                                </p>
                                                <p className="card-text">
                                                    <button id={station._id} type="button" className="btn btn-success m-1" onClick={(e) => handleStation(e, "accept")}>Accept</button>
                                                    <button id={station._id} type="button" className="btn btn-danger m-1" onClick={(e) => handleStation(e, "decline")}>Decline</button>
                                                </p>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" className="btn btn-outline-primary m-1" onClick={goPreviousPage}>Go Back</button>
                            </div>
                        ))}
                    </Col>
                    <Col sm={1}></Col>
                </Row>
            </Container>
        </div>
    );
};

export default UserNotifications;

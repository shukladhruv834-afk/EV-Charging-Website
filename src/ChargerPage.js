import React from "react";
import { useNavigate } from 'react-router-dom';
import { FaRegUser, FaRegUserCircle } from "react-icons/fa";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function ChargerPage() {
    const d = JSON.parse(localStorage.getItem('StationData'));
    const navigate = useNavigate();

    const Redirectlogin = () => {
        if (d) navigate(`/admin/${d._id}`);
        else navigate('/admin/login');
    };

    const Redirectregister = () => {
        if (d) navigate(`/admin/${d._id}`);
        else navigate('/admin/register');
    };

    return (
        <div style={{ height: '700px' }}>
            <Container fluid style={{ height: 'inherit' }}>
                <Row style={{ height: 'inherit' }}>
                    <Col sm={0} md={3}></Col>
                    <Col sm={12} md={3} className="d-flex align-items-center justify-content-center">
                        <button onClick={Redirectlogin} className="p-5 rounded-3 shadow" style={{ backgroundColor: "#066764", opacity: "90%", border: "none" }}>
                            <FaRegUser style={{ fontSize: '200px', color: "white" }} />
                            <br />
                            <p style={{ color: "white" }}> User Login </p>
                        </button>
                    </Col>
                    <Col sm={12} md={3} className="d-flex align-items-center justify-content-center">
                        <button onClick={Redirectregister} className="p-5 rounded-3 shadow" style={{ backgroundColor: "#066764", opacity: "90%", border: "none" }}>
                            <FaRegUserCircle style={{ fontSize: '200px', color: "white" }} />
                            <br />
                            <p style={{ color: "white" }}> User Register </p>
                        </button>
                    </Col>
                    <Col sm={0} md={3}></Col>
                </Row>
            </Container>
        </div>
    );
}

export default ChargerPage;

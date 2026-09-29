import React, { Component } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { BiPhoneCall } from "react-icons/bi";
import { TbRecharging } from "react-icons/tb";
import { IoMailOpenOutline } from "react-icons/io5";
import { MdEvStation } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import "./ListedBookings.css"; 

const link = process.env.REACT_APP_BACKEND_API;

class ListedBookings extends Component {
    constructor(props) {
        super(props);
        this.state = {
            avail: [],
            not_avail: []
        };
    }

    async componentDidMount() {
        const obj = JSON.parse(localStorage.getItem("loginData"));
        if (obj) {
            const res = await fetch(`${link}/api/user/bookings`, {
                method: "POST",
                body: JSON.stringify({ username: obj.username, email: obj.email }),
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            this.setState({
                avail: [...data.available],
                not_avail: [...data.not_available]
            });
        }
    }

    goPreviousPage = () => {
        const d = JSON.parse(localStorage.getItem("loginData"));
        this.props.navigate(`/user/${d._id}`);
    };

    BookAStation = async (e) => {
        e.preventDefault();
        const id_extract = e.target.id;
        const { avail } = this.state;
        const station_extract = avail.find(st => st._id === id_extract);
        
        if (!station_extract) return;

        const obj = JSON.parse(localStorage.getItem("loginData"));
        const res = await fetch(`${link}/api/user/update/`, {
            method: "POST",
            body: JSON.stringify({ email: obj.email, id_extract }),
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            this.setState({
                avail: avail.filter(st => st._id !== id_extract),
                not_avail: [...this.state.not_avail, station_extract]
            });
        }
    };

    render() {
        return (
            <div className="head">
                <div className="d-flex justify-content-center"><h1><strong>BOOKINGS</strong></h1></div>
                <Container fluid>
                    <Row>
                        <Col sm={1}></Col>
                        <Col sm={10}>
                            <h4>Available Bookings</h4>
                            {this.state.avail.length === 0 ? (
                                <div className="card mb-3 border d-flex justify-content-center align-items-center" style={{ borderRadius: "0.75rem" }}>
                                    <h4 className="text-primary p-2"> No Stations Available </h4>
                                </div>
                            ) : (
                                this.state.avail.map(station => (
                                    <div className="card mb-3 border" style={{ borderRadius: "0.75rem" }} key={station._id}>
                                        <div className="row">
                                            <div className="col-md-3 d-flex justify-content-center align-items-center">
                                                <MdEvStation className="m-1 border" style={{ fontSize: "200px", color: "#198754" }} />
                                            </div>
                                            <div className="col-md-9">
                                                <div className="card-body">
                                                    <h4 className="card-title fw-bold text-primary">{station.username}</h4>
                                                    <p className="card-text"><strong>{station.location}</strong></p>
                                                    <p className="card-text d-flex align-items-center">
                                                        <TbRecharging className="me-1" style={{ fontSize: "22px", color: "#198754" }} /> <h5>{station.type}</h5>
                                                    </p>
                                                    <p className="text-muted"><strong><BiPhoneCall style={{ fontSize: "20px" }} /> {station.phone}</strong></p>
                                                    <p className="card-text d-flex justify-content-between">
                                                        <IoMailOpenOutline className="me-1" style={{ fontSize: "30px" }} />{station.email}
                                                        <button id={station._id} type="button" className="btn btn-primary m-1" onClick={this.BookAStation}>Book</button>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            <h4>Current Bookings</h4>
                            {this.state.not_avail.length === 0 ? (
                                <div className="card mb-3 border d-flex justify-content-center align-items-center" style={{ borderRadius: "0.75rem" }}>
                                    <h4 className="text-primary p-2"> No Bookings Added </h4>
                                    <button type="button" className="btn btn-outline-primary m-1" onClick={this.goPreviousPage}>Go Back</button>
                                </div>
                            ) : (
                                this.state.not_avail.map(station => (
                                    <div className="card mb-3 border" style={{ borderRadius: "0.75rem" }} key={station._id}>
                                        <div className="row">
                                            <div className="col-md-3 d-flex justify-content-center align-items-center">
                                                <MdEvStation className="m-1 border" style={{ fontSize: "200px", color: "#198754" }} />
                                            </div>
                                            <div className="col-md-9 p-0">
                                                <div className="card-body">
                                                    <h4 className="card-title fw-bold text-primary">{station.username}</h4>
                                                    <p className="card-text"><strong>{station.location}</strong></p>
                                                    <p className="card-text d-flex align-items-center">
                                                        <TbRecharging className="me-1" style={{ fontSize: "22px", color: "#198754" }} /> <h5>{station.type}</h5>
                                                    </p>
                                                    <p className="text-muted"><strong><BiPhoneCall style={{ fontSize: "20px" }} /> {station.phone}</strong></p>
                                                    <p className="card-text">
                                                        <IoMailOpenOutline className="me-1" style={{ fontSize: "30px" }} />{station.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button type="button" className="btn btn-outline-primary m-1" onClick={this.goPreviousPage}>Go Back</button>
                                    </div>
                                ))
                            )}
                        </Col>
                        <Col sm={1}></Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

// `withRouter` हटाकर `useNavigate` को `props` में पास करने के लिए HOC बनाया गया
function WithNavigate(props) {
    let navigate = useNavigate();
    return <ListedBookings {...props} navigate={navigate} />;
}

export default WithNavigate;

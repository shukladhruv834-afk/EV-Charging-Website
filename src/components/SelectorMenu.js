import React  from "react";
import DropdownMultiselect from "react-multiselect-dropdown-bootstrap";
import './Map.css';

const Menu = () =>{
    const optionsArray = [
        { key: "l1", label: "Level 1" },
        { key: "l2", label: "Level 2" },
        { key: "dc", label: "DC Fast" },
      ];
  
    return(
        <div className="selectmenu">
            <DropdownMultiselect options={optionsArray} name="chargingTypes"/>
        </div>
    );
}

export default Menu;
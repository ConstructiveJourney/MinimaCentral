import React from "react";


function Ports ({updateFlashMessage, ports, setPorts, makeCollection, setScriptCheckNeeded, requestor}) {
	const maxLengthData = 1024 * 64; // Arbitrary limit

	const handlePortsInputChange = (e, index) => {
		if (requestor === "Creator") {
			setScriptCheckNeeded(true);
		}
		setPorts(prevPorts => ([
			...prevPorts.map((port, i) => {
				if (i === index) {
					if (e.target.name === "port") {
						return ({
							...port, [e.target.name]: parseInt(e.target.value)
						})
					} else {
						return ({
							...port, [e.target.name]: e.target.value
						})
					}
				}
				return port;
			})
		]))
	}

	const removePort = (toRemove) => { // To remove a port
		const newPorts = ports.filter((item, index) => index !== toRemove);
		setPorts(newPorts);
	}

	const getStatePortsDisplay = (item, index) => { // To return the section on token state input.
		return (
			<div className = "panel-to-row">
				<label className = "creator-label">
					<input className = "creator-input"
						name = "port"
						type = "number"
						value = {item.port}
						onChange = {(event) => handlePortsInputChange(event, index)}
					/>
				</label>
				<label className = "creator-label">
					<input className = "creator-input"
						name = "name"
						type = "text"
						value = {item.name}
						onChange = {(event) => handlePortsInputChange(event, index)}
					/>
				</label>
				<label className = "creator-label">
					<input className = "creator-input"
						name = "type"
						type = "text"
						value = {item.type}
						onChange = {(event) => handlePortsInputChange(event, index)}
					/>
				</label>
				<label className = "creator-label">
					<input className = "creator-input"
						name = "data"
						type = "text"
						value = {item.data}
						maxLength = {maxLengthData}
						onChange = {(event) => handlePortsInputChange(event, index)}
					/>
				</label>
				{
					makeCollection && <>
						<label className = "creator-label">
							<select name = "toBecomeFixed"
								onChange = {(event) => handlePortsInputChange(event, index)}
								value = {item.toBecomeFixed}
								>
								<option value = "0">Not to be fixed</option>
								<option value = "1">To be fixed</option>
							</select>
						</label>
					</>
				}
				<button className = "help-button" style = {{width:"24px"}}
					type = "button"
					onClick = {() => removePort(index)}
					>
					&#x232B;
				</button>
				
			</div>
		)
	}
	
	return (
		ports.map((item, index) => (
			<div>
				{getStatePortsDisplay(item, index)}
			</div>
		))
	)
	
}


export default Ports;
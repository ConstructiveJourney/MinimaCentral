import React from "react";
import { useEffect } from "react";
import { useState } from "react";

import { GetImage } from "../components/utilities/CommonFunctions.jsx";
import { GetSendInstructions, GetSendInstructionsDisplay } from "../components/utilities/TransactionFunctions.jsx";


function Viewer ({minimaData, balData, defaultSelected, selected, setSelected, changeTokenOrder, flashMessage, updateFlashMessage, addToLog, userAddress}) {
	const textPattern = "^(?!.*(%0D|%0A))[^'\"\\\\]+"; // Bans ', ", \ and two types of newline. \ should also pick up \n and \r, as it is part of each.
	const [showMore, setShowMore] = useState(false); // Show more info on the selected token?
	const [showSend, setShowSend] = useState(false); // Show the sending section?
	const [showBuildText, setShowBuildText] = useState(false); // Show the draft transaction text section?
	const [showPostButton, setShowPostButton] = useState(false); // Show the button to post a transaction?
	const [formDisabled, setFormDisabled] = useState(false);
	const [attributes, setAttributes] = useState( // Show a value of the selected token?
		{
			script: {
				label: "Script",
				showValue: false
			},
			url: {
				label: "Url",
				showValue: false
			},
			coinid: {
				label: "Coinid(s)",
				showValue: false
			},
			state: {
				label: "State",
				showValue: false
			}
		}
	);
	const [sendData, setSendData] = useState( // For sending a coin
		{
			address: {
				label: "Address",
				is: "",
				maxLength: 66,
				example: "MxG085EZBVF5AJ5DUC4RGVN4730JV0R4ANGECRHVBCACGVUNNFKHPMSYZCDCGQZ",
				helpText: [
					"The address to which you wish to send the coin."
				],
				extendedHelp: false,
				pattern: textPattern,
			},
			amount: {
				label: "Amount",
				is: 1,
				min: 0,
				max: 1000000000,
				example: 1,
				helpText: [
					"The amount to send."
				],
				extendedHelp: false,
			},
			burn: {
				userInput: true,
				label: "Burn",
				is: 0,
				min: 0,
				max: 1,
				example: 0,
				helpText: [
					"The amount of Minima tokens to burn.  While the network is uncongested, this can be left as zero.",
					"We have set an arbitrary limit for this app of 1 for the time being."
				],
				extendedHelp: false
			},
		}
	);

	const defaultSendInstructions = {
		lines: [], // The send instructions which will be sent to the node via MDS.
		destinationAddressLocation: "" // Which line holds the destination address.
	}
	const [sendInstructions, setSendInstructions] = useState(defaultSendInstructions);

	const defaultConfirmationMessage = {
		message: "",
		action: "",
		labels: {
			yes: "Yes",
			no: "No"
		}
	}
	const [confirmationMessage, setConfirmationMessage] = useState(defaultConfirmationMessage); // For the user to confirm something.
	
 	// If the user clicks on a token.
	const handleCardClick = (tIndex, cIndex) => {
		let newSelected = {...selected};

		newSelected.token = tIndex;
		
		if (cIndex !== -1) {
			newSelected.coin = cIndex;
		} else {
			newSelected.coin = ""; // If no selected coin, set selected coin back to "".
			if (sendData.address.is !== ""){
				clearSending();
				deleteTxn();
			}
		}

		setSelected(newSelected); // Updating both tokenid and position in the same update, to avoid mismatches.
	}

	// To reset sending to not showing and not being set up
	const clearSending = () => {
		setFormDisabled(false);
		setShowPostButton(false);
		setShowBuildText(false);
		setSendData(prevSendData => ({ ...prevSendData,
			address: { ...prevSendData.address, is: "" },
			amount: { ...prevSendData.amount, is: 1 },
			burn: { ...prevSendData.burn, is: 0 }

		}));
		setSendInstructions(defaultSendInstructions);
		setShowSend(false);
	}

	// To delete a transaction in the node
	const deleteTxn = () => {
		window.MDS.cmd(
			"txndelete id:mctransid", function (res) {}
		)
	}
	
	// If the user toggles more or less details for the selected token.
	const toggleMoreDetails = () => {
		if (showMore === false) {
			setShowMore(true);
		} else {
			setShowMore(false);
			setShowSend(false);
		}
	}

	// If the user toggles the send coin section.
	const toggleShowSend = () => {
		if (showSend === false) {
			setShowSend(true);
		} else {
			setShowSend(false);
		}
	}

	// If the user toggles the show draft send text section.
	const toggleShowBuildText = () => {
		if (showBuildText === false) {
			setShowBuildText(true);
		} else {
			setShowBuildText(false);
		}
	}

	// If the user clicks to split a Collection coin.
	const handleSplitRequest = () => {
		updateFlashMessage("To split this coin, copy the tokenid and go to the Splitter page"); // FUTURE Automate setting of tokenid and jump to Splitter page.
	}

	
	// To get the attributes of a specified token, and set up a button which can call for the specific data.
	const getAttributeDisplay = (attr, allOrSelected = "all") => {
		return (
			<div className = "helpText">
				{attributes[attr].label}: 
				<button className = "help-button"
					type = "button"
					onClick = {() => toggleShowValue(attr)}
					>
					{attributes[attr].showValue ? "-" : "+"} 
				</button>
				{attributes[attr].showValue && <>
					&nbsp;
					{getAttributeValue(attr, allOrSelected)}
					</>
				}
			</div>
		)
	}

	// To get a specific attribute, e.g. script, of a coin, for display.  May include additional info related to the narrow attribute.
	const getAttributeValue = (attr, allOrSelected) => {
		switch (attr) {
			case "script":
			case "url":
				return <>{balData[selected.token].specs[attr]}</>;
			case "coinid":
				if (allOrSelected !== "selected") {
					return (
						<ul>
							{balData[selected.token].coins.map((item, index) => (
								<li key = {index}>
									{`${index}`}
									:
									&nbsp;
									{`${item.coinid}, tokenamount ${item.tokenAmount}, at address ${item.address}, miniaddress ${item.miniaddress}`}
								</li>
							))}
						</ul>
					)
				} else {
					return (
						<>
							{`${balData[selected.token].coins[selected.coin].coinid}, tokenamount ${balData[selected.token].coins[selected.coin].tokenAmount}, at address ${balData[selected.token].coins[selected.coin].address}, miniaddress ${balData[selected.token].coins[selected.coin].miniaddress}`}
						</>
					)
				}
			case "state":
				if (allOrSelected !== "selected") {
					return (
						<>{balData[selected.token].coins[0].state.length > 0 ? ( <ul>
							{balData[selected.token].coins.map((item, index) => (
								<li key = {index}>
									{`Coin ${index}`}
									:
									&nbsp;
									{item.state.map(item => `Port ${item.port} (type ${item.type}): ${item.data};  `)}
								</li>
							))}
						</ul>
						) : (
							<>No state</>
						)}
						</>
					); // Could not get .join("; ").trim() to work with a double map, or maybe it was the div which caused the problem.
				} else {
					return (
						<>
							{balData[selected.token].coins[selected.coin].state.map(item => `Port ${item.port} (type ${item.type}): ${item.data};  `)}
						</>
					)
				}
			default:
				return <>Unknown</>;
		}
	}
	

	// If the user toggles to display a value, e.g. the url, in full.
	const toggleShowValue = (attr) => { // Toggles showing the value or not.
		if (attributes[attr].showValue === false) {
			setAttributes(prevAttributes => ({ ...prevAttributes, [attr]: { ...prevAttributes[attr], showValue: true } }));
		} else {
			setAttributes(prevAttributes => ({ ...prevAttributes, [attr]: { ...prevAttributes[attr], showValue: false } }));
		}
	}

	const handleCardStyle = (token, coin) => {
		let bacCol = ""; // backgroundColor
		let borSty = "solid"; // borderStyle
		let borCol = ""; // borderColor
		
		// Differentiating types using background colour.
		if (token.collection.is === "yes") {
			if (coin.tokenAmount > 1 || coin.isfixed !== true) {
				bacCol = "indianred"
			} else {
				bacCol = "dodgerblue"
			}
		} else if (token.specs.script === "RETURN TRUE" ) {
			bacCol = "darkgray";
		} else {
			bacCol = "gray";
		}
		
		// Using border to emphasize the selected token and any amount 1 tokens.
		if (token.specs.tokenid === balData[selected.token].specs.tokenid  && (token.collection.is !== "yes" || (token.collection.is === "yes" && balData[selected.token].coins.length >= selected.coin + 1 && coin.coinid === balData[selected.token].coins[selected.coin].coinid))) { // Length test added to prevent error when, perhaps temporarily on a coin split, no coins for that tokenid.
			borCol = "black";
		} else {
			if (token.specs.total === 1 && token.specs.decimals === 0) {
				borCol = "gold";
			} else {
				borCol = bacCol;
			}
		}
		return {
			backgroundColor: bacCol,
			borderStyle: borSty,
			borderColor: borCol
		}
	}

	const toggleCollectionWarning = () => {
		updateFlashMessage("WARNING\n\nThis coin is part of a collection.\nCollections are an experimental technology.\nWhat is displayed in this app relies on what the coin tells us.\nThe script of the token is taken from the tokenscript and is correct.  The state of the coin is taken from the coin and is correct.  Some displayed attributes of the coin rely on what the original creator wrote into the coin, and the reality may be different.\n\nPROCEED WITH CAUTION");
	}

	const getHelpText = (param) => {
		if (sendData[param].helpText) {
			const l = sendData[param].helpText.length;
			return (
				<div className = "helpText">
					<em>{sendData[param].helpText[0]}</em>
					{sendData[param].extendedHelp === true && <em>{"\n"}{sendData[param].helpText[1]}</em>}
					{l > 1 && <button className = "help-button"
						type = "button"
						onClick = {() => toggleExtendedHelp(param)}
						disabled = {formDisabled}
						>i
					</button>}
				</div>
			)
		}
	}

	const toggleExtendedHelp = (param) => { // Switches the helptext to shorter or longer
		if (sendData[param].extendedHelp === false) {
			setSendData(prevSendData => ({ ...prevSendData, [param]: { ...prevSendData[param], extendedHelp: true } }));
		} else {
			setSendData(prevSendData => ({ ...prevSendData, [param]: { ...prevSendData[param], extendedHelp: false } }));
		}
	}

	const handleInputChange = (e) => {
		switch (e.target.name) {
			case "address":
				if (e.target.value.length > sendData.address.maxLength) {
					updateFlashMessage (prevFlashMessage => "There is a mistake.  The address should be shorter than " + sendData.address.maxLength + " characters.");
				}
				break;
			case "burn":
				if (e.target.value > e.target.value.max) {
					updateFlashMessage (prevFlashMessage => "This app will not allow you to burn so much Minima.  Please reduce that number.  Very possibly you don't need to burn any at all.");
				} else if (e.target.value < sendData.burn.min) {
					updateFlashMessage (prevFlashMessage => "Please increase the amount of Minima burnt to not less than " + sendData.burn.min + ".");
				}
				break;
			default:
				// Do nothing
				break;
		}
		setSendData(prevSendData => ({ ...prevSendData, [e.target.name]: { ...prevSendData[e.target.name], is: e.target.value } }));
	};

	// To update the send instruction on change in address
	useEffect(() => {
		if (sendData.address.is !== "") { // If there is actually some data recorded.
			if (sendInstructions.lines.length === 0) {
				setSendInstructions(GetSendInstructions(minimaData, balData[selected.token], balData[selected.token].coins[selected.coin], balData[selected.token].coins[selected.coin].state, sendData, userAddress));
			} else {
				let replacementOutput = "txnoutput id:mctransid address:" + sendData.address.is + " tokenid:" + balData[selected.token].specs.tokenid + " amount:" + sendData.amount.is;
				let updatedSendInstructions = {...sendInstructions};
				updatedSendInstructions.lines[sendInstructions.destinationAddressLocation] = replacementOutput;
				setSendInstructions(updatedSendInstructions);
			}
		}
	// eslint-disable-next-line
	}, [sendData.address.is]);
	
	// To update the send instruction on burn amount change
	useEffect(() => {
		if (sendData.address.is !== "") { // If there is actually address data recorded.
			setSendInstructions(GetSendInstructions(minimaData, balData[selected.token], balData[selected.token].coins[selected.coin], balData[selected.token].coins[selected.coin].state, sendData, userAddress)); // Given the complications around burn and change, just redo the whole instruction.
		}
	// eslint-disable-next-line
	}, [sendData.amount.is, sendData.burn.is]);

	const handleSubmit = (e) => {
		e.preventDefault();
		setFormDisabled(true);
		
		var startingProblemsList = "Please fix the following:";
		var problemsList = startingProblemsList.slice(); // Programming note: sliced; to get a deep copy.
		
		window.MDS.cmd(
			"checkmode", function (checkmode) {
				if (checkmode.response) {
					if (checkmode.response.mode !== "READ") { // Ensure app only has read permission, so user is forced to verify command.
						problemsList += "\n- Please change this dapp to read mode by going back to your list of all apps, right clicking this one, and choosing \"Read mode\" instead of \"Write mode\".  It is important that you verify the output from this dapp.";
					}
					const regex = /[0M]{1}x[0-9A-Za-z]{1,64}/;
					if (regex.test(sendData.address.is) === false) {
						problemsList += "\n- The address doesn't seem right.  It should start with M or 0, then x, followed by 64 characters.";
					}
					if (regex.test(userAddress === false)) {
						problemsList += "\n- The dapp hasn't been able to get an address for returning your change.  You can try closing the dapp and reopening it, but probably this cannot be fixed.";
					}
					// FUTURE Add a check that the address does not match a tokenid or coinid (user error).
					if (minimaData.balance.sendable < sendData.burn.is) { // Check enough spendable Minima.
						problemsList += "\n- You do not have enough spendable Minima.";
					}
					if (sendData.amount.is < sendData.amount.min) {
						problemsList += "\n- Please increase the amount sent to not less than " + sendData.amount.min + ".";
					}
					if (sendData.amount.is > balData[selected.token].balance.confirmed) { // NB Does not check into coins, only overall token balance.
						problemsList += "\n- You don't have enough confirmed balance of this token.  Please reduce the amount sent to not more than the value available.";
					}
					if (sendData.burn.is < sendData.burn.min) {
						problemsList += "\n- Please increase the amount of Minima burnt to not less than " + sendData.burn.min + ".";
					}
					if (sendData.burn.is > sendData.burn.max) {
						problemsList += "\n- This app will not allow you to burn so much Minima.  Please reduce that number to not more than " + sendData.burn.max + ".";
					}
					
					if (problemsList === startingProblemsList) {
						build(0);
					} else {
						updateFlashMessage(problemsList);
						setFormDisabled(false);
					}
				} else {
					problemsList += "\n- Problem communicating with your node.";
					updateFlashMessage(problemsList);
					setFormDisabled(false);
				}
			}
		)
	}

	const handleConfirmation = (e) => {
		if (e === true) {
			if (confirmationMessage.action === "goToPending") {
				setShowPostButton(true);
			}
			if (confirmationMessage.action === "post") {
				post(0);
			}
		} else {
			setFormDisabled(false);
			setShowPostButton(false);
			deleteTxn();
		}			
		setConfirmationMessage({
			message: "",
			action: "",
			labels: {
				yes: "Yes",
				no: "No"
			}
		});
	}

	const build = (line) => {
		if (line < sendInstructions.lines.length) {
			window.MDS.cmd(
				sendInstructions.lines[line], function (res) {
					if (res.response) {
						build(line + 1); // Recursive due to speed of response.
					} else {
						if (line === sendInstructions.lines.length - 1) { // i.e. the final signature
							setConfirmationMessage({
								message: "Please go to the Pending app and REVIEW THE TRANSACTION.  Then return to this app and click the button to post it.",
								action: "goToPending",
								labels: {
									yes: "OK",
									no: "Abort"
								}
							});
						} else {
							updateFlashMessage("\n- Problem communicating with your node at line " + line);
							setFormDisabled(false);
						}
					}
				}
			)
		}
	}

	const handlePost = () => {
		setConfirmationMessage({
			message: "Are you sure you wish to post the transaction?  After this, it CANNOT BE CHANGED OR UNDONE.",
			action: "post",
			labels: {
				yes: "Post it",
				no: "Abort"
			}
		})
	}
	const post = (line) => {
		switch (line) {
			case 0: // Programming note: no break
			case 1:
				let commandStr = "txnbasics id:mctransid";
				if (line === 1) {commandStr = "txnpost id:mctransid"};
				window.MDS.cmd(
					commandStr, function (res) {
						if (res.response) {
							post(line + 1); // Recursive due to speed of response.
						} else {
							updateFlashMessage("\n- Problem communicating with your node at line " + line);
							setFormDisabled(false);
						}
					}
				)
				break;
			case 2:
				setConfirmationMessage(defaultConfirmationMessage);
				setSelected(defaultSelected);
				updateFlashMessage("Transaction posted.  Assuming you validated the transaction in Pending, your coin will be sent.");
				addToLog("Transaction posted.");
				clearSending();
				break;
			default:
				// Do nothing
		}
	}

	return (
		<>
			{flashMessage && <div className = "flash-message"> {/* Flash message */}
				{flashMessage}
				<button onClick = {() => updateFlashMessage("")}>OK</button>
			</div>}

			{confirmationMessage.message !== "" && <div className = "flash-message">
				<p>{confirmationMessage.message}</p>
				<button
					type = "button"
					onClick = {() => handleConfirmation(true)}
					>{confirmationMessage.labels.yes}
				</button>
				<button
					type = "button"
					onClick = {() => handleConfirmation(false)}
					>{confirmationMessage.labels.no}
				</button>
			</div>}

			<section> {/* Tokens and collection coins */}
				<div className = "section-to-row">
					<div className = "section-to-col">
						<div className = "panel">
							<label className = "creator-label">
								<select name = "sorting"
									// FUTURE Add in e.g. value = {nameOfVar} to show the current setting.
									onChange = {e => changeTokenOrder(e.target.value)}
									>
									<option value = "received">Standard sorting</option>
									<option value = "alphanumeric">Alpha sorting</option>
								</select>
							</label>
							Minima balance: {minimaData.balance.holding}
						</div>
					</div>
					{balData.map((item, tIndex) => (
						item.collection.is !== "yes" ? (
							<div
								key={item.specs.tokenid}
								className = "asset-card"
								style = {handleCardStyle(item, -1)}
								onClick = {() => handleCardClick(tIndex, -1)}
								>
								{GetImage(item.specs, "small-token-image")}
								<ul>
									<li>{item.specs.ticker && `${item.specs.ticker}: `}{item.specs.shortname}</li>
									<li>{item.balance.holding}</li>
								</ul>
							</div>
						) : (
							item.coins.map((coin, cIndex) => (
								<div
									key={coin.coinid}
									className = "asset-card"
									style = {handleCardStyle(item, coin)}
									onClick = {() => handleCardClick(tIndex, cIndex)}
									>
									{GetImage(coin, "small-token-image")}
									<ul>
										<li>{item.specs.shortname}</li>
										<li>SN: {coin.serialno}</li>
									</ul>
								</div>
							))
						)
					))}
				</div>
			</section>
			
			{balData.length > 0 && <div>
				<section> {/* Selected item big image */}
					{
						balData[selected.token].collection.is !== "yes" ? (
							GetImage(balData[selected.token].specs, "big-token-image")
						) : (
							balData[selected.token].coins.length > 0 ? (
								GetImage(balData[selected.token].coins[selected.coin], "big-token-image")
							) : (
								<>No coins</>
							)
						)
					}
					<ul>
						<li style={{textAlign: "center", fontWeight: "bold"}}>{balData[selected.token].specs.name}</li>
						<li style={{textAlign: "center", fontWeight: "bold"}}>Tokenid: {balData[selected.token].specs.tokenid}</li>
						{balData[selected.token].collection.is === "yes" && balData[selected.token].coins.length > 0 && <li style={{textAlign: "center", fontWeight: "bold"}}>Serial number: {balData[selected.token].coins[selected.coin].serialno}</li>}
					</ul>
				</section>
				
				<section> {/* Selected item details */}
					{showMore && <h2>Token details</h2>}
					<div className = "section-to-row">
						<div className = "panel">
							<div className = "panel-to-row">
								<button
									className = "general-button"
									type = "button"
									onClick = {toggleMoreDetails}>
									{showMore ? "Hide" : "Show"} details
								</button>
								{balData[selected.token].collection.is === "yes" && <button
									className = "warning-button"
									type = "button"
									onClick = {toggleCollectionWarning}>
									Warning
								</button>}
							</div>
							{showMore && <div>
								<ul>
									<li>Name: {balData[selected.token].specs.name}</li>
									{balData[selected.token].specs.ticker && <li>Ticker: {balData[selected.token].specs.ticker}</li>}
									<li>Description: {balData[selected.token].specs.description}</li>
									<li>Amount created: {balData[selected.token].specs.total} (decimals: {balData[selected.token].specs.decimals})</li>
									<li>Webvalidate link: {balData[selected.token].specs.webvalidate}</li>
									<li>{getAttributeDisplay("script")}</li>
									<li>{getAttributeDisplay("url")}</li>
									{balData[selected.token].collection.is !== "yes" && balData[selected.token].coins.length > 0 && <li>{getAttributeDisplay("coinid")}</li>}
									{balData[selected.token].collection.is !== "yes" && balData[selected.token].coins.length > 0 && <li>{getAttributeDisplay("state")}</li>}
								</ul>
								<br/>
								{balData[selected.token].collection.is !== "yes" && <ul>
									<li>Sendable: {balData[selected.token].balance.sendable}</li>
									<li>Confirmed: {balData[selected.token].balance.confirmed}</li>
									<li>Unconfirmed: {balData[selected.token].balance.unconfirmed}</li>
									<li>Holding: {balData[selected.token].balance.holding}</li>
								</ul>}
							</div>}
						</div>
					</div>
				</section>
				
				{showMore && balData[selected.token].collection.is === "yes" && balData[selected.token].coins.length > 0 && <section>
					<h2>Details of selected Collection coin</h2>
					<div className = "panel">
						<ul>
							<li>Tokenamount: {balData[selected.token].coins[selected.coin].tokenAmount} {balData[selected.token].coins[selected.coin].tokenAmount > 1 && <strong>WARNING! COIN NOT FULLY SPLIT</strong>}
								{balData[selected.token].coins[selected.coin].tokenAmount > 1 && <button
									className = "small-button"
									type = "button"
									style = {{backgroundColor: "darkorange"}}
									onClick = {handleSplitRequest}
									>
									Split coin
								</button>}
								<button
									className = "small-button"
									type = "button"
									style = {{backgroundColor: "darkorange"}}
									onClick = {toggleShowSend}
									>
									{showSend ? "No send" : "Set up send"} 
								</button>
							</li>
							<li>{getAttributeDisplay("coinid", "selected")}</li>
							<li>{getAttributeDisplay("state", "selected")}</li>
						</ul>
					</div>
				</section>}

				{showSend && <section> {/* Send */}
					<h2>Sending the selected coin</h2>
					<div className = "panel">
						For sending a coin.
						This section is provided as the Minima Global Wallet dapp does not yet incorporate this functionality.  <strong style={{color: "red"}}>Please use with care.  If you are not sure, do not authorise.</strong>  In particular, please read and understand what the Pending dapp tells you, and you can read the draft instruction with the button on this page. <strong>Once a coin has been sent, it has left your wallet, and that is that.</strong>
						<form onSubmit = {handleSubmit}>
							<div className = "panel">
								<label className = "creator-label">
									{sendData.address.label}
									<input className = "creator-input"
										name = "address"
										type = "text"
										maxLength =  {sendData.address.maxLength}
										value = {sendData.address.is}
										onChange = {handleInputChange}
										disabled = {formDisabled}
									/>
								</label>
								{getHelpText("address")}
							</div>
							<div className = "panel">
								<label className = "creator-label">
									{sendData.amount.label}
									<input className = "creator-input"
										name = "amount"
										type = "number"
										min = {sendData.amount.min}
										max =  {sendData.amount.max}
										value = {sendData.amount.is}
										onChange = {handleInputChange}
										disabled = {formDisabled}
									/>
								</label>
								{getHelpText("amount")}
							</div>
							<div className = "panel">
								{/*// FINALISATION Comment out or leave in the burn mechanism for sending.
								<label className = "creator-label">
									{sendData.burn.label}
									<input className = "creator-input"
										name = "burn"
										type = "number"
										step = "0.00000001"
										min = {sendData.burn.min}
										max =  {sendData.burn.max}
										value = {sendData.burn.is}
										onChange = {handleInputChange}
										disabled = {formDisabled}
									/>
								</label>
								{getHelpText("burn")}*/}
								<button
									className = "general-button"
									type = "submit"
									>Build the transaction
								</button>
								{showPostButton && <button
									className = "general-button"
									type = "button"
									onClick = {handlePost}
									>Post the transaction
								</button>}
								<div className = "panel-to-row">
									<button
										className = "general-button"
										type = "button"
										onClick = {toggleShowBuildText}>
										{showBuildText ? "Hide" : "Show"} draft transaction instruction
									</button>
								</div>
							</div>
							{showBuildText && <div className = "panel">
								<h3>Draft transaction instructions to node</h3>
								{GetSendInstructionsDisplay(sendInstructions.lines)}
							</div>}
						</form>
					</div>
				</section>}
			</div>}
		</>
	)

}

export default Viewer;
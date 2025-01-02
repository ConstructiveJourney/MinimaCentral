import React from "react";
import { useState, useEffect } from "react";

import { GetImage } from "./utilities/CommonFunctions.jsx";
import Ports from "./Ports.jsx";
import GetPortNoFromScript from "./utilities/GetPortNoFromScript.jsx"
import { GetSendInstructions, GetSendInstructionsDisplay } from "./utilities/TransactionFunctions.jsx";
import { TranslatePortType } from "./utilities/TranlatePortType.jsx";


function Splitter ({minimaData, balData, originalSplitterData, splitterData, setSplitterData, splitterPorts, setSplitterPorts, flashMessage, updateFlashMessage, addToLog, block}) {

	const [formDisabled, setFormDisabled] = useState(false);
	const [showBuild, setShowBuild] = useState(false);
	const [showPostButton, setShowPostButton] = useState(false); // Show the button to post a transaction?
	const defaultConfirmationMessage = {
		message: "",
		action: "",
		labels: {
			yes: "Yes",
			no: "No"
		}
	}
	const [confirmationMessage, setConfirmationMessage] = useState(defaultConfirmationMessage); // For the user to confirm something.

	const steps = [
		"Enter details",
		"Build the instructions for the first transaction",
		"Build the transaction in the node",
		"Waiting for post button click",
		"Post transaction",
		"Processing transaction",
		"Build the instructions for the second transaction",
		"Build the transaction in the node",
		"Waiting for post button click",
		"Post transaction"
	]
	
	
	const handleInputChange = (e) => {
		switch (e.target.name) {
			case "tokenid":
				setSplitterData(prevSplitterData => ({ ...prevSplitterData, [e.target.name]: { ...prevSplitterData[e.target.name], is: e.target.value } }));
				
				let tLoc = balData.findIndex(token => token.specs.tokenid === e.target.value);
				if (tLoc !== -1) {
					setSplitterData(prevSplitterData => ({ ...prevSplitterData, selectedTokenPos: tLoc }));
					mapPorts(balData[tLoc]);
				}
				break;
			default:
				// Do nothing
				break;
		}
	}

	// To map the current ports into future ports.
	const mapPorts = (token) => {
		let tempArray = [];
		let coinChosen = token.coins.findIndex(coin => token.collection.is === "yes" && coin.tokenAmount > 1 && coin.isfixed === "FALSE");
		if (coinChosen !== -1) {
			addToLog("Splitter: Coin chosen for splitting: " + token.coins[coinChosen].coinid + ".");
			setSplitterData(prevSplitterData => ({ ...prevSplitterData, coinToSplit: token.coins[coinChosen] }));

			token.coins[coinChosen].state.forEach((state, i) => { // Put the ports data held in balData.
				tempArray[i] = {
					port: state.port,
					type: TranslatePortType(state.type),
					data: state.data,
					name: "",
					toBecomeFixed: ""
				}
			});

			// Then move on to the data held in the token script.
			let foundPort = GetPortNoFromScript(token.specs.script, "serialno");
			if (foundPort !== -1) {
				let place = tempArray.findIndex(port => port.port === foundPort);
				if (place !== -1) {
					tempArray[place].name = "serialno";
				}
			}
			foundPort = GetPortNoFromScript(token.specs.script, "isfixed");
			if (foundPort !== -1) {
				let place = tempArray.findIndex(port => port.port === foundPort);
				if (place !== -1) {
					tempArray[place].name = "isfixed";
				}
			}

			setSplitterPorts(tempArray);
		} else {
			updateFlashMessage("No suitable coin found with this tokenid.");
		}
	}

	const handleSubmit = (e) => {
		e.preventDefault();
		window.MDS.cmd(
			"checkmode", function (checkmode) {
				if (checkmode.response) {
					if (checkmode.response.mode !== "READ") { // Ensure app only has read permission, so user is forced to verify command.
						updateFlashMessage("\n- To be able to submit, please change this app to read mode by going back to your list of all apps, right clicking this one, and choosing \"Read mode\" instead of \"Write mode\".  It is important that you verify the output from this app.");
					} else {
						if (balData[splitterData.selectedTokenPos].collection.is === "yes") { // Check it is a collection
							let loc = splitterPorts.findIndex(port => port.name === "isfixed");
							if (loc === -1) {
								updateFlashMessage("You do not seem to have a port for isfixed.  Please create one.");
							} else if (splitterPorts[loc].data === "FALSE") {
								setFormDisabled(true);
								tickUpSplitterStage();
							} else {
								updateFlashMessage("Please change \"isfixed\" to \"FALSE\".  This will be changed to \"TRUE\" automatically for the second transaction.");
							}
						} else {
							updateFlashMessage("This does not seem to be a valid Collection.  Please choose a different tokenid.");
						}
					}
				} else {
					updateFlashMessage("There was a problem communicating with your node.  Submission abandoned.  Please check your node.");
				}
			}
		)
	}
		
	// To trigger an advance in the process each time a transaction completes
	useEffect(() => {
		switch (splitterData.splittingStage) {
			case 0: // The start.  There is no transaction yet.
				// Do nothing
				break;
			case 1: // User has pressed the submit button.  Build the instructions for the first transaction.
				createTransaction();
				break;
			case 2: // Transaction creation is complete.  Build the transaction in the node and ask for confirmation from the user.
				build(0);
				setShowBuild(true);
				break;
			case 3: // Transaction has been built and the user has confirmed.  Now wait for the user to click "post".
				setShowPostButton(true);
				break;
			case 4: // User has clicked "post" and confirmed.  Post the transaction and now wait for on-chain processing to complete.
				post(0);
				break;
			case 5: // Transaction has been posted.  Wait for on-chain processing to complete.
				updateFlashMessage("Please do not navigate away from this page of the MinimaCentral app, as it needs to monitor blocks being posted and then post the second transaction.  You can monitor progress on this page.");
				let tBlock = block + 4; // Note: Tested 4th August 2024 and an unconfirmed transaction becomes confirmed after four blocks.
				setSplitterData(prevSplitterData => ({ ...prevSplitterData, targetBlock: tBlock}));
				addToLog("Splitter: First transaction of the pair posted.  Waiting for transaction confirmation.");
				break;
			case 6:	// Build the instructions for the second transaction.
				createTransaction();
				break;
			case 7: // Build the transaction in the node and ask for confirmation from the user.
				build(0);
				break;
			case 8: // Wait for the user to click "post".
				setShowPostButton(true);
				break;
			case 9: // Post the transaction.
				post(0);
				break;
			case 10: // The process is complete.  Go back to the start.
				setFormDisabled(false);
				setShowBuild(false);
				clearData();
				addToLog("Splitter: Second transaction of the pair posted.");
				updateFlashMessage("The second transaction has been posted.  In four blocks' time the new coin should be confirmed.  This is the completion of the splitting process.  You may switch to a different part of this app, close it, or remain here and split off another coin.");
				break;
			default:
				// Do nothing
				break;
		}
	// eslint-disable-next-line
	}, [splitterData.splittingStage]);

	// To fix isfixed
	const fixIsfixed = () => {
		setSplitterPorts(prevSplitterPorts => ([
			...prevSplitterPorts.map(port => {
				if (port.port === balData[splitterData.selectedTokenPos].collection.ports.isfixed) {
					return ({
						...port, data: "TRUE"
					})
				} else {
					return ({
						...port
					})
				}
			})
		]));
	}

	// To create the transaction, before building it.
	const createTransaction = () => {
		let sendData = {address: {is: splitterData.coinToSplit.address}, amount: {is: 1}, burn: {is: 0}};
		let newTrans = GetSendInstructions(minimaData, balData[splitterData.selectedTokenPos], splitterData.coinToSplit, splitterPorts, sendData, "");
		setSplitterData(prevSplitterData => ({ ...prevSplitterData, transactionInstructions: newTrans.lines }));
		tickUpSplitterStage();
	}
	
	// To build the transaction.  Similar to the function in Viewer.
	const build = (line) => {
		if (line < splitterData.transactionInstructions.length) {
			window.MDS.cmd(
				splitterData.transactionInstructions[line], function (res) {
					if (res.response) {
						build(line + 1); // Recursive due to speed of response.

					} else {
						if (line === splitterData.transactionInstructions.length - 1) { // i.e. the final signature
							setConfirmationMessage({
								message: "Please open the Pending app and REVIEW THE TRANSACTION.  You can check the transaction detail by opening Terminal and typing in \"txnlist id:mctransid\".  Then return to this app and click the button to post it.",
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

	const post = (line) => {
		switch (line) {
			case 0:
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
				setShowPostButton(false);
				tickUpSplitterStage();
				break;
			default:
				// Do nothing
		}
	}

	const handlePost = () => {
		// check trans has been signed (i.e. the user approved in Pending) and then give user the final chance to abort.
		window.MDS.cmd(
			"txncheck id:mctransid", function (sigs) {
				if (sigs.response) {
					if (sigs.response.signatures > 0) {
						setConfirmationMessage({
							message: "Are you sure you wish to post the transaction?  After this, it CANNOT BE CHANGED OR UNDONE.",
							labels: {
								yes: "Post it",
								no: "No - go back"
							}
						})
					} else {
						updateFlashMessage("You do not appear to have confirmed the transaction in Pending.  Leaving this page open, please open Pending in a new tab, and approve (or deny) the transaction.")
					}
				} else {
					updateFlashMessage("There was a problem communicating with your node.  Submission abandoned.  Please check your node.");
					setFormDisabled(false);
					setSplitterData(prevSplitterData => ({ ...prevSplitterData, splitterStage: 0 }));
				}
		})
	}

	const handleConfirmation = (e) => {
		if (e === true) {
			tickUpSplitterStage();
		} else {
			updateFlashMessage("Process abandoned.  Please think through if there are any steps you should take.");
			setFormDisabled(false);
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

	// To check if targetBlock is reached and then find the split off coin.
	useEffect(() => {
		if (block === splitterData.targetBlock) {
			let coinFound = 0;
			balData[splitterData.selectedTokenPos].coins.forEach(coin => {
				if (coinFound === 0 && coin.tokenAmount === "1") { // Check tokenAmount is 1.
					let allStateOfCoinMatches = 1;
					for (let stateToCheck = coin.state.length - 1; stateToCheck > -1; stateToCheck--) {
						let posInSP = splitterPorts.findIndex(item => item.port === coin.state[stateToCheck].port);
						if (posInSP === -1 || splitterPorts[posInSP].data !== coin.state[stateToCheck].data) {
							allStateOfCoinMatches = 0;
							break;
						}
					}
					if (allStateOfCoinMatches === 1) {
						coinFound = 1;
						setSplitterData(prevSplitterData => ({ ...prevSplitterData, coinToSplit: coin}));
						fixIsfixed();
						tickUpSplitterStage();
					}
				}
			})
			if (coinFound === 0) { // If not found, give error message
				addToLog("Splitter: Failed to find split off coin; process abandoned.");
				updateFlashMessage("It seems the new coin has not been created.  The process will end at this point.  Please check your coins and investigate.");
				setSplitterData(prevSplitterData => ({ ...prevSplitterData, splittingStage: 0}));
			}
		}
	// eslint-disable-next-line
	}, [block]);

	// Reset all the data relating to Splitter back to its original app startup value.
	const clearData = () => {
		setSplitterData(originalSplitterData);
		setSplitterPorts([]);
	}

	const getProgressChart = () => {
		return (
			<div>
				<ol start = "0">
					{steps.map((item, index) => (
						<li key = {index}>
							{splitterData.splittingStage > index && <>COMPLETE </>}
							{item}
						</li>
					))}
				</ol>
			</div>
		)
	}

	const tickUpSplitterStage = () => {
		setSplitterData(prevSplitterData => ({ ...prevSplitterData, splittingStage: prevSplitterData.splittingStage + 1}))
	}

	return(
		<>
			{flashMessage && <div className = "flash-message">
				{flashMessage}
				<button
					type = "button"
					onClick = {() => updateFlashMessage("")}
					>OK
				</button>
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

			<section>
				<h2>Splitter</h2>
				<h3>For splitting Collection coins</h3>
				<em>If you haven't created a Colleciton, ignore this page</em>
				<em>Proof of concept</em>
			</section>
			
			<form onSubmit = {handleSubmit}>
				<section>
					<div className = "panel"> {/* Input box */}
						<label className = "creator-label">
							{splitterData.tokenid.label} <em>(required)</em>
							<input className = "creator-input"
								name = "tokenid"
								type = "text"
								pattern = {splitterData.tokenid.pattern}
								maxLength = {splitterData.tokenid.maxLength}
								value = {splitterData.tokenid.is}
								onChange = {handleInputChange}
								disabled = {formDisabled}
							/>
						</label>
						{splitterData.tokenid.helpText[0]}
					</div>
					
					{balData[splitterData.selectedTokenPos] && <>
						<div className = "panel"> {/* Picture of the token */}
							{<div className = "nohover-asset-card">
								{GetImage(balData[splitterData.selectedTokenPos].specs, "small-token-image")}
							</div>}
						</div>
						
						<div className = "panel"> {/* Splitting off a coin */}
							<ul>
								{balData[splitterData.selectedTokenPos] && <li>Your wallet contains {balData[splitterData.selectedTokenPos].coins.length} coins of this tokenid for a total amount of {balData[splitterData.selectedTokenPos].balance.holding}.
								</li>}
								<li>Pressing "Submit" will create two new coins, by splitting an existing coin.  One will be for an amount of one less than that existing coin.  The other will be for amount of 1.</li>
								<li>The app will then go on to fix the coin of amount 1 so that it cannot be changed again in future.</li>
							</ul>
						</div>
						
						<div className = "panel"> {/* Input area for port values */}
							Port no./Name/Type/Desired values
							{<Ports updateFlashMessage = {updateFlashMessage} ports = {splitterPorts} setPorts = {setSplitterPorts} makeCollection = {false} setScriptCheckNeeded = {false} requestor = "Splitter"/>}
							<ul>
								<li>Please set the state port values to be whatever you would like for the new fixed coin of amount 1.  Remember to set the serialno to a different one from all those used previously, normally in a numerical sequence.  The app will automatically change isfixed to true for the relevant coin, via its second transaction.  Please take care with your choices, as the app will not check them against other coins.</li>
							</ul>
						</div>
						
						{splitterData.splittingStage === 0 && <button
							className = "general-button"
							type = "submit"
							>Submit {/* Submit button */}
						</button>}

						{showPostButton && <button
							className = "general-button"
							type = "button"
							onClick = {handlePost}
							>Post the transaction
						</button>}

						<button
							className = "general-button"
							type = "button"
							onClick = {clearData}
							>Clear form
						</button>
					</>}
				</section>
			</form>
			<section>
				{showBuild && <div className = "panel">
					<h3>Steps</h3>
					{getProgressChart()}
					{splitterData.splittingStage === 5 && <div>
						<h3>Progress</h3>
						<ul>
							<li>Latest block: {block}</li>
							<li>Block when split will be confirmed (please be patient): {splitterData.targetBlock}</li>
						</ul>
					</div>}
					<h3>Draft transaction instructions to node</h3>
					{GetSendInstructionsDisplay(splitterData.transactionInstructions)}
				</div>}
			</section>
		</>
	)
}

export default Splitter;
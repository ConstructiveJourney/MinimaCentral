import { useEffect, useState, useRef } from "react";
import { produce } from "immer";
import { Mutex } from "async-mutex";

import mcLogo from "./assets/mclogo.png";
import viewerIcon from "./assets/viewer_icon.png";
import creatorIcon from "./assets/creator_icon.png";
import splitterIcon from "./assets/splitter_icon.png";
import infoIcon from "./assets/info_icon.png";
import logIcon from "./assets/log_icon.png";

import "./App.css";
// import MDS from "./components/utilities/dms.js"; // ALTERNATIVE MDS

import GenerateSVG from "./components/utilities/CreateFiller.jsx"
import GetPortNoFromScript from "./components/utilities/GetPortNoFromScript.jsx"
import { GetRE } from  "./components/utilities/ContentEnforcer.jsx" // RegEx.
import { GetReplacement } from "./components/utilities/ContentEnforcer.jsx" // The replacement text, to go with RegEx.

import Viewer from "./components/Viewer.jsx";
import Creator from "./components/Creator.jsx"
import Splitter from "./components/Splitter.jsx"
import Info from "./components/Info.jsx"
import Log from "./components/Log.jsx"

function App() {
	const [minimaBrowser, setMinimaBrowser] = useState(true); // What browswer is being used.
	const showTitleBar = () => { // This brings up the Android title bar, so the user can exit back to the Minima app.
		if (window.navigator.userAgent.includes("Minima Browser")) {
			// eslint-disable-next-line
			Android.showTitleBar();
		} else {
			setMinimaBrowser(false);
		}
	}

	const [page, setPage] = useState("viewer");
	const [desiredPage, setDesiredPage] = useState("");
	const [navConfirmationMessage, setNavConfirmationMessage] = useState(""); // For the user to confirm something relating to the nav bar.
	
	const handleNavClick = (value) => {
		if (value === "splitter" && window.navigator.userAgent.includes("Minima Browser")) {
			setFlashMessage("To use Splitter, you must be in a browser, not on mobile.  Please go to Settings and use Desktop Connect");
		} else {
			if (page === "splitter" && splitterData.splittingStage > 0) {
				setDesiredPage(value);
				setNavConfirmationMessage("Are you sure you wish to move to a different page?  This will abort your process.  Please confirm.")
			} else {
				setPage(value)
			}
		}
	}

	const handleNavConfirmation = (value) => {
		if (value === true) {
			setPage(desiredPage)
		}
		setNavConfirmationMessage("");
	}
	
	const [appLog, setAppLog] = useState(["Log started."]); // A log of events.
	const [currentLog, setCurrentLog] = useState([]); // front--of-mind log.
	const currentLogMemory = 5000; // How many milliseconds to keep log messages front-of-mind.
	const timeoutsRef = useRef([]); // To give references for timeouts which survive re-renders.
	const [flashMessage, setFlashMessage] = useState(""); // Any flash message.
	// FUTURE Change flashMessage so it becomes a queue, rather than the latest overwriting the previous.  Could also combine in the other message type, with a switch for which it is.
	
	const [userAddress, setUserAddress] = useState(""); // One of the user's existing default Minima addresses.  To use as a change address.

	const newcoinMutex = useRef(new Mutex()); // A locking function for updating balData on NEWCOIN events.
	const [newcoinMessages, setNewcoinMessages] = useState([]); // To store NEWCOIN messages. // Programming note: This will be passed to MDS, which will NOT receive any subsequent updates from outside MDS.
	const [newcoinControl, setNewcoinControl] = useState(
		{
			triggerUpdate: 0, // To trigger an update.
			stage: 1, // The stage that the NEWCOIN process is at.
			currentMessage: 0 // The newcoinMessage which is current to be processed, or will be next.
		}
	);
	const [newcoinIsNewToken, setNewcoinIsNewToken] = useState(0); // Whether the token is a new token.
	const [unconfirmedTokens, setUnconfirmedTokens] = useState([]); // Any unconfirmed tokens, with .block and .tokenid.
	const confirmationDelay = 4;
	
	const [minimaData, setMinimaData] = useState( // Minima held.
		{
			balance: {
				confirmed: "",
				unconfirmed: "",
				holding: "",
				sendable: ""
			},
			coins: [] // { coinid, amount, address, miniaddress }
		}
	);
	const defaultToken = { // Some data included in case the user has zero non-Minima tokens.
		balance: {
			confirmed: "",
			unconfirmed: "",
			holding: "",
			sendable: ""
		},
		specs: {
			name: "Welcome!",
			shortname: "Welcome", // This used as a test in the getBalance function.
			description: "Any Minima tokens are listed as a number.  When you have other tokens, they will show in the main part.",
			ticker: "",
			tokenid: "",
			total: "",
			decimals: "",
			scale: "",
			script: "",
			url: "Not artimage",
			filler: [
				{
					cx: "",
					cy: "",
					rx: "",
					ry: "",
					color: ""
				}
			]
		},
		coins:
			[
				{
					coinid: "",
					amount: "", // The Minima colored.
					tokenAmount: "",
					address: "",
					miniaddress: "",
					state:
						[
							{
								port: "",
								type: "", // Programming note: Four choices: 1 = hex, 2 = number, 4 = string, 8 = boolean.  Source: https://github.com/minima-global/Minima/blob/master/src/org/minima/objects/StateVariable.java
								data: ""
							}
						],
					serialno: "",
					isfixed: "" // true or false.
					// and others, which collections may specify.
				}
			],
		receivedPosition: 0, // The order in which provided by MDS's "balance" command.
		collection: {
			is: "", // "yes" or "no", normally
			type: "",
			ports: {
				serialno: "",
				isfixed: ""
			} // e.g. isfixed:254
		}
	}
	const [balData, setBalData] = useState( // Any non-Minima tokens
		[defaultToken]
	);

	const defaultSelected =	{
		token: 0,
		coin: 0
	}
	const [selected, setSelected] = useState(defaultSelected); // Which item the user has selected.
	

	const [block, setBlock] = useState(0); // The latest block.
	const [pause, setPause] = useState(-2); // Whether to pause.
	const delayOnNewBlock = 5000;
	const generalTimeoutsRef = useRef([]);
	
	const textPattern = "^(?!.*(%0D|%0A))[^'\"\\\\]+"; // Bans ', ", \ and two types of newline. \ should also pick up \n and \r, as it is part of each.

	const [newToken, setNewToken] = useState({ // Programming note: held at this level so as to be available to more than one component.
		name: {
			userInput: true,
			pattern: textPattern,
			label: "Name for token",
			is: null,
			example: "NewToken",
			maxLength: 255 // Arbitrary limit.
		},
		description: {
			userInput: true,
			pattern: textPattern,
			label: "Description",
			is: null,
			example: "A new token I created",
			maxLength: 255, // 255 is the maximum which Wallet allows; following that.
			konami: "uuddlrlrba"
		},
		ticker: {
			userInput: true,
			pattern: textPattern,
			label: "Ticker",
			is: null,
			example: "NT",
			maxLength: 5 // 5 is the maximum which Wallet allows.
		},
		decimals: {
			userInput: true,
			label: "Number of decimal places",
			is: 0, // 8 is what Wallet uses.
			min: 0,
			max: 16,
			example: 8,
			helpText: [
				"Default in Minima Global's Wallet app is 8; maximum is 16; choose 0 for an NFT or if you just want whole numbers.",
				"Your choice affects the cost of minting, in Minima tokens, although it will always be tiny."
			],
			extendedHelp: false
		},
		amount: { // The number of tokens to be minted.
			userInput: true,
			label: "Amount to create",
			is: 1,
			min: 1,
			max: 1000000000000, // 1 trillion.  As per docs.minima.global
			example: 1,
			helpText: [
				"Minimum 1; maximum 1 trillion."
			],
			extendedHelp: false
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
		signtoken: {
			userInput: true,
			pattern: textPattern,
			label: "Signtoken",
			is: null,
			example: "0x9F9FBFD83D999D952BE4A6538252043987F3937F3BBC361F00D5AE708EF1A105",
			maxLength: 100,
			helpText: [
				"Provide a public key to sign the token with.  Useful to prove you are the creator of the token."
			],
			extendedHelp: false
		},
		webvalidate: {
			userInput: true,
			pattern: textPattern,
			label: "Webvalidate",
			is: null,
			maxLength: 512,
			example: "https://www.example.com/nameofpage.txt",
			helpText: [
				"Provide a URL to a publicly viewable .txt file you are hosting which stores the tokenid for validation purposes.  Create the file in advance and add the tokenid to it after the token has been minted."
			],
			extendedHelp: false
		},
		script: {
			userInput: true,
			pattern: textPattern,
			label: "Script",
			is: null,
			maxLength: 10000, // Tested via ScriptIDE 11th Sep 2023.  Max "instructions" of 1024.  In my test, 1024 instructions equated to about 5k characters.
			example: "\"ASSERT VERIFYOUT(@TOTOUT-1 0xMyAddress 1 0x00 TRUE)\"",
			helpText: [
				"Add a custom script that must return 'TRUE' when spending any coin of this token."
			],
			extendedHelp: false,
			explained: [ // The token script, broken up with explanations.
				{
					line: "The script, as above",
					comment: "But with explanatory comments here"
				}
			]
		},
		state: {
			userInput: true,
			pattern: textPattern,
			label: "State",
			is: null,
			maxLength: 1024 * 64, // Arbitrary number; not tested.
			example: "{\"0\":\"42\", \"254\":\"FALSE\", \"255\":\"[{name:collections, version:1}]\"}",
			helpText: [
				"Any state to include."
			],
			extendedHelp: false
		},
		minimaColored: 0,
		imageFile: { // The image file chosen by the user to upload.
			userInput: true,
			specificImageRelated: true,
			label: "Image",
			original: {},
			is: {}, // When defined here, Must be the same as "original"
			helpText: [
				"Core file types accepted: jpeg/jpg and png.",
				"Depending on its original size and complexity, the image will be made smaller and compressed, to match or fit within the project's standard parameters."
			],
			extendedHelp: false
		},
		src: { // The src for the img file.
			userInput: false,
			specificImageRelated: true,
			original: null,
			is: null
		},
		preferredOutcome: {
			userInput: true,
			label: "When compressing the image, try to maintain",
			is: "size",
			helpText: [
				"Best quality (less blockiness) or biggest image size (maybe better for impact)?"
			],
			extendedHelp: false
		},
		preferredPOT: {
			userInput: true,
			label: "Limit sizing to powers of two",
			is: false,
			standard: false,
			helpText: [
				"Powers of two (a number in the series 2, 4, 8, 16, etc.) can be a good idea as it will tend to make compression work better.",
				"Compressing pixels in a ratio of e.g. 2:1 or 4:1 can work better than e.g. 5:1.  It also means you will end up with a more standard size image."
			],
			extendedHelp: true
		},
		preferredDimensions: {
			userInput: true,
			label: "Max. width and height",
			is: 80,
			min: 32, // If changing min. or max., also need to change slider parameters.
			max: 256,
			standard: 80,
			helpText: [
				"Your preferred max. width and max. height."
			],
			extendedHelp: false
		},
		preferredQuality: {
			userInput: true,
			label: "Quality",
			is: 60,
			min: 1,
			max: 100,
			standard: 60,
			helpText: [
				"Your preferred quality of the image, on resizing."
			],
			extendedHelp: false
		},
		preferredMaxB64Size: {
			userInput: true,
			label: "Desired max. image size",
			is: 4000,
			min: 100, // Arbitrarily chosen
			max: 5000, // Set as slightly greater than what the Wallet's mechanism can produce, which gets to about 4.
			helpText: [
				"In bytes.",
				"This parameter is less important than desired dimensions and quality, unless you have a specific purpose."
			],
			extendedHelp: true
		},
		dimensions: {
			userInput: false,
			specificImageRelated: true,
			original: null,
			is: null
		},
		quality: {
			userInput: false,
			specificImageRelated: true,
			original: null,
			is: null,
			min: 1,
			max: 100 // The canvas goes from 0 to 1; react-image-file-resizer from 0 to 100.
		},
		base64Encoding: {
			userInput: false,
			specificImageRelated: true,
			original: null,
			is: null
		},
		b64Size: { // The size of the image.
			userInput: false,
			specificImageRelated: true,
			original: null,
			is: null,
			max: null
		},
		url: { // What is going to be published to the blockchain with the "tokencreate" command, including "<artimage>".
			userInput: false,
			specificImageRelated: true,
			original: null,
			is: null
		},
		includePorts: { // Whether to include the list of ports.
			userInput: true,
			is: false,
			standard: false
		},
		makeCollection: { // Whether to make it a collection.
			userInput: true,
			is: false,
			standard: false
		},
		includePortListingPorts: { // Whether to include a port listing other ports.  0 = false; 1 = true.
			userInput: true,
			is: 1,
			standard: 1
		},
		portListingPorts: { // The port to be used, if any, for listing ports.
			userInput: true,
			label: "Preferred port",
			is: 1,
			min: 0,
			max: 255,
			helpText: [
				"We suggest port 1 for this.  In any event, it should be within the range of ports which become fixed."
			],
			extendedHelp: false
		}
	});

	const [ports, setPorts] = useState([]); // The ports entered by the user when creating a token.
	
	const originalSplitterData = {
		selectedTokenPos: null,
		tokenid: {
			userInput: true,
			pattern: textPattern,
			label: "Tokenid",
			is: "",
			example: "0x6B7C6C6897B85FF2AC3FD0F983FF7481F1D35430E7CE43BF465201461A8455F8",
			maxLength: 66,
			helpText: [
				"The tokenid of the coin(s) to be split."
			]
		},
		coinToSplit: null,
		transactionInstructions: [],
		splittingStage: 0, // How far through the splitting have we got.
		targetBlock: 1 // A block which will trigger an action.
	}
	const [splitterData, setSplitterData] = useState(originalSplitterData); // The data used by the Splitter app.
	const [splitterPorts, setSplitterPorts] = useState([]); // The future ports when splitting a token.

	
	// Startup tasks.
	// Programming note: state variables can only be accessed via the setter.  See https://stackoverflow.com/questions/57847594/accessing-up-to-date-state-from-within-a-callback.  This means subsequent updates outside this function will not be known within it.  Potentially it causes more unexpected behaviour as well?
	useEffect(() => {
		// To start MDS.
		// FUTURE Potentially longer functions should be converted from arrow functions to "normal" functions.  e.g. window.MDS.init(function(msg) {

		window.MDS.init((msg) => {
			// addToLog("msg: " + JSON.stringify(msg));
			switch (msg.event) {
				case "inited":
					addToLog("MDS inited.");
					getBalance();
					break;
				case "NEWCOIN":
					addToLog("NEWCOIN: coinid:" + msg.data.coin.coinid + ", relevant:" + msg.data.relevant + ", spent:" + msg.data.spent + ", tokenid:" + msg.data.coin.tokenid + ", amount:" + msg.data.coin.amount + ".");
					if (msg.data.relevant === true) {
						setNewcoinMessages(prevNewcoinMessages => [
							...prevNewcoinMessages,
							msg
						]);
					}
					break;
				case "NEWBALANCE": // Programming note: NEWBALANCE does not provide underlying data e.g. giving the tokenid.  Also, is not triggered by a coin becoming "confirmed", i.e. the passing of a certain arbitrary number of blocks.
					addToLog("NEWBALANCE.");
					break;
				case "NEWBLOCK":
					setBlock(parseInt(msg.data.txpow.header.block));
					break;
				default:
					// Do nothing.
					break;
			}
		});

		// To get an address, to be used as a change address for any coins.
		window.MDS.cmd("getaddress", function (getaddress) {
			if (getaddress.response) {
				setUserAddress(getaddress.response.address);
				addToLog("MDS getaddress command got your address " + getaddress.response.address + ".");
			} else {
				addToLog("MDS getaddress command failed.");
				setFlashMessage("Failed to get an address from the node.  The send function will be disabled.");
			}
		});

		// To get the block number, and warn the user if the dapp has not been updated for a long time.
		window.MDS.cmd("block", function (blockQuery) {
			if (blockQuery.response.block) {
				let blockAtCurrentVersionRelease = 1244000; // FINALISATION Update to approximate block number at time of release.  Can also change arbitrary period below.
				let arbitraryUsagePeriod = 72 * 24 * 365; // blocks per hour x hours per day x days
				let blocksPassed = Number(blockQuery.response.block) - blockAtCurrentVersionRelease;
				if (blocksPassed > arbitraryUsagePeriod) {
					let warning = "Warning: It is " + blocksPassed + " blocks since this dapp was updated.  It is quite old now.  Please check for an updated version.  If none, then consider stopping using the dapp, in case of security vulnerabilities.";
					addToLog(warning);
					setFlashMessage(warning);
				}
			} else {
				addToLog("MDS block command failed.");
			}
		});

	// Following line required to avoid flag on compilation.  See https://stackoverflow.com/questions/55840294/how-to-fix-missing-dependency-warning-when-using-useeffect-react-hook.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Function to run "balance" command on node, to get balances of all tokens, and then record in a state array for future use.
	const getBalance = () => {
		window.MDS.cmd("balance", function (balance) {
			if (balance.response) {
				window.MDS.cmd("coins relevant:true", function (coins) { // Programming note: putting one inside the other to make the engine wait before execution of the next code.  My interpretation is that consulting MDS delays it, so otherwise it skips ahead.
					if (coins.response) {
						let nextMinimaCoins = []; // Going to treat these differently as not referred to in the same way as balData items by other parts of the dapp.
						const nextBalData = produce(balData, draft => {
							addToLog("Populating tokens and coins...");

							if (draft[0].specs.shortname === "Welcome") {
								draft.shift();
							}
							
							let balResponseArray = balance.response;
							if (balResponseArray[0].tokenid === "0x00") { // FUTURE Why check the tokenid before doing this?  Can the test be removed?
								balResponseArray.reverse(); // Reversed, so as to go from old to new in the ordering (on the assumption that "balance" returns newest first).
							}
							
							let tPos = 0;
							let cPos = 0;

							let nextFreePos = balData.length;
							balResponseArray.forEach(item => { // Add any tokens missing from dapp's records.
								if (item.tokenid === "0x00") { // Record or update Minima balance.
									addToLog("Updating Minima balance.");
									updateBalance(item.tokenid, item, 0);
								} else { // If anything other than a Minima coin
									tPos = draft.findIndex(token => token.specs.tokenid === item.tokenid);
									if (tPos === -1) {
										let newItem = formToken(item, nextFreePos);
										nextFreePos++;
										draft.push(newItem);
									}
								}
							})

							coins.response.forEach(item => { // Add any coins missing from dapp's records.
								if (item.tokenid === "0x00") { // If a Minima coin
									let mCoin = {
										coinid: item.coinid,
										amount: Number(item.amount),
										address: item.address,
										miniaddress: item.miniaddress
									}
									nextMinimaCoins.push(mCoin);
								} else { // If not a Minima coin
									tPos = draft.findIndex(token => token.specs.tokenid === item.tokenid);
									cPos = draft[tPos].coins.findIndex(coin => coin.coinid === item.coinid);
									if (cPos === -1) {
										if (draft[tPos].coins.length === 0) { // Add details which are the same for all coins of that token.
											draft[tPos].specs.script = item.token.script; // script
											draft[tPos].specs.scale = item.token.scale; // scale
											draft[tPos].specs.decimals = parseInt(item.token.decimals); // decimals
										}
										let coin = formCoin(item.coinid, item.amount, item.tokenamount, item.token.scale, item.address, item.miniaddress, item.state);
										
										// Dealing with collections
										if (draft[tPos].collection.is === "yes") { // If the token is already categorised as a collection}
											coin = addCollectionDataForCoin(coin, draft[tPos].collection.ports);
										} else if (draft[tPos].collection.is !== "no") { // i.e. based on this and previous "if", if unknown whether it is or not.
											let indexOfPort255 = item.state.findIndex(state => state.port === 255); // Iterate through state.
											if (indexOfPort255 !== -1) { // If a state found with port 255.
												if (item.state[indexOfPort255].data.includes("protocol:collection") || item.state[indexOfPort255].data.includes("name:collection")) { // If it specifies collection
													draft[tPos].collection.is = "yes"; // FUTURE This test will need expanding for different versions of collections.  Currently, the app assumes that anything labelled "collection" follows a particular standard.
													let serialnoLoc = GetPortNoFromScript(item.token.script, "serialno");
													if (serialnoLoc !== -1 ) {
														draft[tPos].collection.ports.serialno = serialnoLoc;
													}
													let isfixedLoc = GetPortNoFromScript(item.token.script, "isfixed");
													if (isfixedLoc !== -1 ) {
														draft[tPos].collection.ports.isfixed = isfixedLoc;
													}
													coin = addCollectionDataForCoin(coin, draft[tPos].collection.ports);
												} else {
													draft[tPos].collection.is = "no";
												}
											}
										}
										draft[tPos].coins.push(coin);
									}
								}
							})

							draft.forEach((item, index) => {
								if (item.coins.length > 1) { // ...sort the coins.
									let selectedCoinCoinid;
									if (index === selected.token && selected.coin) {
										selectedCoinCoinid = JSON.parse(JSON.stringify(item.coins[selected.coin].coinid));
									}

									if (item.coins[0].serialno !== undefined) {
										item.coins.sort((a, b) => {
											if (a.serialno === undefined) {a.serialno = ""};
											if (b.serialno === undefined) {b.serialno = ""};
											return a.serialno.localeCompare(b.serialno);
										})
									} else {
										item.coins.sort((a, b) => a.coinid.localeCompare(b.coinid));
									}

									if (index === selected.token && selected.coin) {
										let coinPos = item.coins.findIndex(coin => coin.coinid === selectedCoinCoinid);
										setSelected(prevSelected => ({
											...prevSelected,
											coin: coinPos,
										}));
									}
								}
							})
						
							let cPosR = 0; // Remove any coins in the dapp's records which were not reported by the node.  Tokens left in.
							let tCounter = draft.length - 1;
							while (tCounter >= 0) {
								let cCounter = draft[tCounter].coins.length - 1;
								while (cCounter >= 0) {
									cPosR = coins.response.findIndex(coin => coin.coinid === draft[tCounter].coins[cCounter].coinid);
									if (cPosR === -1) { // Depending on circumstances, change selected coin.
										if (draft[tCounter].collection.is !== "yes") {
											setSelected(prevSelected => ({
												...prevSelected,
												coin: 0,
											}));
										} else {
											if (draft[tCounter].coins.length < cCounter + 2) { // Next coin clicks in automatically, unless there isn't a next coin.
												setSelected(prevSelected => ({
													...prevSelected,
													coin: 0,
												}));
												if (page !== "splitter") {
													setFlashMessage("The selected coin has changed; please check it is still the one you desire, particularly if you are about to send a coin!");
												}
											}
										}
										draft[tCounter].coins.splice(cCounter, 1); // Remove coin.
									}
									cCounter--
								}
								tCounter--;
							}

							if (draft.length === 0) { // If empty, add the Welcome token.
								draft.push(defaultToken);
							}
						})
						setMinimaData(prevMinimaData => ({
							...prevMinimaData,
							coins: nextMinimaCoins
						}));
						setBalData(nextBalData);
						addToLog("...population completed.");
					
					} else {
						handleNodeResponseIssue("coins", "main fail");
					}
				})
				
			} else {
				handleNodeResponseIssue("balance", "main fail");
			}
		})
	};

	// Triggered by a NEWCOIN event.
	useEffect(() => {
		if (newcoinMessages.length > 0) { // Programming note: prevents running on startup.
			newcoinMutex.current.acquire().then(() => {
				if (pause === block) { // If the pause expires on this block, add in a delay, to allow the getBalance to operate first.
					let timeout = setTimeout(() => {
						setNewcoinControl(prevNewcoinControl => ({ // Programming note: calling the function directly causes an error as it remembers the value of currentMessage from too early.
							...prevNewcoinControl,
							triggerUpdate: prevNewcoinControl.triggerUpdate + 1
						}));
					}, delayOnNewBlock);
					generalTimeoutsRef.current.push(timeout);
				} else {
					setNewcoinControl(prevNewcoinControl => ({
						...prevNewcoinControl,
						triggerUpdate: prevNewcoinControl.triggerUpdate + 1
					}));
				}
			})
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newcoinMessages]);

	// To check whether an update is needed and then, if so, trigger it.
	useEffect(() => {
		if (newcoinMessages.length > 0) { // Programming note: prevents running on startup.
			let act = 0;
			
			let tokenFound;
			if (newcoinMessages[newcoinControl.currentMessage].data.coin.tokenid === "0x00") {
				tokenFound = 0;
			} else {
				tokenFound = balData.findIndex(token => token.specs.tokenid === newcoinMessages[newcoinControl.currentMessage].data.coin.tokenid);
			}

			if (tokenFound !== -1) {
				let coinFound;
				if (newcoinMessages[newcoinControl.currentMessage].data.coin.tokenid === "0x00") {
					coinFound = minimaData.coins.findIndex(coin => coin.coinid === newcoinMessages[newcoinControl.currentMessage].data.coin.coinid);
				} else {
					coinFound = balData[tokenFound].coins.findIndex(coin => coin.coinid === newcoinMessages[newcoinControl.currentMessage].data.coin.coinid);
				}

				if (coinFound !== -1) {
					if (newcoinMessages[newcoinControl.currentMessage].data.spent === true) {
						act = 1;
					}
				} else {
					if (newcoinMessages[newcoinControl.currentMessage].data.spent === false) {
						act = 1;
					}
				}
			} else {
				if (newcoinMessages[newcoinControl.currentMessage].data.spent === false) {
					act = 1;
				}
			}

			if (act === 1) {
				setNewcoinControl(prevNewcoinControl => ({
					...prevNewcoinControl,
					stage: 0
				}));
			} else {
				setNewcoinControl(prevNewcoinControl => ({
					...prevNewcoinControl,
					currentMessage: prevNewcoinControl.currentMessage + 1,
					stage: prevNewcoinControl.stage + 10 // To give newCoin.messages a chance to update before we release the mutex.
				}))
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newcoinControl.triggerUpdate]);

	// To update a coin.
	useEffect(() => {
		if (newcoinMessages.length > 0) { // Programming note: prevents running on startup.
			let tokenid;
			switch (newcoinControl.stage) {
				case -1:
					// Do nothing.
					break;
				case 0: // Deal with token.
					tokenid = newcoinMessages[newcoinControl.currentMessage].data.coin.tokenid;
					let toGet = "balance tokenid:" + tokenid;
					window.MDS.cmd(toGet, function (balance) {
						if (balance.response && balance.response.length !== 0) { // FUTURE Is there a better way of error checking?
							let pos = 0;
							// First, update the token.
							if (tokenid === "0x00") { // Record or update Minima balance.
								addToLog("Updating Minima balance.");
								updateBalance(tokenid, balance.response[0], 0);
								setNewcoinControl(prevNewcoinControl => ({
									...prevNewcoinControl,
									stage: prevNewcoinControl.stage + 1
								}));
							} else { // Record or update non-Minima balance.
								addToLog("Updating non-Minima balance.  Tokenid: " + tokenid + ".");
								pos = balData.findIndex(token => token.specs.tokenid === tokenid);
								if (pos === -1) { // If an unknown token
									setNewcoinIsNewToken(1);
									pos = balData.length;
									let newToken = formToken(balance.response[0], pos);
									if (balData[0].specs.shortname === "Welcome") {
										setBalData([newToken]); // Delete Welcome token
									} else {
										setBalData(prevBalData => (
											[...prevBalData, newToken]
										))
									}
								} else {
									updateBalance(tokenid, balance.response[0], pos);
								}
								setNewcoinControl(prevNewcoinControl => ({
									...prevNewcoinControl,
									stage: prevNewcoinControl.stage + 1
								}));
							}
						} else {
							setNewcoinControl(prevNewcoinControl => ({
								...prevNewcoinControl,
								currentMessage: prevNewcoinControl.currentMessage + 1
							}));
							if (balance.response.length === 0) {
								handleNodeResponseIssue("balance", "blank array");
							} else {
								handleNodeResponseIssue("balance", "no response");
								newcoinMutex.current.release();
							}
						}
					})
					break;
				case 1:	// Deal with the coin.
					tokenid = newcoinMessages[newcoinControl.currentMessage].data.coin.tokenid;
					let coinid = newcoinMessages[newcoinControl.currentMessage].data.coin.coinid;
					let pos = balData.findIndex(token => token.specs.tokenid === tokenid);
					if (newcoinMessages[newcoinControl.currentMessage].data.spent === true) { // ...remove the coin.
						if (tokenid === "0x00") {
							setMinimaData(prevMinimaData => ({
								...prevMinimaData,
								coins: prevMinimaData.coins.filter(function (c) {
									return c.coinid !== coinid;
								})
							}));
						} else {
							// If token and coin match selected, change selected.
							if (pos === selected.token && balData[pos].coins.length > selected.coin && coinid === balData[pos].coins[selected.coin].coinid) {
								if (balData[pos].collection.is !== "yes") {
									setSelected(prevSelected => ({
										...prevSelected,
										coin: 0,
									}));
								} else {
									let cPos = balData[pos].coins.findIndex(coin => coin.coinid === coinid);
									if (balData[pos].coins.length < cPos + 2) { // Next coin clicks in automatically, unless there isn't a next coin.
										setSelected(prevSelected => ({
											...prevSelected,
											coin: 0,
										}));
										if (page !== "splitter") {
											setFlashMessage("The selected coin has changed; please check it is still the one you desire, particularly if you are about to send a coin!");
										}
									}
								}
							}

							setBalData(prevBalData => ([
								...prevBalData.map((token, i) => {
									if (i === pos) { // Remove the relevant coin.
										let replacementToken = prevBalData[pos];
										replacementToken.coins = prevBalData[pos].coins.filter(function (c) {
											return c.coinid !== coinid;
										})
										return replacementToken;
									}
									return token;
								})
							]))
						}
					} else { // Add the coin.
						let toGet = "coins relevant:true coinid:" + coinid;
						window.MDS.cmd(toGet, function (coins) {
							if (coins.response && coins.response.length !== 0) {
								if (tokenid === "0x00") {
									let newC = {
										coinid: coins.response[0].coinid,
										amount: Number(coins.response[0].amount),
										address: coins.response[0].address,
										miniaddress: coins.response[0].miniaddress
									}
									setMinimaData(prevMinimaData => ({
										...prevMinimaData,
										coins: [...prevMinimaData.coins, newC]
									}))
								} else { // If not tokenid 0x00
									setBalData(prevBalData => ([
										...prevBalData.map((token, i) => {
											if (i === pos) {
												return ({
													...token, specs: {
														...token.specs,
														script: coins.response[0].token.script,
														scale: coins.response[0].token.scale,
														decimals: coins.response[0].token.decimals
													}
												})
											}
											return token;
										})
									]))
									
									let newC = formCoin(coins.response[0].coinid, coins.response[0].amount, coins.response[0].tokenamount, coins.response[0].token.scale, coins.response[0].address, coins.response[0].miniaddress, coins.response[0].state);
									
									// Dealing with collections
									if (newcoinIsNewToken === 0 && balData[pos].collection.is === "yes") { // If the token is already categorised as a collection}
										newC = addCollectionDataForCoin(newC, balData[pos].collection.ports);
									} else {
										let indexOfPort255 = coins.response[0].state.findIndex(state => state.port === 255); // Iterate through state.
										if ((indexOfPort255 !== -1) && (coins.response[0].state[indexOfPort255].data.includes("protocol:collection") || coins.response[0].state[indexOfPort255].data.includes("name:collection"))) { // If a state found with port 255 and if it specifies collection
											let portsData = {};
											let serialnoLoc = GetPortNoFromScript(coins.response[0].token.script, "serialno");
											if (serialnoLoc !== -1 ) {
												portsData = {serialno: serialnoLoc};
											}
											let isfixedLoc = GetPortNoFromScript(coins.response[0].token.script, "isfixed");
											if (isfixedLoc !== -1 ) {
												portsData.isfixed = isfixedLoc;
											}
											setBalData(prevBalData => ([
												...prevBalData.map((token, i) => {
													if (i === pos) {
														return ({
															...token, collection: {
																...token.collection,
																is: "yes",
																ports: portsData
															}
														})
													}
													return token;
												})
											]))
											newC = addCollectionDataForCoin(newC, portsData);
										} else {
											setBalData(prevBalData => ([
												...prevBalData.map((token, i) => {
													if (i === pos) {
														return ({
															...token, collection: {
																...token.collection,
																is: "no"
															}
														})
													}
													return token;
												})
											]))	
										}
									}

									setBalData(prevBalData => ([
										...prevBalData.map((token, i) => {
											if (i === pos) {
												return ({
													...token, coins: [...token.coins, newC]
												})
											}
											return token;
										})
									]))	
								}
							} else {
								if (coins.response.length === 0) {
									handleNodeResponseIssue("coins", "blank array");
								} else {
									handleNodeResponseIssue("coins", "no response");
									newcoinMutex.current.release();
								}
							}
						})
					}
					setNewcoinControl(prevNewcoinControl => ({
						...prevNewcoinControl,
						currentMessage: prevNewcoinControl.currentMessage + 1,
						stage: prevNewcoinControl.stage + 1
					}));
					setNewcoinIsNewToken(0);
					break;
				case 2:
				default:
					newcoinMutex.current.release();
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newcoinControl.stage]);

	// Handle an unexpected response from the node, or no response.  As of November 2024 the latter is happening about one in seven or so times.  This is either an error in MDS or in this app.  Once resolved, this part of the routine should become superfluous, as should all the code around pausing and much of the NEWCOIN part.
	const handleNodeResponseIssue = (commandUsed, issue) => {
		setNewcoinControl(prevNewcoinControl => ({ // We may have jumped out of the update routine at stage zero, and stage zero is what kicks this off in future, so we need to set it to something other than zero.
			...prevNewcoinControl,
			stage: -1
		}));
		switch (issue) {
			case "blank array":
				if (pause !== block + 1) { // To avoid multiple firings.
					addToLog("MDS error when getting " + commandUsed + ".  Will pause until next block, then peform a general balance update instead.");
					setPause(block + 1);
				}
				break;
			case "no response":
				addToLog("MDS " + commandUsed + " command failed.");
				setFlashMessage("Communication with node failed.  Please check your node is running.");  // Left in, in case there could be some other cause, but it seems redundant, as the app will not launch if MDS is not connected to the node.
				break;
			case "main fail":
				addToLog("MDS " + commandUsed + " command failed at the core routine.  This is a major issue and is irretrievable.");
				setFlashMessage("SERIOUS ERROR.  Communication with node failed in the heart of the app.  Please close the app, check your node is running, and try again.");
				break;
			default:
				addToLog("Undefined MDS issue.");
				setFlashMessage("Potential SERIOUS ERROR in communication with your node.  Please close the app, check your node is running, and try again.");
				break;
		}
	}

	// Actions to take on pausing, which is caused by an MDS error on balance or coins command
	useEffect(() => {
		if (pause > block) {
			setNewcoinIsNewToken(0);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
}, [pause]);

	// To update the balances (confirmed, unconfirmed, sendable) for a token.
	// balResItem: An item from an MDS balance.response.
	const updateBalance = (tokenid, balResItem, pos) => {
		let newBal = getNewBal(tokenid, balResItem);
		// Update balances.
		if (tokenid === "0x00") {
			setMinimaData(prevMinimaData => ({
				...prevMinimaData,
				balance: {
					...prevMinimaData.balance,
					confirmed: newBal.confirmed,
					unconfirmed: newBal.unconfirmed,
					holding: newBal.holding,
					sendable: newBal.sendable
				}
			}));
		} else {
			setBalData(prevBalData => ([
				...prevBalData.map((token, i) => {
					if (i === pos) {
						return ({
							...token, balance: {
								...token.balance,
								confirmed: newBal.confirmed,
								unconfirmed: newBal.unconfirmed,
								holding: newBal.holding,
								sendable: newBal.sendable
							}
						})
					}
					return token;
				})
			]))
		}
		if (newBal.unconfirmed !== 0) {
			let newUnconfirmed = {
				block: block + confirmationDelay,
				tokenid: tokenid
			}
			setUnconfirmedTokens(prevUnconfirmedTokens => ([
				...prevUnconfirmedTokens, newUnconfirmed]
			))
		}
	}

	// Receives a balance.response, converts that to floats in a new json object, and returns that.
	const getNewBal = (tokenid, balResItem) => {
		// Programming note: We have to workaround some of the balResItem children not existing in some cases.
		let newBal = {
			confirmed: 0,
			unconfirmed: 0,
			holding: 0,
			sendable: 0
		}

		if (balResItem !== undefined && balResItem !== null && balResItem !== []) { // Programming note: If there is no coin, balance.response will be a blank array.
			if (balResItem.hasOwnProperty("confirmed")) {
				newBal.confirmed = getNoToStore(tokenid, balResItem.confirmed)
			}
			if (balResItem.hasOwnProperty("unconfirmed")) {
				newBal.unconfirmed = getNoToStore(tokenid, balResItem.unconfirmed)
			}
			if (balResItem.hasOwnProperty("sendable")) {
				newBal.sendable = getNoToStore(tokenid, balResItem.sendable)
			}
			newBal.holding = newBal.confirmed + newBal.unconfirmed;
		}
		return newBal;	
	}

	// Goes with getNewBal function.
	const getNoToStore = (t, a) => {
		if (t === "0x00") { // Exact response for 0x00, as that is needed to calculate burn accurately.
			return Number(a);
		} else {
			return Number(Math.floor(parseFloat(a)));
		}
	}

	// To make deep copies of selected data, for future reference.
	const getSelectedData = () => {
		let sTT = JSON.parse(JSON.stringify(balData[selected.token].specs.tokenid));
		let sCC = "";
		if (selected.coin !== null && selected.coin !== "") { // === 0 let through, as a valid position.
			sCC = JSON.parse(JSON.stringify(balData[selected.token].coins[selected.coin].coinid));
		}
		let sDSTT = null;
		if (splitterData.selectedTokenPos) { // If not null.
			sDSTT = JSON.parse(JSON.stringify(balData[splitterData.selectedTokenPos].specs.tokenid));
		}
		return {
			selectedTokenTokenid: sTT,
			selectedCoinCoinid: sCC,
			splitterDataSelectedTokenTokenid: sDSTT
		}
	}

	// To restore selected token and coin after changing balData.
	const restoreSelectedData = (selectedData, nextBalData) => { // Programming note: nextBalData passed in in case balData (in state) has not been updated in time.
		let newTokenPos = nextBalData.findIndex(token => token.specs.tokenid === selectedData.selectedTokenTokenid);
		
		let newCoinPos;
		if (selectedData.selectedCoinCoinid === "") {
			newCoinPos = "";
		} else {
			newCoinPos = nextBalData[newTokenPos].coins.findIndex(coin => coin.coinid === selectedData.selectedCoinCoinid);
		}
		setSelected(prevSelected => ({
			...prevSelected,
			token: newTokenPos,
			coin: newCoinPos,
		}));
		
		let newSplitterPos;
		if (selectedData.splitterDataSelectedTokenTokenid === null) {
			newSplitterPos = null;
		} else {
			newSplitterPos = nextBalData.findIndex(token => token.specs.tokenid === selectedData.splitterDataSelectedTokenTokenid);
		}
		setSplitterData(prevSplitterData => ({
			...prevSplitterData,
			selectedTokenPos: newSplitterPos
		}));
	}

	// To check whether unconfirmed coins have become confirmed, if there are any.
	useEffect(() => {
		if (pause === block) {
			getBalance();
		} else {
			if (pause === block - 1) { // We previously paused NEWCOIN triggers, which can now be caught up and restarted.
				newcoinMutex.current.release();
			}
			if (unconfirmedTokens.length > 0) {
				if (unconfirmedTokens[0].block <= block) {
					let newUnconfirmedTokens = unconfirmedTokens;
					window.MDS.cmd("balance", function (balance) {
						if (balance.response && balance.response.length !== 0) {
							while(newUnconfirmedTokens[0].block <= block) {
								let posBD = 0;
								if (newUnconfirmedTokens[0].tokenid !== "0x00") {
									posBD = balData.findIndex(token => token.specs.tokenid === newUnconfirmedTokens[0].tokenid);
								}
								if (posBD !== -1) {
									let posBR = 0;
									posBR = balance.response.findIndex(token => token.tokenid === newUnconfirmedTokens[0].tokenid);
									if (posBR !== -1) {
										updateBalance(newUnconfirmedTokens[0].tokenid, balance.response[posBR], posBD);
									}
								}
								let noToRemove = 1; // Check for duplicates in unconfirmedTokens.
								for (let i = 1; i <newUnconfirmedTokens.length; i++) {
									if (unconfirmedTokens[i].tokenid === unconfirmedTokens[0].tokenid && unconfirmedTokens[i].block === unconfirmedTokens[0].block) {
										noToRemove++
									}
								}
								for (let l = 0; l < noToRemove; l++) {
									newUnconfirmedTokens.shift();
								}
								if (newUnconfirmedTokens.length === 0) {
									break;
								}
							}
							setUnconfirmedTokens(newUnconfirmedTokens);
						} else {
							if (balance.response.length === 0) {
								handleNodeResponseIssue("balance", "blank array");
							} else {
								handleNodeResponseIssue("balance", "no response");
							}
						}
					})
				}
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [block]);

	
	// To add the coin data relating to the collection, e.g. serialno.
	const addCollectionDataForCoin = (coin, ports) => {
		coin.serialno = "";
		if (ports.serialno !== "") {
			let sLoc = coin.state.findIndex(state => state.port === ports.serialno);
			if (sLoc !== -1) { // If there is a serialno, add it.
				if (coin.state[sLoc].data) {
					coin.serialno = coin.state[sLoc].data;
				}
			}
		}
		if (ports.isfixed !== "") {
			let iLoc = coin.state.findIndex(state => state.port === ports.isfixed);
			if (iLoc !== -1) {
				if (coin.state[iLoc].data) {
					coin.isfixed = coin.state[iLoc].data;
				}
			}
		}
		
		let artimageSuccess = false;
		if (ports.url) {
			let uLoc = coin.state.findIndex(state => state.port === ports.url);
			if (uLoc !== -1) { // If there is a url, add that, otherwise generate a filler image.
				if (coin.state[uLoc].data) {
					coin.url = coin.state[uLoc].data;
					if (coin.url.slice(1, 9) === "artimage") {
						coin.url = coin.url.slice(10, -11).replace(GetRE, GetReplacement);
						artimageSuccess = true;
					}
				}
			}
		}
		if (artimageSuccess === false) {
			coin.url = "Not artimage";
			coin.filler = GenerateSVG(coin.coinid);
		}

		return coin;
	}

	// To form a token with the data in the right format for our balData array.
	const formToken = (item, receivedPos) => {
		let container = {balance: {}, specs: {}, coins: {coinid: ""}, collection: {}};
		
		// Add details of data which may have changed for any given token
		container.balance = getNewBal(item.tokenid, item);
		
		if (container.balance.unconfirmed !== 0) {
			let newUnconfirmed = {
				block: block + confirmationDelay,
				tokenid: item.tokenid
			}
			// setUnconfirmedTokens(prevUnconfirmedTokens => ({
			// 	...prevUnconfirmedTokens,
			// 	newUnconfirmed
			// }));
			setUnconfirmedTokens(prevUnconfirmedTokens => ([
				...prevUnconfirmedTokens, newUnconfirmed]
			))
		}
		
		container.receivedPosition = receivedPos;
		container.specs.tokenid = item.tokenid;
		container.specs.name = item.token.name.replace(GetRE, GetReplacement);
		if (item.token.name.length > 32) {
			container.specs.shortname = item.token.name.replace(GetRE, GetReplacement).slice(0, 32) + "..."
		} else {
			container.specs.shortname = item.token.name.replace(GetRE, GetReplacement)
		}
		if (item.token.description) { container.specs.description = item.token.description.replace(GetRE, GetReplacement); }
		if (item.token.ticker) { container.specs.ticker = item.token.ticker.replace(GetRE, GetReplacement); }
		container.specs.total = Math.floor(parseFloat(item.total));
		if (item.token.signtoken) { container.specs.signtoken = item.token.signtoken.replace(GetRE, GetReplacement); }
		if (item.token.webvalidate) { container.specs.webvalidate = item.token.webvalidate.replace(GetRE, GetReplacement); }
		container.specs.url = "Not artimage";
		if (item.token.url && item.token.url.slice(1, 9) === "artimage") {
			container.specs.url = item.token.url.slice(10, -11).replace(GetRE, GetReplacement);
		} else {
			container.specs.filler = GenerateSVG(item.tokenid); // Wallet's syntax would be e.g. "https://robohash.org/" + tokenid + ".png".
		}
		container.collection = { ports: {} };
		container.collection.is = "";
		container.coins = [];
						
		return container;
	}


	// To form a coin with the data in the right format for our balData array.
	const formCoin = (coinid, amount, tokenamount, scale, address, miniaddress, state) => {
		let coin = {
			coinid: "",
			state:
				[
					{
						port: "",
						type: "",
						data: ""
					}
				]
		};
		coin.coinid = coinid;
		coin.amount = amount;
		coin.tokenAmount = tokenamount; // Not the Minima amount used, but the tokenamount.
		coin.address = address;
		coin.miniaddress = miniaddress;
		if (state.length > 0) {
			coin.state = state; // state, copied wholesale
		}
		return coin;
	}

	const updateFlashMessage = (newMessage) => {
		setFlashMessage(newMessage);
	}

	// To change the order of tokens
	const changeTokenOrder = (order) => {
		let selectedData = getSelectedData();
		var transArray = [...balData];
		if (order === "alphanumeric") {
			transArray.sort((a, b) => a.specs.name.localeCompare(b.specs.name));
		} else {
			transArray.sort((a, b) => a.receivedPosition - b.receivedPosition);
		}
		setBalData(transArray);
		restoreSelectedData(selectedData, transArray);
	}

	// To add something to the log, and remove it later
	const addToLog = (str) => {
		console.log("MinimaCentral log: " + str);
		setAppLog((prevAppLog) => [
			...prevAppLog,
			str
		]);
		setCurrentLog((prevCurrentLog) => [str, ...prevCurrentLog]);
		let timeout = setTimeout(() => {
			setCurrentLog(prevCurrentLog => prevCurrentLog.slice(0, -1)) // Programming note: 0, -1 removes the last element from the array.
		}, currentLogMemory);
		timeoutsRef.current.push(timeout);
	}


	return (
    <div className = "App">
		<nav>
			<div className = "nav-left">
				<button
					className = "nav-item"
					type = "button"
					onClick = {() => handleNavClick("viewer")}
				>
					<img
						src = {viewerIcon}
						alt = "Viewer"
					/>
				</button>
				<button
					className = "nav-item"
					type = "button"
					onClick = {() => handleNavClick("creator")}
				>
					<img
						src = {creatorIcon}
						alt = "Creator"
					/>
				</button>
				<button
					className = "nav-item"
					type = "button"
					onClick = {() => handleNavClick("splitter")}
				>
					<img
						src = {splitterIcon}
						alt = "Splitter"
					/>
				</button>
				<button
					className = "nav-item"
					type = "button"
					onClick = {() => handleNavClick("info")}
				>
					<img
						src = {infoIcon}
						alt = "Info"
					/>
				</button>
				<button
					className = "nav-item"
					type = "button"
					onClick = {() => handleNavClick("log")}
				>
					<img
						src = {logIcon}
						alt = "Log"
					/>
				</button>
			</div>
			<div className = "nav-right">
				<button
					className = "nav-item"
					type = "button"
					onClick = {() => showTitleBar()}
				>
					<img
						src = {mcLogo}
						alt = "Exit"
					/>
				</button>
			</div>
		</nav>

		{navConfirmationMessage && <div className = "flash-message" style={{top: "20%"}}>
			{navConfirmationMessage}
			<button
				type = "button"
				onClick = {() => handleNavConfirmation(true)}
				>OK
			</button>
			<button
				type = "button"
				onClick = {() => handleNavConfirmation(false)}
				>Go back
			</button>
		</div>}

		<div className = "outer-container">
			{page === "viewer" && <Viewer minimaData = {minimaData} balData = {balData} defaultSelected = {defaultSelected} selected = {selected} setSelected = {setSelected} changeTokenOrder = {changeTokenOrder} flashMessage = {flashMessage} updateFlashMessage = {updateFlashMessage} addToLog = {addToLog} userAddress = {userAddress}/>}
			{page === "creator" && <Creator minimaData = {minimaData} newToken = {newToken} setNewToken = {setNewToken} ports = {ports} setPorts = {setPorts} flashMessage = {flashMessage} updateFlashMessage = {updateFlashMessage}/>}
			{page === "splitter" && <Splitter minimaData = {minimaData} balData = {balData} originalSplitterData = {originalSplitterData} splitterData = {splitterData} setSplitterData = {setSplitterData} splitterPorts = {splitterPorts} setSplitterPorts = {setSplitterPorts} flashMessage = {flashMessage} updateFlashMessage = {updateFlashMessage} addToLog = {addToLog} block = {block}/>}
			{page === "info" && <Info />}
			{page === "log" && <Log appLog = {appLog}/>}
			<br />
			{currentLog.length > 0 && <div className = "log">
				<ul>
					{currentLog.map((item, index) => (
						<li key = {index}>
							{item}
						</li>
					))}
				</ul>
			</div>}
		</div>
	</div>
	);
}

export default App;
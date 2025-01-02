import React from "react";
import { useEffect } from "react";
import { useState } from "react";

import sanitizeHtml from "sanitize-html"; // Reference: https://www.npmjs.com/package/sanitize-html
import Resizer from "react-image-file-resizer";// Reference: https://www.npmjs.com/package/react-image-file-resizer

import Ports from "./Ports.jsx";


function Creator ({minimaData, newToken, setNewToken, ports, setPorts, flashMessage, updateFlashMessage}) {
	// const textPattern = "^(?!.*(%0D|%0A))[^'\"\\\\]+"; // Bans ', ", \ and two types of newline. \ should also pick up \n and \r, as it is part of each.

	const [formDisabled, setFormDisabled] = useState(false);
	
	const [tokenControls, setTokenControls] = useState(1); // FINALISATION Put to 0 (focus is on simplicity) or 1 (focus is on Collections).
	// eslint-disable-next-line
	{/* Controls:
		0: Normal
		1: Full
	*/}
	const [imageControls, setImageControls] = useState(0);
	// eslint-disable-next-line
	{/* Controls:
		0: Standard
		1: Advanced preferencing
		2: Image specialist
		3: Unlocked
	*/}
	const [scriptCheckNeeded, setScriptCheckNeeded] = useState(true); // Whether a check of the script is needed, due to potentially not matching ports.

	const [unlocked, setUnlocked] = useState(false); // Whether the app is unlocked, giving the user superpowers.
	const [standardImagePreferencing, setStandardImagePreferencing] = useState(true); // Whether the user has left (or selected) preferences as the standard ones.

	const [imageUpdatesPending, setImageUpdatesPending] = useState(false); // Whether something has changed which would enable an update to the image.
	const [mintInstruction, setMintInstruction] = useState(""); // The tokencreate instruction which will be sent to the node via MDS.
	const [abbreviatedMintInstruction, setAbbreviatedMintInstruction] = useState(""); // A shorter but unusable version of mintInstruction, which takes up less space on screen.
	const [confirmationMessage, setConfirmationMessage] = useState(""); // For the user to confirm something.
	
	const testMode = false; // Whether in test mode

	useEffect(() => { // To keep minimaColored up to date
		var mC = 1e-44 * newToken.amount.is;
		if (newToken.decimals.is !== "0") {
			mC *= newToken.decimals.is;
		}
		setNewToken(prevNewToken => ({ ...prevNewToken, minimaColored: mC }));
		// eslint-disable-next-line
	}, [newToken.amount.is, newToken.decimals.is]);


	function handleImageInputChange(e) { // After new image uploaded.
		const file = e.target.files[0];
		const maxFileSize = 100 * 1024 * 1024; // Max size 100MB
		if (file.size > maxFileSize) {
			updateFlashMessage("Your file is too big.  Please choose a smaller file.");
		} else {
			const sorc = sanitizeHtml(URL.createObjectURL(file));
			setNewToken(prevNewToken => ({ ...prevNewToken, src: { ...prevNewToken.src, is: sorc } }));
			setNewToken(prevNewToken => ({ ...prevNewToken, imageFile: { ...prevNewToken.imageFile, is: file } }));
		}
	};

	useEffect(() => { // Cleanup following handleImageInputChange() to avoid memory leak
		return () => {
		  if (newToken.imageFile.is) {
			URL.revokeObjectURL(newToken.imageFile.is);
		  }
		};
	  }, [newToken.imageFile.is]);


	const handleUpdateImage = () => {
		if (imageControls === 1) {
			guidedUpdateImage();
		} else {
			updateImage();
		}
	}

	useEffect(() => { // After new image upload handled.
		setPermittedMaxSize();
		// eslint-disable-next-line
	}, [newToken.imageFile.is]);

	useEffect(() => { // After new image upload handled.
		updateImage();
		// eslint-disable-next-line
	}, [newToken.b64Size.max]);

	const setPermittedMaxSize = () => {
		if (newToken.imageFile.is instanceof File) {
			const resizeImage = () => {
				try {
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					var img = new Image();
					img.onload = function() {
						var width = img.width;
						var height = img.height;					
						if (width > newToken.preferredDimensions.standard || height > newToken.preferredDimensions.standard) {
							if (width > height) {
								let ratio = newToken.preferredDimensions.standard / width;
								width = newToken.preferredDimensions.standard;
								height *= ratio;
							} else {
								let ratio = newToken.preferredDimensions.standard / height;
								height = newToken.preferredDimensions.standard;
								width *= ratio;
							}
						}
						canvas.width = width;
						canvas.height = height;
						ctx.drawImage(img, 0, 0, width, height);
						const uri = canvas.toDataURL("image/jpeg", newToken.preferredQuality.standard / 100);
						const newValue = Number(uri.split(",")[1].length);
						setNewToken(prevNewToken => ({ ...prevNewToken, b64Size: { ...prevNewToken.b64Size, max: newValue } }));
						canvas.remove();
					}
					img.src = URL.createObjectURL(newToken.imageFile.is);
				} catch (err) {
					handleError(err);
				}
			}		
			resizeImage();
		}
	}

	const updateImage = () => { // Default update method.  Follow's Wallet's methodology.
		if (newToken.imageFile.is instanceof File) {
			const resizeImage = () => {
				try {
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					var img = new Image();
					img.onload = function() {
						var width = img.width;
						var height = img.height;					
							if (width > newToken.preferredDimensions.is || height > newToken.preferredDimensions.is) {
							if (width > height) {
								let ratio = newToken.preferredDimensions.is / width;
					
								width = newToken.preferredDimensions.is;
								height *= ratio;
							} else {
								let ratio = newToken.preferredDimensions.is / height;
					
								height = newToken.preferredDimensions.is;
								width *= ratio;
							}
						}
						canvas.width = width;
						canvas.height = height;
						ctx.drawImage(img, 0, 0, width, height);
						const uri = canvas.toDataURL("image/jpeg", newToken.preferredQuality.is / 100);
						setNewToken(prevNewToken => ({ ...prevNewToken, b64Size: { ...prevNewToken.b64Size, is: Number(uri.split(",")[1].length) } }));
						setNewToken(prevNewToken => ({ ...prevNewToken, base64Encoding: { ...prevNewToken.base64Encoding, is: uri.split(",")[1] } }));
						setNewToken(prevNewToken => ({ ...prevNewToken, dimensions: { ...prevNewToken.dimensions, is: newToken.preferredDimensions.is} }));
						setNewToken(prevNewToken => ({ ...prevNewToken, quality: { ...prevNewToken.quality, is: newToken.preferredQuality.is }  }));
						setImageUpdatesPending(false);
						canvas.remove();
					}
					img.src = URL.createObjectURL(newToken.imageFile.is);
				} catch (err) {
					handleError(err);
				}
			}		
			resizeImage();
		}
	}

	const updateImageFR = () => { // Updates using react-image-file-resizer.
		if (newToken.imageFile.is instanceof File) {
			const resizeImage = () => {
				try {
					Resizer.imageFileResizer(
						newToken.imageFile.is, // file, Is the file of the image which will resized.
						newToken.preferredDimensions.is, // maxWidth, Is the maxWidth of the resized new image.
						newToken.preferredDimensions.is, // maxHeight, Is the maxHeight of the resized new image.
						"JPEG", // compressFormat, Is the compressFormat of the resized new image.
						newToken.preferredQuality.is, // quality, Is the quality of the resized new image.  0-100.
						0, // rotation, Is the degree of clockwise rotation to apply to uploaded image.
						(uri) => { // responseUriFunc, Is the callBack function of the resized new image URI.
							setNewToken(prevNewToken => ({ ...prevNewToken, b64Size: { ...prevNewToken.b64Size, is: Number(uri.split(",")[1].length) } }));
							setNewToken(prevNewToken => ({ ...prevNewToken, base64Encoding: { ...prevNewToken.base64Encoding, is: uri.split(",")[1] } }));
							setNewToken(prevNewToken => ({ ...prevNewToken, dimensions: { ...prevNewToken.dimensions, is: newToken.preferredDimensions.is} }));
							setNewToken(prevNewToken => ({ ...prevNewToken, quality: { ...prevNewToken.quality, is: newToken.preferredQuality.is }  }));
						},
						"base64", // outputType, Is the output type of the resized new image.
						16, // minWidth, Is the minWidth of the resized new image.
						16 // minHeight Is the minHeight of the resized new image.
					);
					setImageUpdatesPending(false);
				} catch (err) {
					handleError(err);
				}
			}		
			resizeImage();
		}
	}

const guidedUpdateImage = () => { // Updates image to get the best it can, using expressed preference for image size or quality.
		if (newToken.imageFile.is instanceof File) { // On Creator startup this will be false, due to object being empty (which is hard to test).
			var quality = newToken.preferredQuality.is;
			var size;
			var maxWidth = newToken.preferredDimensions.is;
			var maxHeight = newToken.preferredDimensions.is;
			var maxB64Size = newToken.b64Size.max;
			const firstQualityThreshold = 40;
			const secondQualityThreshold = 20;
			const firstQualityStep = 5;
			const secondQualityStep = 5;
			const thirdQualityStep = 2;
			const firstSizeThreshold = 64;
			const secondSizeThreshold = 32;
			const firstSizeStep = 8; // Power of two-ish
			const secondSizeStep = 2;
			var pass = 0;
			const resizeImage = () => {
				if (pass === 0) { // Based on testing, hard to get an image above this dimension below the size limit.
					maxHeight = 256;
					maxWidth = 256;
				} else if (pass === 1) {
					if (newToken.preferredOutcome.is !== "size") { // Based on testing, getting down to 128 makes a big difference.
						maxHeight = 128;
						maxWidth = 128;
					} else {
						quality -= firstQualityStep;
					}
				} else if (pass > 1) {
					if (newToken.preferredOutcome.is === "size") {
						if (quality > firstQualityThreshold) {
							quality -= firstQualityStep;
						} else if (quality > secondQualityThreshold) {
							quality -= secondQualityStep;
						} else if (maxHeight > firstSizeThreshold) {
							maxHeight -= firstSizeStep;
							maxWidth -= firstSizeStep;
						} else {
							maxHeight -= secondSizeStep;
							maxWidth -= secondSizeStep;
						}
					} else { // i.e. quality is preferredOutcome
						if (maxHeight > firstSizeThreshold) {
							maxHeight = firstSizeThreshold;
							maxWidth = firstSizeThreshold;
						} else if (maxHeight > secondSizeThreshold) {
							maxHeight -= secondSizeStep;
							maxWidth -= secondSizeStep;
						} else if (quality > firstQualityThreshold) {
							quality -= firstQualityStep;
						} else if (quality > secondQualityThreshold) {
							quality -= secondQualityStep;
						} else {
							quality -= thirdQualityStep;
						}
					}
				}
				try {
					Resizer.imageFileResizer(
						newToken.imageFile.is,
						maxWidth,
						maxHeight,
						"JPEG",
						quality,
						0,
						(uri) => {
							size = uri.split(",")[1].length;
							if (size > maxB64Size) {
								pass++;
								resizeImage();
							} else {
								setNewToken(prevNewToken => ({ ...prevNewToken, b64Size: { ...prevNewToken.b64Size, is: Number(size) } }));
								setNewToken(prevNewToken => ({ ...prevNewToken, dimensions: { ...prevNewToken.dimensions, is: maxHeight } }));
								setNewToken(prevNewToken => ({ ...prevNewToken, quality: { ...prevNewToken.quality, is: quality }  }));
								setNewToken(prevNewToken => ({ ...prevNewToken, base64Encoding: { ...prevNewToken.base64Encoding, is: uri.split(",")[1] } }));
							}
						},
						"base64",
						16,
						16
					);
					setImageUpdatesPending(false);
				} catch (err) {
					handleError(err);
				}
			}		
			resizeImage();
		}
	}

	useEffect(() => { // After base64 encoding created.
		if (newToken.src.is !== null) {
			const textBeforeImage = "<artimage>";
			const textAfterImage = "</artimage>";
			var urlWording = textBeforeImage
			urlWording += newToken.base64Encoding.is;
			urlWording += textAfterImage;
			setNewToken(prevNewToken => ({ ...prevNewToken, url: { ...prevNewToken.url, is: urlWording } }));
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newToken.base64Encoding]);

	const handleTokenControlsChange = (e) => {
		setTokenControls(parseInt(e.target.value));
	};

	const handleImageControlsChange = (e) => {
		const intValue = parseInt(e.target.value);
		if (intValue === 0 || (imageControls > 1 && intValue === 1)) {
			resetImageToStandard();
		}
		setImageControls(intValue);
	};

	const removeImage = () => { // Removes everything categorised as specificImageRelated, i.e. leaving the user's preferences about images.
		const transObj = {...newToken};
		for (let key in transObj) {
			if (transObj[key]?.specificImageRelated === true) {
				transObj[key].is = transObj[key].original;
			}
		}
		setNewToken(transObj);
	}

	const resetImageToStandard = () => { // Resets image and related settings back to standard.
		setNewToken(prevNewToken => ({ ...prevNewToken, preferredPOT: { ...prevNewToken.preferredPOT, is: newToken.preferredPOT.standard } }));
		setNewToken(prevNewToken => ({ ...prevNewToken, preferredDimensions: { ...prevNewToken.preferredDimensions, is: newToken.preferredDimensions.standard } }));
		setNewToken(prevNewToken => ({ ...prevNewToken, preferredQuality: { ...prevNewToken.preferredQuality, is: newToken.preferredQuality.standard } }));
		updateImage();
		setStandardImagePreferencing(true);
	}

	// Programming note: the min and max values in the input tag are not fully effective, as described at https://stackoverflow.com/questions/32936352/html-number-input-min-and-max-not-working-properly, so needs doing "manually" here.
	const handleInputChange = (e) => {
		switch (e.target.name) {
			case "name":
				if (e.target.value.length > newToken.name.maxLength) {
					updateFlashMessage (prevFlashMessage => "Please shorten the name of your token to not more than " + newToken.name.maxLength + " characters.");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				break;
			case "description":
				if (e.target.value === newToken.description.konami) {
					updateFlashMessage (prevFlashMessage => "UNLOCK TRIGGERED.  Some restrictions greatly loosened.  PLEASE TAKE CARE as if you create tokens with images too large it will cause problems for both you and others, e.g. inability to consolidate coins, or even send them.  To return to normal, safe operations, please restart the dapp.");
					setNewToken(prevNewToken => ({ ...prevNewToken, description: { ...prevNewToken.description, is: "" } }));
					unlock();
				} else {
					if (e.target.value.length > newToken.description.maxLength) {
						updateFlashMessage (prevFlashMessage => "Please shorten the description of your token to not more than " + newToken.description.maxLength + " characters.");
					}
					setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				}
				break
			case "ticker":
				if (e.target.value.length > newToken.ticker.maxLength) {
					updateFlashMessage (prevFlashMessage => "Please shorten the ticker to not more than " + newToken.ticker.maxLength + " characters.");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				break;	
			case "decimals":
				if (e.target.value < newToken.decimals.min || e.target.value > newToken.decimals.max) {
					updateFlashMessage (prevFlashMessage => "Please set the number of decimal places to between " + newToken.decimals.min + " and " + newToken.decimals.max + ".");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: parseInt(e.target.value) } }));
				break;
			case "amount":
				if (e.target.value < newToken.amount.min || e.target.value > newToken.amount.max) {
					updateFlashMessage (prevFlashMessage => "Please set the amount to between " + newToken.amount.min + " and " + newToken.amount.max + ".");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: parseInt(e.target.value) } }));
				break;
			case "burn":
				if (e.target.value > newToken.burn.max) {
					updateFlashMessage (prevFlashMessage => "This app will not allow you to burn so much Minima.  Please reduce that number to not more than " + newToken.burn.max + ".  Very possibly you don't need to burn any at all.");
				} else if (e.target.value < newToken.burn.min) {
					updateFlashMessage (prevFlashMessage => "Please increase the amount of Minima burnt to not less than " + newToken.burn.min + ".");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: parseFloat(e.target.value) } }));break;
			case "signtoken":
				if (e.target.value.length > newToken.signtoken.maxLength) {
					updateFlashMessage (prevFlashMessage => "Please reduce the length of signtoken to not more than " + newToken.signtoken.maxLength + " characters.");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				break;
			case "webvalidate":
				if (e.target.value.length > newToken.webvalidate.maxLength) {
					updateFlashMessage (prevFlashMessage => "Please reduce the length of webvalidate to not more than " + newToken.webvalidate.maxLength + " characters.");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				break;
			case "script":
				if (e.target.value.length > newToken.script.maxLength) {
					updateFlashMessage (prevFlashMessage => "Please reduce the length of your script to not more than " + newToken.script.maxLength + " characters.");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				setScriptCheckNeeded(true);
				break;
			case "state":
				if (e.target.value.length > newToken.state.maxLength) {
					updateFlashMessage (prevFlashMessage => "Please reduce the length of your state to not more than " + newToken.state.maxLength + " characters.");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				break;
			case "portListingPorts":
				if (e.target.value < newToken.portListingPorts.min || e.target.value > newToken.portListingPorts.max) {
					updateFlashMessage (prevFlashMessage => "Please set the port to between " + newToken.portListingPorts.min + " and " + newToken.portListingPorts.max + ".");
				}
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: parseInt(e.target.value) } }));
				setScriptCheckNeeded(true);
				break;
			case "preferredOutcome":
				if (newToken.preferredOutcome.is === "size") {
					setNewToken(prevNewToken => ({ ...prevNewToken, preferredOutcome: { ...prevNewToken.preferredOutcome, is: "quality" } }));
				} else {
					setNewToken(prevNewToken => ({ ...prevNewToken, preferredOutcome: { ...prevNewToken.preferredOutcome, is: "size" } }));
				}
			// eslint-disable-next-line	
			case "preferredMaxB64Size":
			case "preferredDimensions":
			case "preferredQuality":
				setImageUpdatesPending(true);
				setStandardImagePreferencing(false);
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				break;
			default:
				setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
				break;
		}
	};

	const unlock = () => {
		setUnlocked(true);
		setNewToken(prevNewToken => ({ ...prevNewToken, preferredDimensions: { ...prevNewToken.preferredDimensions, max: 1024 } }));
		setNewToken(prevNewToken => ({ ...prevNewToken, script: { ...prevNewToken.script, maxLength: 64000 } }));
	}

	const handleQualitySliderChange = (e) => {
		setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
	};

	const handlePOTChange  = (e) => {
		if (e.target.value === "true") {
			setNewToken(prevNewToken => ({ ...prevNewToken, preferredPOT: { ...prevNewToken.preferredPOT, is: true } }));
		} else {
			setNewToken(prevNewToken => ({ ...prevNewToken, preferredPOT: { ...prevNewToken.preferredPOT, is: false } }));
		}
		setImageUpdatesPending(true);
		setStandardImagePreferencing(false);
	}

	const handleDimensionsSliderChange = (e) => {
		if (newToken.preferredPOT.is === true) {
			setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: 2 ** e.target.value } }));
		} else {
			setNewToken(prevNewToken => ({ ...prevNewToken, [e.target.name]: { ...prevNewToken[e.target.name], is: e.target.value } }));
		}
		setImageUpdatesPending(true);
		setStandardImagePreferencing(false);
	}

	const handleIncludePortListingPortsChange = (e) => {
		setNewToken(prevNewToken => ({ ...prevNewToken, includePortListingPorts: { ...prevNewToken.includePortListingPorts, is: parseInt(e.target.value) } }));
		setScriptCheckNeeded(true);
	}

	const handleSubmit = (e) => {
		e.preventDefault();
		setFormDisabled(true);

		if (newToken.makeCollection.is === true && scriptCheckNeeded === true) { // If collection being made and script may not match ports, give user the chance to change things.
			updateFlashMessage("Your script may not match what you have put in ports.  If this is deliberate, submit again.  If not, please make changes and then submit again.  You can use the \"Replace script\" button to update the script based on your ports, but that will overwrite any changes you made to the script.");
			setScriptCheckNeeded(false);
			setFormDisabled(false);
			return;
		}

		if (newToken.includePorts === true) {
			let arePortsOkay = checkPorts();
			if (arePortsOkay !== "success") {
				setFormDisabled(false);
				return;
			}
		}

		var startingProblemsList = "Please fix the following:";
		var problemsList = startingProblemsList.slice(); // Programming note: sliced; to get a deep copy.
		
		window.MDS.cmd(
			"checkmode", function (checkmode) {
				if (checkmode.response) {
					if (checkmode.response.mode !== "READ") { // Ensure app only has read permission, so user is forced to verify command.
						problemsList += "\n- Please change this app to read mode by going back to your list of all apps, right clicking this one, and choosing \"Read mode\" instead of \"Write mode\".  It is important that you verify the output from this app.";
					}

					if (minimaData.balance.sendable < newToken.minimaColored) { // Check enough spendable Minima.
						problemsList += "\n- You do not have enough spendable Minima.";
					}
					if (!newToken.name.is) {
						problemsList += "\n- Please give your token a name.";
					} else {
						if (newToken.name.is.length > newToken.name.maxLength) {
						problemsList += "\n- Please shorten the name of your token to not more than " + newToken.name.maxLength + " characters.";
						}
					}
					if (newToken.description.is && newToken.description.is.length > newToken.description.maxLength) {
						problemsList += "\n- Please shorten the description of your token to not more than " + newToken.description.maxLength + " characters.";
					}
					if (newToken.ticker.is && newToken.ticker.is.length > newToken.ticker.maxLength) {
						problemsList += "\n- Please shorten the ticker to not more than " + newToken.ticker.maxLength + " characters.";
					}
					if (newToken.decimals.is < newToken.decimals.min || newToken.decimals.is > newToken.decimals.max) {
						problemsList += "\n- Please set the number of decimal places to between " + newToken.decimals.min + " and " + newToken.decimals.max + ".";
					}
					if (newToken.amount.is < newToken.amount.min || newToken.amount.is > newToken.amount.max) {
						problemsList += "\n- Please set the amount to between " + newToken.amount.min + " and " + newToken.amount.max + ".";
					}
					if (newToken.burn.is < newToken.burn.min) {
						problemsList += "\n- Please increase the amount of Minima burnt to not less than " + newToken.burn.min + ".";
					}
					if (newToken.burn.is > newToken.burn.max) {
						problemsList += "\n- This app will not allow you to burn so much Minima.  Please reduce that number to not more than " + newToken.burn.max + ".";
					}
					if (newToken.signtoken.is && newToken.signtoken.is.length > newToken.signtoken.maxLength) {
						problemsList += "\n- Please reduce the length of signtoken to not more than " + newToken.signtoken.maxLength + " characters.";
					}
					if (newToken.webvalidate.is && newToken.webvalidate.is.length > newToken.webvalidate.maxLength) {
						problemsList += "\n- Please reduce the length of webvalidate to not more than " + newToken.webvalidate.maxLength + " characters.";
					}
					if (newToken.script.is && newToken.script.is.length > newToken.script.maxLength) {
						problemsList += "\n- Please reduce the length of your script to not more than " + newToken.script.maxLength + " characters.";
					}
					if (newToken.state.is && newToken.state.is.length > newToken.state.maxLength) {
						problemsList += "\n- Please reduce the length of your state to not more than " + newToken.state.maxLength + " characters.";
					}
					
					if (problemsList === startingProblemsList) {
						buildTransaction();
						setConfirmationMessage("Are you sure you wish to create this token?");
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
		setConfirmationMessage("");
		if (e === true) {
			mint();
		}
		setFormDisabled(false);
	};
	
	const buildTransaction = () => {
		var mintInstr = "tokencreate amount:" + newToken.amount.is;
		mintInstr += " decimals:" + newToken.decimals.is;
		mintInstr += " burn:" + newToken.burn.is;
		if (newToken.signtoken.is) {
			mintInstr += " signtoken:" + newToken.signtoken.is;
		}
		if (newToken.webvalidate.is) {
			mintInstr += " webvalidate:" + newToken.webvalidate.is;
		}
		if (newToken.script.is) {
			mintInstr += " script:\"" + newToken.script.is + "\"";
		}
		if (ports.length !== 0) {
			let portsList = "";
			if (newToken.includePortListingPorts.is === 1) { // Then make the listing of ports to include.
				ports.forEach((item, index) => {
					portsList = portsList + item.port + ":" + item.name + ", ";
				})
				portsList = portsList.slice (0, portsList.length - 2);
			}
			let tState = "{";
			ports.forEach((item, index) => {
				tState = tState + "\"" + item.port + "\":\"";
				if (item.type === "string") {tState = tState + "["};
				tState = tState + item.data;
				if (item.type === "string") {tState = tState + "]"};
				tState = tState + "\", ";
			})
			if (portsList !== "") {
				tState = tState + "\"" + newToken.portListingPorts.is + "\":\"[{" + portsList + "}]\", ";
			}
			tState = tState.slice(0, tState.length - 2);
			tState = tState + "}";
			mintInstr += " state:\"" + tState + "\"";
		}
		mintInstr += " name:{\"name\":\"" + newToken.name.is + "\""; // "Out of order" because from here on is a child object.
		if (newToken.description.is) {
			mintInstr += ",\"description\":\"" + newToken.description.is + "\"";
		}
		if (newToken.ticker.is) {
			mintInstr += ",\"ticker\":\"" + newToken.ticker.is + "\"";
		}
		if (newToken.url.is) {
			mintInstr += ",\"url\":\"" + newToken.url.is + "\"";
		}
		mintInstr += "}";
		setMintInstruction(mintInstr);
		return mintInstr;
	}

	useEffect(() => { // Set the abbreviated mint instruction when the full instruction is changed
		var aMI = mintInstruction.replace(/<artimage>.*<\/artimage>/,"<artimage>[text here not shown]</artimage>");
		setAbbreviatedMintInstruction(aMI);
	}, [mintInstruction]);

	const mint = () => {
		window.MDS.cmd(
			mintInstruction, function (tokencreate) {}
		)
		updateFlashMessage("Now go to the Pending app and REVIEW THE TRANSACTION.")
	};

	const handleError  = (err) => {
		console.log(err);
		updateFlashMessage("Error: " + err);
	}

	const getHelpText = (param) => {
		if (newToken[param].helpText) {
			const l = newToken[param].helpText.length;
			return (
				<div className = "helpText">
					<em>{newToken[param].helpText[0]}</em>
					{newToken[param].extendedHelp === true && <em>{"\n"}{newToken[param].helpText[1]}</em>}
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
		if (newToken[param].extendedHelp === false) {
			setNewToken(prevNewToken => ({ ...prevNewToken, [param]: { ...prevNewToken[param], extendedHelp: true } }));
		} else {
			setNewToken(prevNewToken => ({ ...prevNewToken, [param]: { ...prevNewToken[param], extendedHelp: false } }));
		}
	}

	// PORTS

	const togglePorts = () => {
		if (newToken.includePorts.is === false) {
			setNewToken(prevNewToken => ({ ...prevNewToken, includePorts: { ...prevNewToken.includePorts, is: true } }));
		} else {
			setNewToken(prevNewToken => ({ ...prevNewToken, includePorts: { ...prevNewToken.includePorts, is: false } }));
			setPorts([]);
			setNewToken(prevNewToken => ({ ...prevNewToken, makeCollection: { ...prevNewToken.makeCollection, is: false } }));
		}
	}

	const addPort = () => { // To add a port.
		let portNo = 0;
		for (let i = 0; i < 256; i++) { // Find next available port number.
			if (ports.findIndex(port => port.port === i) === -1) {
				if (newToken.includePortListingPorts.is === 0) {
					portNo = i;
					break;
				} else {
					if (newToken.makeCollection.is === false || newToken.portListingPorts.is !== i) {
						portNo = i;
						break;
					}
				}
			}
		} 
	
		let newPort = {
			port: portNo,
			name: "",
			type: "",
			toBecomeFixed: "0",
			data: ""
		};
		
		setPorts(prevPorts => [
			...prevPorts, newPort
		])
	}

	const sortPorts = () => { // To sort the ports into numerical order.
		let transArray = [...ports];
		// (Enforce empty ones being put to the end).
		let sortedArray = transArray.filter(subI => subI.port !== "").sort((a, b) => a.port - b.port);
		let blanks = transArray.filter(subI => subI.port === ""); // FUTURE Is this line needed, given the filter in the line above?
		setPorts(sortedArray.concat(blanks));
	}

	const checkPorts = () => {
		// Go through all ports checking:
		// - Essential ports have been included.
		// - No duplicate port numbers, including with the port listing ports.
		// - All ports in range 0-255.
		// - All ports have numbers, names and data.
		
		var startingProblemsList = "Please fix the following:";
		var problemsList = startingProblemsList.slice(); // Programming note: sliced; to get a deep copy.

		let foundProtocol = 0;
		let foundIsfixed = 0;
		let foundSerialno = 0;
		let portsSet = new Set([]);
		ports.forEach((item, index) => {
			if (item.name === "" || item.port === "" || item.data === "") {
				problemsList += "\n- Please ensure all ports have numbers, names and data.";
			}
			if (item.port < 0 || item.port > 255) {
				problemsList += "\n- Please ensure all ports are in the range 0 to 255.";
			}
			if (item.name === "protocol") {
				foundProtocol++;
			}
			if (item.name === "isfixed") {
				foundIsfixed++;
			}
			if (item.name === "serialno") {
				foundSerialno++;
			}
			if (item.port === newToken.portListingPorts.is) {
				problemsList += "\n- Please ensure the port number of the port listing other ports does not match any other port number.";
			}
			
			portsSet.add(item.port);
		})
		if (foundProtocol !== 1) {
			problemsList += "\n- Please ensure that one, and only one, of your ports is called \"protocol\".";
		}
		if (foundIsfixed !== 1) {
			problemsList += "\n- Please ensure that one, and only one, of your ports is called \"isfixed\".";
		}
		if (foundSerialno !== 1) {
			problemsList += "\n- Please ensure that one, and only one, of your ports is called \"serialno\".";
		}
		if (portsSet.size !== ports.length) {
			problemsList += "\n- Please ensure there are no duplicate port numbers."
		}

							
		if (problemsList === startingProblemsList) {
			updateFlashMessage("All ports OK.");
			return "success";
		} else {
			updateFlashMessage(problemsList);
			return -1;
		}
	}

	// To create the token script.
	const createScript = () => {
		if (checkPorts() === "success") {
			let portForProtocol = -1;
			let portForIsfixed = -1;
			let portForSerialno = -1;
			ports.forEach((item, index) => {
				if (item.name === "protocol") {
					portForProtocol = item.port
				}
				if (item.name === "isfixed") {
					portForIsfixed = item.port
				}
				if (item.name === "serialno") {
					portForSerialno = item.port;
				}
			})
			
			// Find the range of ports to make fixed in final form.
			let individualInfoStart = portForSerialno;
			let individualInfoEnd = portForSerialno;

			ports.forEach((item, index) => {
				if (item.name !== "protocol" && item.name !== "isfixed" && item.name !== "serialno") {
					if (item.toBecomeFixed === "1") {
						if (item.port < individualInfoStart) {
							individualInfoStart = item.port;
						} else {
							if (item.port > individualInfoEnd) {
								individualInfoEnd = item.port;
							}
						}
					}
				}
			})

			// Add in the portListingPorts, if adjacent.
			if (newToken.includePortListingPorts.is === 1) {
				if (newToken.portListingPorts.is === individualInfoStart - 1) {
					individualInfoStart--;
				} else if (newToken.portListingPorts.is === individualInfoEnd + 1) {
					individualInfoEnd++;
				}
			}

			// Create the token script.
			let scr = [
				{
					line: "",
					comment: ""
				}
			];

			scr[0].line = "LET protocol = " + portForProtocol;
			scr[0].comment = "State port for the name of the standard.";
			scr.push({
				line: "LET isfixed = " + portForIsfixed,
				comment: "Whether fixed, i.e. certain state must remain the same in future."
			})
			scr.push({
				line: "LET serialno = " + portForSerialno,
				comment: "Serialno."
			})
			scr.push({
				line: "LET individualinfostart = " + individualInfoStart,
				comment: "The first port used for data which is fixed on final form."
			})
			scr.push({
				line: "LET individualinfoend = " + individualInfoEnd,
				comment: "The last port used for data which is fixed on final form."
			})
			scr.push({
				line: "IF STATE (isfixed) THEN",
				comment: "If the output state is fixed."
			})
			scr.push({
				line: "IF SAMESTATE (individualinfostart individualinfoend) AND SAMESTATE (protocol protocol) AND SAMESTATE (serialno serialno) THEN",
				comment: "Ensure no designated state is changing."
			})
			scr.push({
				line: "RETURN VERIFYOUT (@INPUT GETOUTADDR(@INPUT) 1 @TOKENID TRUE)",
				comment: "Ensure the amount is 1."
			})
			scr.push({
				line: "ENDIF",
				comment: ""
			})
			scr.push({
				line: "RETURN FALSE",
				comment: "Otherwise fail the transaction."
			})
			scr.push({
				line: "ELSE",
				comment: "If isfixed is FALSE."
			})
			scr.push({
				line: "RETURN SAMESTATE (isfixed isfixed)",
				comment: "Allows any transaction where the state is not fixed and remains not fixed, so the creator can make changes until the point of freezing.  If the state is fixed and remains fixed, this test will not apply, as the outcome of the transaction process will have already been determined earlier in the script."
			})
			scr.push({
				line: "ENDIF",
				comment: ""
			})
			setNewToken(prevNewToken => ({
				...prevNewToken,
				script: {
					...prevNewToken.script,
					explained: [
						...prevNewToken.script.explained: scr
					]
				}
			}))
			
			let scrShort = "";
			scr.forEach((item, index) => {
				scrShort = scrShort + item.line + " ";
			})
			scrShort = scrShort.slice(0, scrShort.length - 1);
			setNewToken(prevNewToken => ({
				...prevNewToken,
				script: {
					...prevNewToken.script,
					is: [scrShort]
				}
			}))
			
			setScriptCheckNeeded(false);
			return "success";
		}
	}

	const toggleMakeCollection = () => {
		if (newToken.makeCollection.is === false) {
			setNewToken(prevNewToken => ({ ...prevNewToken, makeCollection: { ...prevNewToken.makeCollection, is: true } }));
			// If default values for collections not present, add them.
			var comparisonArray = [];
			ports.map((item, index) => (
				comparisonArray.push(item.name)
			));
			if (!comparisonArray.includes("serialno")) {
				let newPortS = {
					port: 0,
					name: "serialno",
					type: "int",
					toBecomeFixed: "1",
					data: "0"
				};
				setPorts(prevPorts => [
					...prevPorts, newPortS
				])
			}
			if (!comparisonArray.includes("protocol")) {
				let newPortP = {
					port: 255,
					name: "protocol",
					type: "string",
					toBecomeFixed: "1",
					data: "{name:collections, version:1, explanation:once isfixed is set to true the token script requires transaction amount to be 1 and designated state to be repeated identically and the output index to match the input index}"
				};
				setPorts(prevPorts => [
					...prevPorts, newPortP
				])
			}
			if (!comparisonArray.includes("isfixed")) {
				let newPortI = {
					port: 254,
					name: "isfixed",
					type: "boolean",
					toBecomeFixed: "1",
					data: "FALSE"
				};
				setPorts(prevPorts => [
					...prevPorts, newPortI
				])
			}
			setNewToken(prevNewToken => ({ ...prevNewToken, includePorts: { ...prevNewToken.includePorts, is: true } }));
		} else {
			setNewToken(prevNewToken => ({ ...prevNewToken, makeCollection: { ...prevNewToken.makeCollection, is: false } }));
			if (newToken.script.is) {
				updateFlashMessage("Please check the \"Script\" box, in case that needs deleting.");
			}
		}
	}

	return (
		<>
			{flashMessage && <div className = "flash-message">
				{flashMessage}
				<button
					type = "button"
					onClick = {() => updateFlashMessage("")}
					>OK
				</button>
			</div>}

			{confirmationMessage && <div className = "flash-message">
				<p>
					Name: {newToken.name.is} <br/>
					Description: {newToken.description.is} <br/>
					Ticker: {newToken.ticker.is} <br/>
					Amount: {newToken.amount.is} <br/>
					Decimals: {newToken.decimals.is} <br/>
					Burn: {newToken.burn.is} <br/>
					{(newToken.script.is || newToken.state.is || newToken.signtoken.is || newToken.webvalidate.is) && <>
						Script: {newToken.script.is} <br/>
						State: {newToken.state.is} <br/>
						Signtoken: {newToken.signtoken.is} <br/>
						Webvalidate: {newToken.webvalidate.is} <br/>
					</>}
				</p>
				{newToken.minimaColored.is && <p>
					Minima colored: {newToken.minimaColored.is}
				</p>}
				<p>
					Mint instruction: {abbreviatedMintInstruction} &nbsp;
					{
						!window.navigator.userAgent.includes("Minima Browser") && (
							<button
								type = "button"
								onClick={() => navigator.clipboard.writeText(mintInstruction)}
								>Copy
							</button>
						)
					}
					{
						!window.navigator.userAgent.includes("Minima Browser") && (
							<>
								&nbsp;This button will copy the full command to your clipboard, in case you wish to read it in full.
							</>
						)
					}
				</p>

				{confirmationMessage}
				<button
					type = "button"
					onClick = {() => handleConfirmation(true)}
					>OK
				</button>
				<button
					type = "button"
					onClick = {() => handleConfirmation(false)}
					>Go back
				</button>
			</div>}
			
			<div>
				<section>
					<h2>Creator</h2>
					<h3>For creating a new token</h3>
				</section>
				<form onSubmit = {handleSubmit}>
					<section>
						<h2>Parameters for new token</h2>
						<div className = "panel-to-row">
							<label className = "creator-label"> {/* Token controls */}
								<select name = "tokenControls"
									value = {tokenControls}
									onChange = {handleTokenControlsChange}
									>
									<option value = "0">Normal token controls</option>
									<option value = "1">Full token controls</option>
								</select>
							</label>
						</div>
						<div className = "panel">
							<label className = "creator-label">
								{newToken.name.label} <em>(required)</em>
								<input className = "creator-input"
									name = "name"
									type = "text"
									pattern = {newToken.name.pattern}
									maxLength = {newToken.name.maxLength}
									value = {newToken.name.is}
									onChange = {handleInputChange}
									disabled = {formDisabled}
								/>
							</label>
							{getHelpText("name")}
						</div>
						<div className = "panel">
							<label className = "creator-label">
								{newToken.description.label}
								<input className = "creator-input"
									name = "description"
									type = "text"
									pattern = {newToken.description.pattern}
									maxLength = {newToken.description.maxLength}
									value = {newToken.description.is}
									onChange = {handleInputChange}
									disabled = {formDisabled}
								/>
							</label>
							{getHelpText("description")}
						</div>
						<div className = "panel">
							<label className = "creator-label">
								{newToken.ticker.label}
								<input className = "creator-input"
									name = "ticker"
									type = "text"
									pattern = {newToken.ticker.pattern}
									maxLength = {newToken.ticker.maxLength}
									value = {newToken.ticker.is}
									onChange = {handleInputChange}
									disabled = {formDisabled}
								/>
							</label>
							{getHelpText("ticker")}
						</div>
						<div className = "panel">
							{newToken.imageFile.label}
							<div className = "panel-to-row">
								<label className = "creator-label">
									<input
										name = "image"
										type = "file"
										id = "file-input"
										accept = "image/*"
										// value = {newToken.imageFile.is} removed.  Programming note: file references in inputs can only be by the user, not the app, for security reasons.  See https://stackoverflow.com/questions/60370260/how-to-fix-failed-to-set-the-value-property-on-htmlinputelement-for-react
										onChange = {handleImageInputChange}
										disabled = {formDisabled}
									/>
								</label>
								{
									newToken.url.is !== null ? <button
										className = "general-button"
										type = "button"
										onClick = {removeImage}
										>Remove
									</button> : null
								}
								{
									newToken.url.is !== null && <label className = "creator-label"> {/* Image controls */}
										<select name = "imageControls"
											onChange = {handleImageControlsChange}
											value = {imageControls}
											>
											<option value = "0">Standard image controls</option>
											<option value = "1">Advanced preferencing</option>
											<option value = "2">Image specialist</option>
											{
												unlocked && <option value = "3">Unlocked</option>
											}
										</select>
									</label>
								}
							</div>
							{getHelpText("imageFile")}
						</div>
						<div className = "panel">
							<label className = "creator-label">
								{newToken.decimals.label}
								<input className = "creator-input"
									name = "decimals"
									type = "number"
									min = {newToken.decimals.min}
									max = {newToken.decimals.max}
									value = {newToken.decimals.is}
									onChange = {handleInputChange}
									disabled = {formDisabled}
								/>
							</label>
							{getHelpText("decimals")}
						</div>
						<div className = "panel">
							<label className = "creator-label">
								{newToken.amount.label} <em>(required)</em>
								<input className = "creator-input"
									name = "amount"
									type = "number"
									min = {newToken.amount.min}
									max =  {newToken.amount.max}
									value = {newToken.amount.is}
									onChange = {handleInputChange}
									disabled = {formDisabled}
								/>
							</label>
							{getHelpText("amount")}
						</div>
						{
							tokenControls > 0 && <div className = "sub-section">
								<div className = "panel">
									<label className = "creator-label">
										{newToken.burn.label}
										<input className = "creator-input"
											name = "burn"
											type = "number"
											min = {newToken.burn.min}
											max = {newToken.burn.max}
											value = {newToken.burn.is}
											onChange = {handleInputChange}
											disabled = {formDisabled}
										/>
									</label>
									{getHelpText("burn")}
								</div>
								<div className = "panel">
									<label className = "creator-label">
										{newToken.signtoken.label}
										<input className = "creator-input"
											name = "signtoken"
											type = "text"
											pattern = {newToken.signtoken.pattern}
											maxLength = {newToken.signtoken.maxLength}
											value = {newToken.signtoken.is}
											onChange = {handleInputChange}
											disabled = {formDisabled}
										/>
									</label>
									{getHelpText("signtoken")}
								</div>
								<div className = "panel">
									<label className = "creator-label">
										{newToken.webvalidate.label}
										<input className = "creator-input"
											name = "webvalidate"
											type = "text"
											pattern = {newToken.webvalidate.pattern}
											maxLength = {newToken.webvalidate.maxLength}
											value = {newToken.webvalidate.is}
											onChange = {handleInputChange}
											disabled = {formDisabled}
										/>
									</label>
									{getHelpText("webvalidate")}
								</div>
								<div className = "panel">
									<label className = "creator-label">
										{newToken.script.label}
										<input className = "creator-input"
											name = "script"
											type = "text"
											pattern = {newToken.script.pattern}
											maxLength =  {newToken.script.maxLength}
											value = {newToken.script.is}
											onChange = {handleInputChange}
											disabled = {formDisabled}
										/>
									</label>
									{getHelpText("script")}
								</div>
								<div className = "section-to-row">
									<button
										className = "general-button"
										type = "button"
										onClick = {togglePorts}>
										{newToken.includePorts.is ? "Remove" : "Add"} state (ports)
									</button>
									<button
										className = "general-button"
										type = "button"
										onClick = {toggleMakeCollection}>
										{newToken.makeCollection.is ? "Don't create" : "Create"} Collection
									</button>
								</div>
							</div>
						}
					</section>
					{
						newToken.includePorts.is && <section>
							{
								<>
									<h2>Ports for new token state</h2>
									<div className = "section-to-row">
										<button
											className = "general-button"
											type = "button"
											onClick = {addPort}>
											Add more ports
										</button>
										<button
											className = "general-button"
											type = "button"
											onClick = {sortPorts}>
											Sort
										</button>
										{
											newToken.makeCollection.is && <div className = "section-to-row">
												<button
													className = "general-button"
													type = "button"
													onClick = {checkPorts}>
													Check values
												</button>
												<button
													className = {scriptCheckNeeded ? "warning-button" : "general-button"}
													type = "button"
													onClick = {createScript}>
													Replace script
												</button>
											</div>
										}
									</div>
									<div className = "panel">
										Enter:
										<ul>
											<li> - Port, e.g. 123</li>
											<li> - Name, e.g. serialno, animal, isLightSide</li>
											<li> - Type, e.g. int, string, boolean</li>
											{newToken.makeCollection.is && <li> - Initial value, e.g. 42, tiger, TRUE</li>}
											{!newToken.makeCollection.is && <li> - Values, e.g. 42, tiger, TRUE</li>}
											{newToken.makeCollection.is && <li> - Whether this piece of data should become immutable once the "isfixed" flag is subsequently set to true.</li>}
										</ul>
										{<Ports updateFlashMessage = {updateFlashMessage} ports = {ports} setPorts = {setPorts} makeCollection = {newToken.makeCollection.is} setScriptCheckNeeded = {setScriptCheckNeeded} requestor = "Creator"/>}
										{
											newToken.makeCollection.is && <>
												<ul>
													<li>We recommend bunching them, as follows: user-transparent information starting at port 0, firstly data which should become fixed, followed by data which should be changeable.  Then "internal" information working backwards from port 255 (the last possible).</li>
													<li>Must include protocol, isfixed and serialno, and we have suggested standard ports for these.</li>
													<li>This proof of concept makes various assumptions.  If you are doing something less usual, you can update the script manually after you click "Replace script."</li>
												</ul>
											</>
										}
									</div>
												
									{
										newToken.makeCollection.is && <div className = "panel">
											<div className = "panel-to-row">
												Use a port to list all others, for a user to read? 
												<label className = "creator-label">
													<select name = "includePortListingPorts"
														onChange = {handleIncludePortListingPortsChange}
														defaultValue = {newToken.includePortListingPorts.is}
														disabled = {formDisabled}
														>
														<option value = "0">No</option>
														<option value = "1">Yes</option>
													</select>
												</label>
											</div>
											{
												newToken.includePortListingPorts.is === 1 && <div>
													<label className = "creator-label">
														{newToken.portListingPorts.label}
														<input className = "creator-input"
															name = "portListingPorts"
															type = "number"
															min = {newToken.portListingPorts.min}
															max = {newToken.portListingPorts.max}
															value = {newToken.portListingPorts.is}
															onChange = {handleInputChange}
															disabled = {formDisabled}
														/>
													</label>
													{getHelpText("portListingPorts")}
												</div>
											}
											
										</div>
									}
								</>
							}
						</section>
					}
					{
						imageControls > 0 && <section> {/* More advanced image controls */}
							{
								imageControls === 1 && <div className = "sub-section">
									<h2>Advanced image preferencing</h2>
									<div className = "panel">
										{newToken.preferredOutcome.label}
										<label>
											<input className = "creator-input"
												name = "preferredOutcome"
												type = "radio"
												value = "quality"
												checked = {newToken.preferredOutcome.is === "quality"}
												onChange = {handleInputChange}
												disabled = {formDisabled}
											/>Quality
										</label>
										<label>
											<input className = "creator-input"
												name = "preferredOutcome"
												type = "radio"
												value = "size"
												checked = {newToken.preferredOutcome.is === "size"}
												onChange = {handleInputChange}
												disabled = {formDisabled}
											/>Size
										</label>
										{getHelpText("preferredOutcome")}
									</div>
								</div>
							}
							{
								imageControls > 1 && <div className = "sub-section">
									<h2>Image specialist image controls</h2>
									<div className = "panel">
										{newToken.preferredPOT.label}
										<label>
											<input className = "creator-input"
												name = "preferredPOT"
												type = "radio"
												value = "true"
												checked = {newToken.preferredPOT.is === true}
												onChange = {handlePOTChange}
												disabled = {formDisabled}
											/>On
										</label>
										<label>
											<input className = "creator-input"
												name = "preferredPOT"
												type = "radio"
												value = "false"
												checked = {newToken.preferredPOT.is === false}
												onChange = {handlePOTChange}
												disabled = {formDisabled}
											/>Off
										</label>
										{getHelpText("preferredPOT")}
									</div>
									{
										newToken.preferredPOT.is === false && <div className = "panel">
											{newToken.preferredDimensions.label}
											<label className = "creator-label">
												<input className = "creator-input"
													name = "preferredDimensions"
													type = "range"
													min = {newToken.preferredDimensions.min}
													max = {newToken.preferredDimensions.max}
													value = {newToken.preferredDimensions.is}
													onChange = {handleDimensionsSliderChange}
													disabled = {formDisabled}
												/>
											</label>
											{newToken.preferredDimensions.is}
											{getHelpText("preferredDimensions")}
										</div>
									}
									{
										newToken.preferredPOT.is === true && <div className = "panel">
											{newToken.preferredDimensions.label}
											<label className = "creator-label">
												<input className = "creator-input"
													name = "preferredDimensions"
													type = "range"
													min = "5"
													max = "8"
													step = "1"
													value = {Math.log2(newToken.preferredDimensions.is)}
													onChange = {handleDimensionsSliderChange}
													disabled = {formDisabled}
												/>
											</label>
											{newToken.preferredDimensions.is}
											{getHelpText("preferredDimensions")}
										</div>
									}
									<div className = "panel">
										{newToken.preferredQuality.label}
										<label className = "creator-label">
											<input className = "creator-input"
												name = "preferredQuality"
												type = "range"
												id = "qualitySlider"
												min = {newToken.preferredQuality.min}
												max = {newToken.preferredQuality.max}
												step = "1"
												value = {newToken.preferredQuality.is}
												onChange = {handleQualitySliderChange}
												disabled = {formDisabled}
											/>
										</label>
										{newToken.preferredQuality.is}
										{getHelpText("preferredQuality")}
									</div>
									<div className = "panel">
										<label className = "creator-label">
											{newToken.preferredMaxB64Size.label}
											<input className = "creator-input"
												name = "preferredMaxB64Size"
												type = "number"
												min = {newToken.preferredMaxB64Size.min}
												max = {newToken.preferredMaxB64Size.max}
												step = "any"
												value = {newToken.preferredMaxB64Size.is}
												onChange = {handleInputChange}		
												disabled = {formDisabled}
											/>
										</label>
										{getHelpText("preferredMaxB64Size")}
									</div>
								</div>
							}
						</section>
					}
					<section>
						{
							formDisabled === false && newToken.base64Encoding.is && imageUpdatesPending && <button
								className = "general-button"
								type = "button"
								onClick = {handleUpdateImage}
								>Update image
							</button>
						}
						{
							formDisabled === false && newToken.base64Encoding.is && imageUpdatesPending && unlocked && <button
								className = "general-button"
								type = "button"
								onClick = {updateImageFR}
								>Update image - file-resizer method
							</button>
						}
						{
							formDisabled === false && !standardImagePreferencing && <button
								className = "general-button"
								type = "button"
								onClick = {resetImageToStandard}
								>Reset image to standard
							</button>
						}
						<button
							className = "general-button"
							type = "submit"
							>Submit
						</button>
					</section>
				</form>
				{
					newToken.base64Encoding.is &&  <section> {/* Results */}
						<h2>Image results</h2>
						<div className = "panel">
							<ul>
								<li>Width & height: {newToken.dimensions.is} pixels</li>
								<li>Quality: {newToken.quality.is}%</li>
								<li>Size: {newToken.b64Size.is} bytes</li>
							</ul>
						</div>
						<p>
							Sendable Minima: {minimaData.balance.sendable}
						</p>
						{
							imageControls > 1 && <p>
								Is size of the encoded image within:
								<ul>
									<li class = "li-dot">The parameter you set?&nbsp; <span style = {{ color: "white", backgroundColor: newToken.b64Size.is <= newToken.preferredMaxB64Size.is ? "green" : "red"}}> {newToken.b64Size.is < newToken.preferredMaxB64Size.is ? "Yes" : "No"}</span> </li>
									<li class = "li-dot">The size which the standard method gives?&nbsp; <span style = {{ color: "white", backgroundColor: newToken.b64Size.is <= newToken.b64Size.max ? "green" : "red"}}> {newToken.b64Size.is < newToken.b64Size.max ? "Yes" : "No"}</span> </li>
								</ul>
							</p>
						}
					</section>
				}
				{
					testMode === true && <section>
						<div className = "panel">
							<ul>
								<li>preferredOutcome.is: {newToken.preferredOutcome.is}</li>
								<li>b64Size.max: {newToken.b64Size.max}</li>
								<li>b64Size.is: {newToken.b64Size.is}</li>
								<li>preferredB64Size.max: {newToken.preferredMaxB64Size.max}</li>
								<li>preferredB64Size.is: {newToken.preferredMaxB64Size.is}</li>
								<li>preferredDimensions.max: {newToken.preferredDimensions.max}</li>
								<li>preferredDimensions.is: {newToken.preferredDimensions.is}</li>
								<li>preferredQuality.max: {newToken.preferredQuality.max}</li>
								<li>preferredQuality.is: {newToken.preferredQuality.is}</li>
							</ul>
						</div>
					</section>
				}
				{
					newToken.base64Encoding.is && <section>
						<div className = "actual-token-panel">
							<h2>Token image (actual size)</h2>
							<img
								src = {`data:image/jpg;base64, ${newToken.base64Encoding.is}`}
								className = "actual-token-image"
								alt = "Preview, potentially reformatted"
								/>
						</div>
					</section>
				}
				{
					newToken.base64Encoding.is && <section>
						<h2>Fit-to-page view</h2>
						<img
							style = {{width: "100%"}}
							src = {`data:image/jpg;base64, ${newToken.base64Encoding.is}`}
							alt = "Preview, potentially reformatted and expanded"
						/>
					</section>
				}
			</div>
		</>
	)
}

export default Creator;
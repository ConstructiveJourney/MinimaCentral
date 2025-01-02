const GetSendInstructions = (minimaData, selectedToken, selectedCoin, state, sendData, userAddress) => {
	let sendInstr = {
		lines: [],
		destinationAddressLocation: ""
	};
	let counter = 0;
	sendInstr.lines[counter] = "txndelete id:mctransid";
	counter++;
	sendInstr.lines[counter] = "txncreate id:mctransid";
	counter++;
	sendInstr.lines[counter] = "txninput id:mctransid coinid:" + selectedCoin.coinid;
	counter++;
	let minimaChangeAmount = 0;
	if (sendData.burn.is > 0) {
		minimaChangeAmount = -sendData.burn.is;
		for (let i = 0; i < minimaData.coins.length; i++) { // Find enough Minima coins and add them as inputs.
			sendInstr.lines[counter] = "txninput id:mctransid coinid:" + minimaData.coins[i].coinid;
			counter++;
			minimaChangeAmount += minimaData.coins[i].amount;
			if (minimaChangeAmount >= 0) {
				break;
			}
		}
	}
	sendInstr.lines[counter] = "txnoutput id:mctransid address:" + sendData.address.is + " tokenid:" + selectedToken.specs.tokenid + " amount:" + sendData.amount.is; // CARE This line can be updated on its own in Viewer.
	sendInstr.destinationAddressLocation = counter; // So Viewer knows where to find the destination address.
	counter++;
	if (selectedCoin.tokenAmount > sendData.amount.is) { // Add change if necessary.
		let changeAmount = selectedCoin.tokenAmount - sendData.amount.is;
		let changeAddress = selectedCoin.address;
		sendInstr.lines[counter] = "txnoutput id:mctransid address:" + changeAddress + " tokenid:" + selectedToken.specs.tokenid + " amount:" + changeAmount;
		counter++;
	}
	if (minimaChangeAmount > 0) {
		let changeAddress = userAddress;
		sendInstr.lines[counter] = "txnoutput id:mctransid address:" + changeAddress + " tokenid:0x00 amount:" + minimaChangeAmount; // Add a change output for Minima
		counter++
	}
	for (let i = 0; i < state.length; i++) {
		let stateData = state[i].data;
		if (state[i].type === 4) { // Add quotes if it is a string.
			stateData = "\"" + stateData + "\"";
		}
		sendInstr.lines[counter] = "txnstate id:mctransid "
			+ "port:" + state[i].port + " "
			+ "value:" + stateData;
		counter++;
	}
	sendInstr.lines[counter] = "txnsign id:mctransid publickey:auto";

	return sendInstr;
}

const GetSendInstructionsDisplay = (instructions) => {
	return (
		<div>
			<ol start = "0">
				{instructions.map((item, index) => (
					<li key = {index}>
						{item}
					</li>
				))}
				<li><em>And, after validation:</em> txnbasics id:mctransid; txnpost id:mctransid</li>
			</ol>
		</div>
	)
}

export {GetSendInstructions, GetSendInstructionsDisplay};
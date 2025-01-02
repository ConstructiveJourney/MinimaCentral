// Returns the RegEx.
function GetRE() {
	return /(%0A|%0D|['\"\\]+)/g; // RegEx.
}

// Returns the text to be used in replacement for any removed characters.
function GetReplacement() {
	return "-";
}

export {GetRE};
export {GetReplacement};
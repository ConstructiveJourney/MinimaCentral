import { GetRE } from  "./ContentEnforcer.jsx" // RegEx.
import { GetReplacement } from "./ContentEnforcer.jsx" // The replacement text, to go with RegEx.

// For a collection, to extract the serialno port from the tokenscript, and return it as an int.
function GetPortNoFromScript (searchIn, searchFor) {
	// Programming info: str = "012345"; str.slice(1,3) gives "12".  str.slice(1) gives "12345".
	searchIn = searchIn.replace(GetRE, GetReplacement);
	if (searchIn.includes(searchFor)) {
		let noToCut = searchIn.indexOf(searchFor) + searchFor.length;
		searchIn = searchIn.slice(noToCut); // Get rid of everything up to and including the string being searched for.
		let nextChar = searchIn.charAt(0);
		let loopCounter = 0;
		let maxLoops = 5;
		while ((nextChar === " " || nextChar === "=") && loopCounter < maxLoops) { // Get us to the start of the data.
			searchIn = searchIn.slice(1);
			nextChar = searchIn.charAt(0);
			loopCounter++;
		}
		noToCut = searchIn.indexOf(" ");
		if (noToCut === -1) {
			return -1;
		}
		searchIn = searchIn.slice(0, noToCut); // Get rid of everything from " " onwards.
		if (/^\d+$/.test(searchIn)) { // Check the string contains only numerals.
			return parseInt(searchIn, 10);
		} else {
			return -1;
			}
	} else {
		return -1;
	}
}


export default GetPortNoFromScript;
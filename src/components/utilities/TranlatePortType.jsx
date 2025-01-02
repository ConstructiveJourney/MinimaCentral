// To translate a port type between a number e.g. 4, and what it represents, e.g. string.
const TranslatePortType = ( queryValue ) => {
	switch (queryValue) {
		case "hex":
			return 1
		case "number": // FUTURE Check whether a non-integer number gets recorded as 2 or something else, e.g. 4.
		case "int":
			return 2
		case "string":
			return 4
		case "boolean":
			return 8
		case 1:
		case "1":
			return "hex"
		case 2:
		case "2":
			return "int"
		case 4:
		case "4":
			return "string"
		case 8:
		case "8":
			return "boolean"
		default:
			// Do nothing
	}
}

export {TranslatePortType};
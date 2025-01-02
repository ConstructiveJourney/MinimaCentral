// To generate an SVG image based on a tokenid
function GenerateSVG(tokenid) {
	const size = 512;
	const width = size;
	const halfWidth = width / 2;
	const noOfShapes = 10;
	const maxShapeHeight = size / noOfShapes;
	
	const hash = tokenid.slice(2,66); // Removes "0x", leaving 64 hexadecimal digits

	let linePos1 = Math.floor((parseInt(hash.slice(0,1), 16) * 6/16) + 1);
	let linePos2 = Math.floor((parseInt(hash.slice(2,3), 16) * 6/16) + 1);
	if (linePos2 >= linePos1) {
		linePos2++;
	}
	
	const img = [
		{id: 0},
		{id: 1},
		{id: 2},
		{id: 3},
		{id: 4},
		{id: 5},
		{id: 6},
		{id: 7},
		{id: 8},
		{id: 9}
	];

	var ellipseSequenceNo = 0;
	var lineSequenceNo = 8;
	var shapePercent;
	var vertCen = 0;
	img.forEach((obj) => {
		shapePercent = ((parseInt(hash.slice(44 + (obj.id * 2), 44 + (obj.id * 2) + 2), 16) / 256)) / 2 + 0.5;
		if (obj.id === linePos1 || obj.id === linePos2) {
			obj.sequenceNo = lineSequenceNo;
			lineSequenceNo++;
			obj.x1 = halfWidth;
			obj.x2 = halfWidth;
			obj.y1 = vertCen;
			obj.y2 = vertCen + (maxShapeHeight / 2) * shapePercent;
			vertCen = obj.y2;
			obj.color = "0000FF";
		} else {
			obj.sequenceNo = ellipseSequenceNo;
			ellipseSequenceNo++;
			obj.cx = halfWidth; // x-coordinate of center
			obj.rx = halfWidth * shapePercent; // horizontal radius
			obj.ry = (maxShapeHeight / 2) * shapePercent; // vertical radius
			vertCen = vertCen + obj.ry;
			obj.cy = vertCen; // y-coordinate of center
			vertCen = vertCen + obj.ry;
			obj.color = hash.slice(obj.id * 6, (obj.id * 6) + 6); // Color
		}
	});
		
	return (
		img
	);
}

export default GenerateSVG;
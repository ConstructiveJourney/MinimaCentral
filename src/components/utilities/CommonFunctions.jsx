// Function which returns the image to be displayed.
import filler_image from "../../assets/filler_image.png";

function GetImage (item, clssNm) {
	return (
		item.url !== "Not artimage" ? (
			<img
				src = {`data:image/jpg;base64, ${item.url}`} // Notes: Pay attention to back ticks: https://stackoverflow.com/questions/57874087/why-do-i-get-an-unexpected-template-string-expression-error.
				className = {clssNm}
				alt = "token or coin"
			/>
		) : (
			item.filler.cx !== "" && <svg
				xmlns = "http://www.w3.org/2000/svg"
				height = "512"
				width = "512"
				viewBox = {`0 0 512 512`}
				className = {clssNm}
				alt = "token"
				onError = { <img src = {filler_image} className = {clssNm} alt = "token or coin"/> }
			>
				{
					item.filler.filter(shp => shp.sequenceNo < 8).map((obj) => (
						<ellipse key = {obj.sequenceNo} cx={`${obj.cx}`} cy={`${obj.cy}`} rx={`${obj.rx}`} ry={`${obj.ry}`} fill = {`#${obj.color}`}/>
					))
				}
				{
					item.filler.filter(shp => shp.sequenceNo > 7).map((obj) => (
						<line key = {obj.sequenceNo} x1={`${obj.x1}`} y1={`${obj.y1}`} x2={`${obj.x2}`} y2={`${obj.y2}`} stroke = {`#${obj.color}`}/>
					))
				}
			</svg>
		)
	)
}

export { GetImage };
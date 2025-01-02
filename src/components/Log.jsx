import React from "react";

function Viewer ({appLog}) {
	
	return (
		<>
			<section>
				<h2>Log</h2>
				<div className = "panel">
					<ul>
						{appLog.map((item, index) => (
							<li key = {index}>
								{`${index}`}
								:
								&nbsp;
								{item}
							</li>
						))}
					</ul>
				</div>
			</section>
		</>
	)

}

export default Viewer;
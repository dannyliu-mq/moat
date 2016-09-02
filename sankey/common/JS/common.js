/***
	Author: Ed Moore/Yvonne Nemes
	Project: MOAT

	This file is simply a collection of functions used by various pages in the reporting suite of the LRS system.
	Individual notes are attached to each function to detail their function and who wrote them.

***/



/*
	Function:		decToHex
	Author: 		Ed Moore
	Description:	This function takes 3 numbers (RGB) and returns the hex version of the color.
*/

function decToHex(r, g, b) {
	var newR = r.toString(16);
	var newG = g.toString(16);
	var newB = b.toString(16);

	if (newR.length == 1) newR = "0" + newR;
	if (newG.length == 1) newG = "0" + newG;
	if (newB.length == 1) newB = "0" + newB;

    return newR + newG + newB;
}

/*
	Function: 		hexToDec
	Author:			Yvonne Nemes
	Description:	This function takes in 3 parameters of a colour in the form of a hex colour code, split into
					3 parts. It then returns a decimal array of the colour in RGB (0-255) format 
*/
function hexToDec(R, G, B)
{
	var red = parseInt(R, 16);
	var green = parseInt(G, 16);
	var blue = parseInt(B, 16);

	// console.log(red + "," + green + "," + blue);

	var decColours = Array();
		decColours[0] = red;
		decColours[1] = green;
		decColours[2] = blue;

	return decColours;
}


/*
	Function: 		hexToDec
	Author:			Yvonne Nemes
	Description:	This function utilies the fact the above function and returns the same thing however the
					big difference here is that this function takes in a full hex colour string which is more
					useful. 
*/
function hexToDecEd(hexNo)
{
	if(hexNo.length != 6)
		throw "Invalid hex colour passed (" + hexNo + ") to hexToDecEd";

	return hexToDec(hexNo.substring(0,2), hexNo.substring(2,4),hexNo.substring(4,6));
}



/*
	Function: 		getNodeColours
	Author:			Yvonne Nemes
	Description:	In this function, we take in 3 variables, 2 colours and N which is the number of nodes,
					this function then returns an array of colours (in RGB array format), equally spaced apart
					ranging from colourMax to colourMin.
*/
function getNodeColours(numNodes, colourMax, colourMin, hexMode)
{
	var colourMaxDec = hexToDecEd(colourMax);
	var colourMinDec = hexToDecEd(colourMin);

	// calculating the diff between maximum and minimum values
	var rDiff = colourMaxDec[0]-colourMinDec[0];
	var gDiff = colourMaxDec[1]-colourMinDec[1];
	var bDiff = colourMaxDec[2]-colourMinDec[2];

	// calculating the number to subtract for the diff at each node
	var subtractFromRDiff = rDiff / (numNodes-1);
	var subtractFromGDiff = gDiff / (numNodes-1);
	var subtractFromBDiff = bDiff / (numNodes-1);

	var colours = Array();

	// assign a colour to each node
	for (i = 0; i < numNodes; i++)
	{
		// assigning RGB to the current node being viewed
		colours[i] = ([
			colourMaxDec[0] - Math.round((i*subtractFromRDiff)), // red
			colourMaxDec[1] - Math.round((i*subtractFromGDiff)), // green
			colourMaxDec[2] - Math.round((i*subtractFromBDiff)) // blue
		]);
	}

	if (hexMode){
		for(var i = 0; i < colours.length; i++)
			colours[i] = decToHex(colours[i][0], colours[i][1], colours[i][2]);
	}

	return colours;
}

/*
	Function: 		filterGrades
	Author:			Ed Moore
	Description:	This is function filters a list of links from nodes provided and returns the list based
					on the filters provided
*/
function filterGrades(links, minNodes, maxNodes, nodeNames)
{
	var newLinks = Array();

	if(minNodes.length != maxNodes.length || minNodes.length != nodeNames.length)
		throw "minNodes(" + minNodes.length + ")/maxNodes(" + maxNodes.length + ")/nodeNames(" + nodeNames.length + ") are not the same length in filterGrades!"

	for( var j = 0; j < links.length; j++){
		for( var i = 0; i < minNodes.length; i++ ){
			links[j]['grade'] = Math.ceil(links[j]['grade']);

			if( links[j]['grade'] >= minNodes[i] && links[j]['grade'] <= maxNodes[i] ){
				console.log(links[j]['grade'] + " between " + minNodes[i] + " and " + maxNodes[i]);
				links[j]['grade'] = nodeNames[i];
				break;
			}
		}
	}

	// Simplify the links
	for (link in links){
		var found = false;

		for (newLink in newLinks){

			if (newLinks[newLink]['grade'] == links[link]['grade'] && newLinks[newLink]['source'] == links[link]['source'] && newLinks[newLink]['target'] == links[link]['target']){
				newLinks[newLink]['value']++;
				found = true;
				break;
			}
		}

		if (!found)
			newLinks.push(links[link]);
	}


	return newLinks;
}

/*
	Function: 		applyColours
	Author:			Ed Moore
	Description:	Uses a list of linkNames (grades) to apply a colour range to each using jquery styles.
*/

function applyColours(nodeNames){

	for(id in nodeNames){
		if( $("#dataType").val() == TYPE_GRADE_NUMERIC || $("#dataType").val() == TYPE_NUMERIC){
			$(".grade-" + $("#dataSets input[name=\"dataSets[max][" + id + "]\"]").val() + "-" + $("#dataSets input[name=\"dataSets[min][" + id + "]\"]").val()).css('stroke', $("#dataSets input[name=\"dataSets[color][" + id + "]\"]").val());
			// console.log(".grade-" + $("#dataSets input[name=\"dataSets[max][" + id + "]\"]").val() + "-" + $("#dataSets input[name=\"dataSets[min][" + id + "]\"]").val() + " -> " + $("#dataSets input[name=\"dataSets[color][" + id + "]\"]").val());
		}
		else{
			$(".grade-" + $("#dataSets input[name=\"dataSets[value][" + id + "]\"]").val()).css('stroke', $("#dataSets input[name=\"dataSets[color][" + id + "]\"]").val());
			// console.log(".grade-" + $("#dataSets input[name=\"dataSets[value][" + id + "]\"]").val() + " -> " + $("#dataSets input[name=\"dataSets[color][" + id + "]\"]").val());
		}
	}
}

/*
	Function:		isNumeric
	Author:			Ed Moore
	Description:	Tests a value to see if it's numeric or not.
*/
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


/*
	Function:		smartRoundDown
	Author:			Yvonne Nemes
	Description:	This function takes in a single number and returns a rounded down number.
					Examples:
						1245 -> 1200
						1501 -> 1500
						1920 -> 1900
						100	 -> 100
						101  -> 100
						199  -> 190
						189  -> 180
						10   -> 0
						9    -> 0
						1    -> 0
*/
function smartRoundDown(n){
	if (n > 1000) n -= (n%100);
	else if (n > 100) n -= (n%100);
	else if (n > 10) n -= (n%10);
	else if (n > 1 && n < 4) n = 0;

	return n;
}

/*
	Function:		smartRoundDown
	Author:			Yvonne Nemes
	Description:	This function takes in a single number and returns a rounded up number.
					Examples:
						1245 -> 1300
						1501 -> 1600
						1920 -> 2000
						100	 -> 100
						101  -> 110
						199  -> 200
						189  -> 190
						10   -> 10
						9    -> 10
						1    -> 10
*/
function smartRoundUp(n){
	if (n > 1000) n += (1000-n%1000);
	else if (n > 100) n += (100-n%100);
	else if (n > 10) n += (10-n%10);
	else if (n > 7 && n < 10) n = 10;

	return n;
}

function addControlRow( data ){
	type = $("#dataType").val();
	i = $("#dataSets tbody tr").length;

	if (!data) data = { max: 0, min: 0, value: ' ', color: '000000' };

	var html = '';

	html += '<tr>';
	html += '<td><i class="smallText faintText">' + i + '</i></td>';
	if (type == TYPE_NUMERIC || type == TYPE_GRADE_NUMERIC){
		html += '<td><input type="number" name="dataSets[max][' + i +  ']" value="' + data['max'] + '"></td>';
		html += '<td><input type="number" name="dataSets[min][' + i + ']" value="' + data['min'] + '"></td>';
	}else{
		html += '<td><input type="text" name="dataSets[value][' + i +  ']" value="' + data['value'] + '"></td>';
	}
	html += '<td><input type="text" class="color" name="dataSets[color][' + i + ']" value="#' + data['color'] + '"></td>';
	html += '<td class="colourDisplay" style="background: #' + data['color'] + '">stuff</td>';
	html += '</tr>';

	$("#dataSets tbody").append(html);

	// Enable the colour pickers
	var pickerInput;
	$('.color').ColorPicker({
		livePreview: true,
		onSubmit: function(hsb, hex, rgb, el) {
			$(el).val(hex);
			$(el).ColorPickerHide();
		},
		onBeforeShow: function () {
			$(this).ColorPickerSetColor(this.value);
			pickerInput = $(this);
		},
		onHide: function(picker){
			pickerInput.val('#' + $(picker).find('.colorpicker_hex input').val());
			pickerInput.change();
		}
	}).bind('keyup', function(){
		$(this).ColorPickerSetColor(this.value);
	});

	$(".color").change(function(){
		$(this).parent().next().css("background-color", $(this).val());
	});
}

function removeControlRow(){
	$("#dataSets tbody tr:last").remove();
}




function detectNumNodes(){
	var numNodes = $("#numMinus").val();

	if (numNodes > 3)
		$("#numNodesWarning").show();
	else
		$("#numNodesWarning").hide();
}



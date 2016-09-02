var data;
const TYPE_GRADE_NUMERIC 		= 0;
const TYPE_GRADE_CATEGORICAL	= 1;
const TYPE_NUMERIC 				= 2;
const TYPE_CATEGORICAL		 	= 3;
const TYPE_UNKNOWN				= 4;


function queryResults( fd, displayGrades ){

	console.log("Starting AJAX Query...");

	$.ajax({
		// 'async': false,
		// 'url': 		"run.cgi",
		'url':		"run.cgi",
		'dataType': "json",
		'data':		fd,
		'timeout': 	(5 * 60000), //5 Minutes
		'processData': false, // Don't process the files
    	'contentType': false, // Set content type to false as jQuery will tell the server its a query string request
    	'type':	    'POST',
    	'cache':	false,
		beforeSend: function() {
			$("#loading-image").show();
			$("#graph svg").each(function(){
				$(this).remove();
			})
		}
	})
	.done(function( data ) {
		console.log( data );
		$("#loading-image").hide();

		// Enable the submit buttons
		$(".submitButton").each(function(){
    		$(this).prop('disabled', false);
    		$(this).removeClass("disabled");
    	});
    	$(".submitButton:nth-child(1)").val("Run Again (No Grades)");
    	$(".submitButton:nth-child(2)").val("Run Again (With Grades)");

    	// Group the data if the marks are uploaded
    	if (displayGrades){
			// Get the grade names/Maxs/Mins
			gradeNames = [];
			gradeMins = [];
			gradeMaxs = [];
			$("#dataSets input[name^=\"dataSets[max]\"]").each(function( index ){
				gradeNames.push($("#dataSets input[name=\"dataSets[max][" + index + "]\"]").val() + "-" + $("#dataSets input[name=\"dataSets[min][" + index + "]\"]").val());
				gradeMins.push($("#dataSets input[name=\"dataSets[min][" + index + "]\"]").val());
				gradeMaxs.push($("#dataSets input[name=\"dataSets[max][" + index + "]\"]").val());
			});
			$("#dataSets input[name^=\"dataSets[value]\"]").each(function( index ){
				gradeNames.push($("#dataSets input[name=\"dataSets[value][" + index + "]\"]").val());
			});

			// No filtering required for categorical grades.
			if( $("#dataType").val() == TYPE_NUMERIC || $("#dataType").val() == TYPE_GRADE_NUMERIC)
				data['links'] = filterGrades(data['links'], gradeMins, gradeMaxs, gradeNames);
		}

		// Display graph
		generateGraph( data );

		// Apply colour set if marks are uploaded
    	if (displayGrades){
			applyColours(gradeNames);
		}

    	console.log("AJAX Complete.");
	})
	.fail(function( msg ) {
		console.log("AJAX Request failed with message: " + msg.statusText + " and responseText: " + msg.responseText);
	});
}


$(document).ready(function(){
	const TYPE_TO_TEXT = [
		"Grade (Numerical)",
		"Grade (Categorical)",
		"Numerical Data",
		"Categorical Data"
	]

	// Start loading the courses ASAP
	getCourses();


	$("#controlForm").submit(function(e){

		e.preventDefault(); //STOP default action
    	// e.unbind(); //unbind. to stop multiple form submit.
	});

	function setControlForm(dataSet){
		console.log(dataSet);

		var type = dataSet['type'];
		var data = dataSet['ranges'];
		var dataTarget = $("#dataSets");
		var html = '';

		// Build the heading

		html += '<tr>';
		html += '<th>Set #</th>';
		if (type == TYPE_NUMERIC || type == TYPE_GRADE_NUMERIC){
			html += '<th>Max</th>';
			html += '<th>Min</th>';
		}else{
			html += '<th>Value</th>';
		}
		html += '<th>Colour</th>';
		html += '<th>Sample</th>';
		html += '</tr>';

		// Remove the table of data
		$("#dataSets thead").empty();
		$("#dataSets thead").append(html);
		$("#dataSets tbody").empty();

		// Update the dropdown
		$("#dataType").empty();
		$.each(TYPE_TO_TEXT, function(i, item){
			$("#dataType").append($('<option>', {
				value: i,
				text: item
			}));
		});
		$("#dataType").val(type);
		$("#numIntervals").val(data.length-1);

		// Append the datasets to the table
		for( var i = 0; i < data.length; i++ ){
			addControlRow( data[i] );
		}

		// Enable the control objects
		$("#controlForm input, #controlForm select, #controlForm button").attr('disabled', false);
	}

	$("#numIntervals").change(function(){
		// Remove additonal rows
		while( $("#dataSets tbody tr").length > $(this).val() )
			removeControlRow();

		// Add additional rows
		while( $("#dataSets tbody tr").length < $(this).val() )
			addControlRow( null );
	});

	$("#dataType").change(function(){
		$("#uploadedfile").change();
	});

	$("#uploadedfile").change(function(event){
		var file = event.target.files[0];
		var reader = new FileReader();
		var csv;

		reader.onload = (function(theFile){
			return function(e) {
				var csv = e.target.result.split("\n");
				sets = parseData(csv, null);
				setControlForm(sets);

			};
		})(file);

		reader.readAsText(file);
	});

	// function reParseData(max, min, )

	function parseData(lines, forceType){
		const safeList = [
			'Fail', 'F',
			'Pass', 'P',
			'Credit', 'C', 'Cr',
			'Distinction', 'D',
			'HighDistinction', 'High Distinction', 'HD'
		];

		if ( !forceType && $("#dataType option").length > 1 )
			forceType = $("#dataType").val();

		var dataType;
		var maxIndex = 1;
		var minIndex = 1;

		var uniqueList = [];

		// Count the unique values
		for(var i = 1; i < lines.length; i++){	// Skip the header
			if (lines[i].length == 0) continue;
			var val = lines[i].split(',')[1].trim();
			if (isNumeric(val)) val = parseInt(val);

			if ( $.inArray(val, uniqueList) == -1 )
				uniqueList.push(val);
		}

		// Get the colours suggested
		// suggestedColours = getNodeColours(uniqueList.length, '4BBC4B', 'DC2D13', true);

		// Check for a forced dataType
		if (forceType){
			isNumberPossible = (forceType == TYPE_GRADE_NUMERIC || forceType == TYPE_NUMERIC);
			isGradePossible = (forceType == TYPE_GRADE_NUMERIC || forceType == TYPE_GRADE_CATEGORICAL);
		}else{		// Check for a matching data type
			var isNumberPossible = true;
			var isGradePossible = true;

			for( var i = 1; i < lines.length; i++){
				if (lines[i] == '') continue;
				var val = lines[i].split(',')[1];
				if (isNumeric(val)) val = parseInt(val);

				// Check for a number
				if ( !isNumeric(val) ){
					isNumberPossible = false;
					if ( $.inArray(val, safeList) == -1 ) isGradePossible = false;
				}else{
					// Remember max/min
					if ( val > parseInt(lines[maxIndex].split(',')[1]) )
						maxIndex = i;
					if ( val < parseInt(lines[minIndex].split(',')[1]) )
						minIndex = i;
				}
			}

			// Check if numeric grade possible
			if (lines[maxIndex].split(',')[1] > 100 || lines[minIndex].split(',')[1] < 0)
				isGradePossible = false;

			// Complex checks (use some basic logic to assume data sets)
			if (lines[maxIndex].split(',')[1] - lines[minIndex].split(',')[1] < 50)	//Unlikely that the grade difference will be <50
				isGradePossible = false;
		}

		// Return the colour arrays
		if (isGradePossible){
			suggestedColours = getNodeColours(5, '4BBC4B', 'DC2D13', true);

			if (isNumberPossible){
				return {
					type: 	TYPE_GRADE_NUMERIC,
					ranges: [
						{ max: 100, min: 85, color: suggestedColours[0] },
						{ max: 84,  min: 75, color: suggestedColours[1] },
						{ max: 74,  min: 65, color: suggestedColours[2] },
						{ max: 64,  min: 50, color: suggestedColours[3] },
						{ max: 49,  min: 0,  color: suggestedColours[4] }
					]
				}
			}else{
				return {
					type: 	TYPE_GRADE_CATEGORICAL,
					ranges: [
						{ value: 'HD', color: suggestedColours[0] },
						{ value: 'D',  color: suggestedColours[1] },
						{ value: 'C',  color: suggestedColours[2] },
						{ value: 'P',  color: suggestedColours[3] },
						{ value: 'F',  color: suggestedColours[4] }
					]
				}
			}
		}else{
			if (isNumberPossible){
				// Easier access to the data
				var maxNum = parseInt(lines[maxIndex].split(',')[1]);
				var minNum = parseInt(lines[minIndex].split(',')[1]);
				var numVals = $("#numIntervals").val();

				//Smart rounding helps with nicer values in data
				maxNum = smartRoundUp(maxNum);
				minNum = smartRoundDown(minNum);

				// Get a colour palette and setup array
				suggestedColours = getNodeColours(numVals, '4BBC4B', 'DC2D13', true);
				var step = (maxNum - minNum)/numVals;
				var rangeArr = []

				// Create the list of colors
				var count = 0;
				for( var n = maxNum; n > minNum; n -= step)
					rangeArr.push({ max: n, min: n-step+1, color: suggestedColours[count++]})
				return {
					type:	TYPE_NUMERIC,
					ranges: rangeArr
				}

			}else{
				if ( uniqueList.length > $("#numIntervals").attr("max") ){
					alert("FileError: File contains too many unique values.\n(" + $("#numIntervals").attr("max") + " max, " + uniqueList.length + " provided)");
					throw("FileError: File contains too many unique values.\n(" + $("#numIntervals").attr("max") + " max, " + uniqueList.length + " provided)");
					return { type: TYPE_UNKNOWN };
				}

				suggestedColours = getNodeColours(uniqueList.length, '4BBC4B', 'DC2D13', true);

				var rangeArr = [];
				for (var i = 0; i < uniqueList.length; i++)
					rangeArr.push({ value: uniqueList[i], color: suggestedColours[i] });

				return {
					type: TYPE_CATEGORICAL,
					ranges: rangeArr
				}
			}
		}
	}

	// RUN THE DATA AUTOMATICALLY - TESTING ONLY
	// queryResults(null);
});

function requestGraph(grades){
	// Perform a quick check to make sure grades are attached.
	if( grades && $("#uploadedfile").val() == ''){
		alert("You must attach a grades file!");
		return false;
	}


	// Disable the buttons until we're done
	$(".submitButton").each(function(){
		$(this).prop('disabled', true);
		$(this).addClass("disabled");
		$(this).val("Running...");
	});

	// Create a FormData object from the form then submit it to the run.js file
	var data = new FormData($("#controlForm")[0]);
	queryResults(data, grades);
}


function getCourses(){
	console.log("Loading courses...");

	// Reset all the dropdowns
	resetSelect("#courseID", "Loading courses...");
	resetSelect("#modType", "Please select a course");
	resetSelect("#modID", "Please select a module")


	$.ajax({
		'url': 		"http://lrs.ltc.mq.edu.au:8080/getCourses",
		'dataType': "json",
    	'cache':	true,
	})
	.done(function( data ) {
		resetSelect("#courseID", "Please select a course");

		// Populate with data from JSON
		$.each(data, function(i, value) {
            $('#courseID').append($('<option>').text(value).attr('value', i));
        });

        $("#courseID").prop('disabled', false).change(getModuleTypes);	// Enable the element & attach an event

    	console.log("AJAX Complete.");
	})
	.fail(function( msg ) {
		console.log("AJAX Request failed with message: " + msg.statusText + " and responseText: " + msg.responseText);
	});
}

function getModuleTypes(){
	console.log("Loading modTypes...");

	// Reset some of the dropdowns
	resetSelect("#modType", "Loading module types...");
	resetSelect("#modID", "Please select a module")

	$.ajax({
		'url': 		"http://lrs.ltc.mq.edu.au:8080/getModTypes/" + $("#courseID").val(),
		'dataType': "json",
    	'cache':	true,
	})
	.done(function( data ) {
		resetSelect("#modType", "Please select a module type");

		// Populate with data from JSON
		$.each(data, function(i, value) {
            $('#modType').append($('<option>').text(value).attr('value', value));
        });

        $("#modType").prop('disabled', false).change(getModules);	// Enable the element & attach an event

    	console.log("AJAX Complete.");
	})
	.fail(function( msg ) {
		console.log("AJAX Request failed with message: " + msg.statusText + " and responseText: " + msg.responseText);
	});	
}


function getModules(){
	console.log("Loading modules...");

	resetSelect("#modID", "Loading " + $("#modType").val() + "s...");

	$.ajax({
		'url': 		"http://lrs.ltc.mq.edu.au:8080/getMods/" + $("#courseID").val() + "/" + $("#modType").val(),
		'dataType': "json",
    	'cache':	true,
	})
	.done(function( data ) {
		resetSelect("#modID", "Please select a module");

		// Populate with data from JSON
		$.each(data, function(i, value) {
			if (value.length > 25) value = value.substring(0,22) + "...";

            $('#modID').append($('<option>').text(value).attr('value', i));
        });

        $("#modID").prop('disabled', false);

    	console.log("AJAX Complete.");
	})
	.fail(function( msg ) {
		console.log("AJAX Request failed with message: " + msg.statusText + " and responseText: " + msg.responseText);
	});	
}

function resetSelect(el, text){
	$(el).empty();
	$(el).append($('<option>').text(text).attr('value', ''));
}
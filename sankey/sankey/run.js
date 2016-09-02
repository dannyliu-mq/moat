function generateGraph(data){

	var nodes = data['nodes'];
	var links = data['links'];
	graph = data;
	
	// the number of links in the sankey
	var nodes = 0;

	var units = "Widgets";

	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var width = $(document).width()/100*80 - margin.left - margin.right;
	var height = $(document).height()/100*80 - margin.top - margin.bottom;

	var formatNumber = d3.format(",.0f"),    // zero decimal places
		format = function(d) { return formatNumber(d) + " " + units; },
		color = d3.scale.category20();

	// append the svg canvas to the page
	var svg = d3.select("#graph").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", 
				"translate(" + margin.left + "," + margin.top + ")");

	// Set the sankey diagram properties
	var sankey = d3.sankey()
		.nodeWidth(36)
		.nodePadding(40)
		.size([width, height]);

	var path = sankey.link();

	// load the data
	sankey
		.nodes(graph.nodes)
		.links(graph.links)
		.layout(32);

	// add in the links
	var link = svg.append("g").selectAll(".link")
		.data(graph.links)
		.enter().append("path")
		.attr("class", "link")
		.attr("class", function(d)
		{

			return "link grade-" + d.grade;
		})
		.attr("d", path)
		.style("stroke-width", function(d) { return Math.max(1, d.dy); })
		.sort(function(a, b) { return b.dy - a.dy; });

	// add the link titles
	link.append("title")
		.text(function(d)
		{
			return d.source.name + " → " + 
				d.target.name + "\n" + "Participats: " + d.value +
				"\n" + "Grade: " + d.grade;
		});

	// add in the nodes
	var node = svg.append("g").selectAll(".node")
		.data(graph.nodes)
	.enter().append("g")
		.attr("class", "node")
		.attr("transform", function(d) { 
			return "translate(" + d.x + "," + d.y + ")"; })
		// .style("stroke", red)
	.call(d3.behavior.drag()
		.origin(function(d) { return d; })
		.on("dragstart", function() { 
			this.parentNode.appendChild(this); })
		.on("drag", dragmove));

	// add the rectangles for the nodes
	node.append("rect")
		.attr("height", function(d) { return d.dy; })
		.attr("width", sankey.nodeWidth())
		.style("fill", function(d) { 
			return d.color = color(d.name.replace(/ .*/, "")); })
		.style("stroke", function(d) { 
			return d3.rgb(d.color).darker(2); })
	.append("title")
		.text(function(d) { 
			return d.name + "\n" + format(d.value); });

	// add in the title for the nodes
	node.append("text")
		.attr("x", -6)
		.attr("y", function(d) { return d.dy / 2; })
		.attr("dy", ".35em")
		.attr("text-anchor", "end")
		.attr("transform", null)
		.text(function(d) { return d.name; })
	.filter(function(d) { return d.x < width / 2; })
		.attr("x", 6 + sankey.nodeWidth())
		.attr("text-anchor", "start");

	// the function for moving the nodes
	function dragmove(d) {
	d3.select(this).attr("transform", 
		"translate(" + (
			d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
		)
		+ "," + (
			d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
		) + ")");
	sankey.relayout();
	link.attr("d", path);
	}

	// the function for Dynamic Colouring
	function dynamicColour()
	{
	var color1 = 'FF0000';
	var color2 = '00FF00';

	var ratio = 0.5;
	var hex = function(x)
		{
		    x = x.toString(16);
		    return (x.length == 1) ? '0' + x : x;
		};

	var r = Math.ceil(parseInt(color1.substring(0,2), 16) * ratio + parseInt(color2.substring(0,2), 16) * (1-ratio));
	var g = Math.ceil(parseInt(color1.substring(2,4), 16) * ratio + parseInt(color2.substring(2,4), 16) * (1-ratio));
	var b = Math.ceil(parseInt(color1.substring(4,6), 16) * ratio + parseInt(color2.substring(4,6), 16) * (1-ratio));

	var middle = hex(r) + hex(g) + hex(b);
	}
}
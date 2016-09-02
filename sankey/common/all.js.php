<?php
	$TYPE = "js";

	$files = scandir(strtoupper($TYPE));

	foreach($files as $file){
		if( substr($file, strlen($file)-strlen($TYPE)-1) == ".".$TYPE ){
			echo "\n\n/***\n\tSource: $file\n***/\n";
			echo file_get_contents(strtoupper($TYPE) . "/" . $file);
		}
	}
?>
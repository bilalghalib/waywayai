<?php
	
$upload_dir = "uploads/";
$file = $upload_dir."lin.png";

$img = $_POST['imgBase64'];
$name = $_POST['imageName'];
$drawingText = $_POST['drawingText'];
$linesName = $_POST['drawingName'];



$img = str_replace('data:image/png;base64,', '', $img);
$img = str_replace(' ', '+', $img);
$data = base64_decode($img);


$fileText = $upload_dir.$linesName."lin.txt";

file_put_contents($fileText, $drawingText);

$fileImage = $upload_dir.$linesName."lin.png";

file_put_contents($fileImage, $data);

$response = array();
$response_array['status'] = 'success'; 
exit(json_encode($response));


?>

<?php

// Set these headers to allow CORS policy
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");

$upload_dir = "uploads/";
$file = $upload_dir."lin.png";

// We get the image and image name clients worked
$img = $_POST['imgBase64'];
$name = $_POST['imageName'];

// We also get the drawing text name and drawing name
$drawingText = $_POST['drawingText'];
$linesName = $_POST['drawingName'];

// Set the image name based on the image name and drawing name from the client
$img = str_replace('data:image/png;base64,', '', $img);
$img = str_replace(' ', '+', $img);
$data = base64_decode($img);
$fileText = $upload_dir.$linesName."lin.txt";

// Save the content
file_put_contents($fileText, $drawingText);
$fileImage = $upload_dir.$linesName."lin.png";
file_put_contents($fileImage, $data);

// Send the success response
$response = array();

$response_array['status'] = 'success';
exit(json_encode($response));

?>
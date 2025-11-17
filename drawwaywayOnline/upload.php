<?php
	
$upload_dir = "uploads/";
$file = $upload_dir."lin.png";

$img = $_POST['imgBase64'];
$imgOrgURL = $_POST['imgOrgURL'];
$name = $_POST['imageName'];
$drawingText = $_POST['drawingText'];

$img = str_replace('data:image/png;base64,', '', $img);
$img = str_replace(' ', '+', $img);
$data = base64_decode($img);

$imgOrgURL = str_replace('data:image/png;base64,', '', $imgOrgURL);
$imgOrgURL = str_replace(' ', '+', $imgOrgURL);
$dataOrg = base64_decode($imgOrgURL);

$fileText = $upload_dir.$name."lin.txt";

file_put_contents($fileText, $drawingText);

$fileImage = $upload_dir.$name."lin.png";

file_put_contents($fileImage, $data);

$imglocation = $upload_dir.$name."org.jpg";
copy($imgOrgURL, $imglocation);


$response = array();
$response_array['status'] = 'success'; 
exit(json_encode($response));


?>

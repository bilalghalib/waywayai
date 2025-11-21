<?php

$upload_dir = "uploads/";
$file = $upload_dir."lin.png";

$img = $_POST['imgBase64'];
$name = $_POST['imageName'];
$drawingText = $_POST['drawingText'];
$linesName = $_POST['drawingName'];
$voiceData = isset($_POST['voiceData']) ? $_POST['voiceData'] : null;
$strokeAnalysis = isset($_POST['strokeAnalysis']) ? $_POST['strokeAnalysis'] : null;



$img = str_replace('data:image/png;base64,', '', $img);
$img = str_replace(' ', '+', $img);
$data = base64_decode($img);


$fileText = $upload_dir.$linesName."lin.txt";

file_put_contents($fileText, $drawingText);

$fileImage = $upload_dir.$linesName."lin.png";

file_put_contents($fileImage, $data);

// Save voice annotations if provided
if ($voiceData) {
    $fileVoice = $upload_dir.$linesName."_voice.txt";
    file_put_contents($fileVoice, $voiceData);
}

// Save stroke analysis if provided
if ($strokeAnalysis) {
    $fileAnalysis = $upload_dir.$linesName."_analysis.json";
    file_put_contents($fileAnalysis, $strokeAnalysis);
}

$response = array();
$response_array['status'] = 'success';
$response_array['files'] = array(
    'drawing' => $fileText,
    'image' => $fileImage,
    'voice' => isset($fileVoice) ? $fileVoice : null,
    'analysis' => isset($fileAnalysis) ? $fileAnalysis : null
);
exit(json_encode($response));


?>

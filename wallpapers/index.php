<!DOCTYPE html>
<html>
<body>

<?php 
$myLinks = array("https://takagen99.github.io/wallpapers/01.png", 
    "https://takagen99.github.io/wallpapers/02.png",
    "https://takagen99.github.io/wallpapers/03.png", 
    "https://takagen99.github.io/wallpapers/04.png", 
    "https://takagen99.github.io/wallpapers/05.png");

$randomRedirection = $myLinks[array_rand($myLinks)]; 
header("Location: $randomRedirection"); 
?> 

</body>
</html>

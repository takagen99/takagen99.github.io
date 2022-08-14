<!DOCTYPE html>
<html>
<body>

<?php 
$myLinks = array("https://takagen99.github.io/wallpapers/01.png", 
    "https://takagen99.github.io/wallpapers/02.png",
    "https://takagen99.github.io/wallpapers/03.jpg",
    "https://takagen99.github.io/wallpapers/04.jpg",
    "https://takagen99.github.io/wallpapers/05.jpg",
    "https://takagen99.github.io/wallpapers/06.jpg",
    "https://takagen99.github.io/wallpapers/07.png",
    "https://takagen99.github.io/wallpapers/08.png",
    "https://takagen99.github.io/wallpapers/09.png",
    "https://takagen99.github.io/wallpapers/10.png",
    "https://takagen99.github.io/wallpapers/11.jpg",
	"https://takagen99.github.io/wallpapers/12.jpg");

$randomRedirection = $myLinks[array_rand($myLinks)];
header("Location: $randomRedirection");
?>

</body>
</html>
# Chess Engine Rapchess

<div align="center" style="padding-top: 50px">
<img src="https://github.com/Thibor/Chess-Engine-RapChess/blob/master/Resources/Rapchess.bmp" />
    <br>
    <br>
    <b><i>Javascript UCI chess engine</i></b>
    <br>
    <br>
    <img src="https://img.shields.io/github/downloads/Thibor/Chess-Engine-RapChess/total?color=critical&style=for-the-badge">
    <img src="https://img.shields.io/github/license/Thibor/Chess-Engine-RapChess?color=blue&style=for-the-badge">
    <img src="https://img.shields.io/github/v/tag/Thibor/Chess-Engine-RapChess.svg?color=critical&sort=semver&style=for-the-badge">
    <img src="https://img.shields.io/github/v/release/Thibor/Chess-Engine-RapChess?color=blue&label=Latest%20release&style=for-the-badge">
    <img src="https://img.shields.io/github/last-commit/Thibor/Chess-Engine-RapChess?color=critical&style=for-the-badge">
	<img src="https://img.shields.io/github/commits-since/Thibor/Chess-Engine-RapChess/latest?style=for-the-badge">
</div>

Try it out here <a href="https://thibor.github.io//Chess-Engine-Rapchess/">demo1</a> <a href="https://codepen.io/thibor/pen/RYJYrp">demo2</a>.

To use this engine please download program Jsuci (https://sourceforge.net/projects/jsuci/).

## Setup GUI Arena

You need download program Arena (http://www.playwitharena.com/?Download).

In Comand Line please write path to jsuci.exe (<b>C:\Games\Chess\Arena\Engines\jsuci\jsuci.exe</b>).

In Comand Line Parameters please write path to <b>rapchess.js</b>.
 
 ## Setup GUI Winboard
 
 You need download program Winboard (http://www.open-aurec.com/wbforum/viewtopic.php?t=51528).
 
Inside Winboard directory please create directory <b>Jsuci</b> with file rapchess.js and jsuci.exe, and you should click in menu <b>Engine / Edit Engine List</b> and add line:
 
<b>"Rapchess" -fd "..\Jsuci" -fcp "jsuci.exe rapchess.js" /fUCI</b>

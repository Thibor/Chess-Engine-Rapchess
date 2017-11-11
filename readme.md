# Rapspeed
>Javascript UCI chess engine.

To use this engine please download program Jsuci (https://sourceforge.net/projects/jsuci/).

## Setup GUI Arena

You need download program Arena (http://www.playwitharena.com/?Download).

In Comand Line please write path to jsuci.exe (D:\Games\Chess\Arena\Engines\jsuci\jsuci.exe).
In Comand Line Parameters please write path to rapspeed.js.
 <img src="arena.jpg" />
 
 ## Setup GUI Winboard
 
 You need download program Winboard (http://www.open-aurec.com/wbforum/viewtopic.php?t=51528).
 
 After you should click in Menu Engine / Edit Engine List and add line:
 
<b>"Rapspeed" -fd "..\Jsuci" -fcp "jsuci.exe rapspeed.js" /fUCI</b>

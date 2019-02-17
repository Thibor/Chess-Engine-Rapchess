var version = '19-02-01';
var piecePawn = 0x01;
var pieceKnight = 0x02;
var pieceBishop = 0x03;
var pieceRook = 0x04;
var pieceQueen = 0x05;
var pieceKing = 0x06;
var colorBlack = 0x08;
var colorWhite = 0x10;
var colorEmpty = 0x20;
var moveflagPassing = 0x02 << 16;
var moveflagCastleKing = 0x04 << 16;
var moveflagCastleQueen = 0x08 << 16;
var moveflagPromotion = 0xf0 << 16;
var moveflagPromoteQueen = 0x10 << 16;
var moveflagPromoteRook  = 0x20 << 16;
var moveflagPromoteBishop = 0x40 << 16;
var moveflagPromoteKnight = 0x80 << 16;
var maskCastle = moveflagCastleKing | moveflagCastleQueen;
var maskColor = colorBlack | colorWhite;
var g_captured = 0;
var g_castleRights = 0xf;
var g_depth = 0;
var g_hash = 0;
var g_passing = 0;
var g_move50 = 0;
var g_moveNumber = 0;
var g_pv = '';
var g_phase = 32;
var g_totalNodes = 0;
var g_startTime = 0;
var g_inCheck = false;
var g_depthout = 0;
var g_timeout = 0;
var g_nodeout = 0;
var g_stop = false;
var g_scoreFm = '';
var g_lastCastle = 0;
var adjInsufficient = false;
var adjMobility = 0;
var g_countMove = 0;
var undoStack = [];
var undoIndex = 0;
var arrField = [];
var g_board = new Array(256);
var g_hashBoard =  new Array(256);
var boardCheck = new Array(256);
var boardCastle = new Array(256);
var whiteTurn = 1;
var usColor = 0;
var enColor = 0;
var eeColor = 0;
var tmpMaterial = [[],[171,240],[764,848],[826,891],[1282,1373],[2526,2646],[0xffff,0xffff]];  
var arrMaterial = new Array(32);
var tmpMobility = [[],[],
[[-75,-76],[-57,-54],[-9,-28],[-2,-10],[6,5],[14,12],[22, 26],[29,29],[36, 29]],//knight
[[-48,-59],[-20,-23],[16, -3],[26, 13],[38, 24],[51, 42],[55, 54],[63, 57],[63, 65],[68, 73],[81, 78],[81, 86],[91, 88],[98, 97]],//bishop
[[-58,-76],[-27,-18],[-15, 28],[-10, 55],[-5, 69],[-2, 82],[9,112],[16,118],[30,132],[29,142],[32,155],[38,165],[46,166],[48,169],[58,171]],//rook
[[-39,-36],[-21,-15],[3,  8],[3, 18],[14, 34],[22, 54],[28, 61],[41, 73],[43, 79],[48, 92],[56, 94],[60,104],[60,113],[66,120],[67,123],[70,126],[71,133],[73,136],[79,140],[88,143],[88,148],[99,166],[102,170],[102,175],[106,184],[109,191],[113,206],[116,212]],//queen
[[90,9],[80,8],[70,7],[60,6],[50,5],[40,4],[30,3],[20,2],[10,1]]];//king
var arrMobility = new Array(32);

function RAND_32(){
return (Math.floor(Math.random() * 0x10000) << 16) | Math.floor(Math.random() * 0x10000);
}

function StrToSquare(s){
var fl = {a:0, b:1, c:2, d:3, e:4,f:5, g:6, h:7};
var x = fl[s.charAt(0)];
var y = 12 - parseInt(s.charAt(1));
return (x + 4) | (y << 4);
}

function FormatSquare(square){
return ['a','b','c','d','e','f','g','h'][(square & 0xf) - 4] + (12 - (square >>4));
}

function FormatMove(move){
var result = FormatSquare(move & 0xFF) + FormatSquare((move >> 8) & 0xFF);
if (move & moveflagPromotion){
	if (move & moveflagPromoteQueen) result += 'q';
	else if (move & moveflagPromoteRook) result += 'r';
	else if (move & moveflagPromoteBishop) result += 'b';
	else result += 'n';
}
return result;
}

function GetMoveFromString(moveString) {
var moves = GenerateAllMoves(whiteTurn,false);
for (var i = 0; i < moves.length; i++){
	if (FormatMove(moves[i]) == moveString)
		return moves[i];
}
}

function Initialize(){
g_hash = RAND_32();
arrField = [];
for(var y = 0;y < 8; y++)
	for(var x = 0;x < 8;x++)
		arrField.push((y + 4) * 16 + x + 4);
for(var n = 0; n < 256; n++){
	boardCheck[n] = 0;
	boardCastle[n]=15;
	g_board[n] = 0;
	g_hashBoard[n] = new Array(16);
	for(var p = 0;p < 16;p++)
		g_hashBoard[n][p] = RAND_32();
}
for(var n = 0;n < 6;n++){
	boardCastle[[68,72,75,180,184,187][n]] = [7,3,11,13,12,14][n];
	boardCheck[[71,72,73,183,184,185][n]] = [colorBlack | moveflagCastleQueen,colorBlack | maskCastle,colorBlack | moveflagCastleKing,colorWhite | moveflagCastleQueen,colorWhite | maskCastle,colorWhite | moveflagCastleKing][n];
}
for(var ph = 2;ph < 33;ph++){
	arrMaterial[ph] = new Array(7);
	arrMobility[ph] = new Array(7);
	var f = ph / 32;
	for(var p = 1;p < 7;p++){
		arrMaterial[ph][p] = Math.floor(tmpMaterial[p][0] * f + tmpMaterial[p][1] * (1 - f));
		arrMobility[ph][p] = new Array(tmpMobility[p].length);
		for(var n = 0;n < tmpMobility[p].length;n++)
			arrMobility[ph][p][n] = Math.floor(tmpMobility[p][n][0] * f + tmpMobility[p][n][1] * (1 - f));
	}
}
}

function InitializeFromFen(fen){
g_phase = 0;
for(var n = 0;n < 64;n++)
	g_board[arrField[n]] = colorEmpty;
if(!fen)fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
var chunks = fen.split(' ');
var row = 0;
var col = 0;
var pieces = chunks[0];
for (var i = 0; i < pieces.length; i++){
	var c = pieces.charAt(i);
	if (c == '/') {
		row++;
		col = 0;
	}else if(c >= '0' && c <= '9') {
		for (var j = 0; j < parseInt(c); j++)
			col++;
	}else{
		g_phase++;
		var b = c.toLowerCase();
		var isWhite = b != c;
		var piece = isWhite ? colorWhite : colorBlack;
		var index = (row + 4) * 16 + col + 4;
		switch(b){
			case 'p':
				piece |= piecePawn;
			break;
			case 'b':
				piece |= pieceBishop;
			break;
			case 'n':
				piece |= pieceKnight;
			break;
			case 'r':
				piece |= pieceRook;
			break;
			case 'q':
				piece |= pieceQueen;
			break;
			case 'k':
				piece |= pieceKing;
			break;
		}
		g_board[index] = piece;
		col++;
	}
}
whiteTurn = chunks[1].charAt(0) == 'w' | 0;
g_castleRights = 0;
if (chunks[2].indexOf('K') != -1)
	g_castleRights |= 1;
if (chunks[2].indexOf('Q') != -1)
	g_castleRights |= 2;
if (chunks[2].indexOf('k') != -1)
	g_castleRights |= 4;
if (chunks[2].indexOf('q') != -1)
	g_castleRights |= 8;
g_passing = 0;
if (chunks[3].indexOf('-') == -1)
	g_passing = StrToSquare(chunks[3]);
g_move50 = parseInt(chunks[4]);
g_moveNumber = parseInt(chunks[5]);
if(g_moveNumber)g_moveNumber--;
g_moveNumber *= 2;
if(!whiteTurn)g_moveNumber++;
undoStack=[];
for(undoIndex = 0;undoIndex  <= g_moveNumber;undoIndex++)
	undoStack[undoIndex] = new cUndo();
}

function IsRepetition(){
for(var n = undoIndex - 4;n >= undoIndex - g_move50;n -= 2)
	if(undoStack[n].hash == g_hash)
		return true;
return false;
}

function GenerateMove(moveStack,fr,to,add,flags){
g_countMove++;
if(((g_board[to] & 7) == pieceKing) || (((boardCheck[to] & g_lastCastle) == g_lastCastle) && g_lastCastle & maskCastle))
	g_inCheck = true;
else if(add)
	moveStack[moveStack.length] = fr | (to << 8) | flags;
}

function GenerateAllMoves(wt,attack){
adjMobility = 0;
g_inCheck = false;	
usColor = wt ?  colorWhite : colorBlack;
enColor = wt ? colorBlack : colorWhite;
eeColor = enColor | colorEmpty;
var pieceM = 0;
var pieceN = 0;
var pieceB = 0;
var moves = [];
for(var n = 0;n < 64;n++){
	var fr = arrField[n];
	var f = g_board[fr];
	if(f & usColor)f &= 7;else continue;
	g_countMove = 0;
	adjMobility += arrMaterial[g_phase][f];
	switch(f){
		case 1:
		pieceM++;
		var del = wt ? -16 : 16;
		var to = fr + del;
		if(g_board[to] & colorEmpty){
			GeneratePwnMoves(moves,fr,to,!attack)
			if(!g_board[fr-del-del] && g_board[to + del] & colorEmpty)
				GeneratePwnMoves(moves,fr,to + del,!attack);
		}
		if(g_board[to - 1] & enColor)GeneratePwnMoves(moves,fr,to - 1,true);
		else if((to - 1) == g_passing)GeneratePwnMoves(moves,fr,g_passing,true,moveflagPassing);
		else if(g_board[to - 1] & colorEmpty)GeneratePwnMoves(moves,fr,to - 1,false);
		if(g_board[to + 1] & enColor)GeneratePwnMoves(moves,fr,to + 1,true);
		else if((to + 1) == g_passing)GeneratePwnMoves(moves,fr,g_passing,true,moveflagPassing);
		else if(g_board[to + 1] & colorEmpty)GeneratePwnMoves(moves,fr,to + 1,false);
		break;
		case 2:
		pieceN++;
		GenerateUniMoves(moves,attack,fr,[14,-14,18,-18,31,-31,33,-33],1);
		adjMobility += arrMobility[g_phase][f][g_countMove];
		break;
		case 3:
		pieceB++;
		GenerateUniMoves(moves,attack,fr,[15,-15,17,-17],7);
		adjMobility += arrMobility[g_phase][f][g_countMove];
		break;
		case 4:
		pieceM++;
		GenerateUniMoves(moves,attack,fr,[1,-1,16,-16],7);
		adjMobility += arrMobility[g_phase][f][g_countMove];
		break;
		case 5:
		pieceM++;
		GenerateUniMoves(moves,attack,fr,[1,-1,15,-15,16,-16,17,-17],7);
		adjMobility += arrMobility[g_phase][f][g_countMove];
		break;
		case 6:
		GenerateUniMoves(moves,attack,fr,[1,-1,15,-15,16,-16,17,-17],1);
		var cr = wt ? g_castleRights : g_castleRights >> 2;
		if (cr & 1)
			if(g_board[fr + 1] & colorEmpty && g_board[fr + 2] & colorEmpty)
				GenerateMove(moves,fr,fr + 2,true,moveflagCastleKing);
		if (cr & 2)
			if(g_board[fr - 1] & colorEmpty && g_board[fr - 2] & colorEmpty && g_board[fr - 3] & colorEmpty)
				GenerateMove(moves,fr,fr - 2,true,moveflagCastleQueen);
		adjMobility += arrMobility[g_phase][f][g_countMove];
		break;
	}
}
adjInsufficient = (!pieceM) && (pieceN + (pieceB << 1) < 3);
if(!(pieceN | pieceB | pieceM))
	adjMobility -= 64;	
if(pieceB > 1)
	adjMobility += 64;
return moves;
}

function GeneratePwnMoves(moves,fr,to,add,flag){
var y = to >> 4;
if (((y == 4) || (y == 11)) && add){
	GenerateMove(moves,fr,to,add,moveflagPromoteQueen);
	GenerateMove(moves,fr,to,add,moveflagPromoteRook);
	GenerateMove(moves,fr,to,add,moveflagPromoteBishop);
	GenerateMove(moves,fr,to,add,moveflagPromoteKnight);
}else
	GenerateMove(moves,fr,to,add,flag);
}

function GenerateUniMoves(moves,attack,fr,dir,count){
for(var n = 0;n < dir.length;n++){
	var to = fr;
	var c = count;
	while(c--){
		to += dir[n];
		if(g_board[to] & colorEmpty)
			GenerateMove(moves,fr,to,!attack);
		else if(g_board[to] & enColor){
			GenerateMove(moves,fr,to,true);
			break;
		}else
			break;
	}
}
}

function MakeMove(move){
var fr = move & 0xFF;
var to = (move >> 8) & 0xFF;
var flags = move & 0xFF0000;
var piecefr = g_board[fr];
var piece = piecefr & 0xf;
var capi = to;
g_captured = g_board[to];
g_lastCastle = (move & maskCastle) | (piecefr & maskColor);
if(flags & moveflagCastleKing){
	g_board[to - 1] =  g_board[to + 1];
	g_board[to + 1] = colorEmpty;
}else if(flags & moveflagCastleQueen){
	g_board[to + 1] = rook = g_board[to - 2];
	g_board[to - 2] = colorEmpty;
}else if(flags & moveflagPassing){
	capi = whiteTurn ? to + 16 : to - 16;
	g_captured = g_board[capi];
	g_board[capi]=colorEmpty;
}
undoStack[undoIndex++] = new cUndo();
g_hash ^= g_hashBoard[fr][piece];
g_passing = 0;
var capturedType = g_captured & 0xF;
if(capturedType){
	g_move50 = 0;
	g_phase--;
}else if((piece & 7) == piecePawn) {
	if(to == (fr + 32))g_passing = (fr + 16);
	if(to == (fr - 32))g_passing = (fr - 16);
	g_move50 = 0;
}else
	g_move50++;
if (flags & moveflagPromotion){
	var newPiece = piecefr & (~0x7);
	if (flags & moveflagPromoteKnight)
		newPiece |= pieceKnight;
	else if (flags & moveflagPromoteQueen)
		newPiece |= pieceQueen;
	else if (flags & moveflagPromoteBishop)
		newPiece |= pieceBishop;
	else
		newPiece |= pieceRook;
	g_board[to] = newPiece;
	g_hash ^= g_hashBoard[to][newPiece & 7];
}else{
	g_board[to] = g_board[fr];
	g_hash ^= g_hashBoard[to][piece];
}
g_board[fr] = colorEmpty;
g_castleRights &= boardCastle[fr] & boardCastle[to];
whiteTurn ^= 1;
g_moveNumber++;
}

function UnmakeMove(move){
var fr = move & 0xFF;
var to = (move >> 8) & 0xFF;
var flags = move & 0xFF0000;
var piece = g_board[to];
var capi = to;
var undo = undoStack[--undoIndex];
g_passing = undo.passing;
g_castleRights = undo.castle;
g_move50 = undo.move50;
g_lastCastle = undo.lastCastle;
g_hash = undo.hash;
var captured = undo.captured;
if (flags & moveflagCastleKing) {
	g_board[to + 1] = g_board[to - 1];
	g_board[to - 1] = colorEmpty;
}else if (flags & moveflagCastleQueen){
	g_board[to - 2] = g_board[to + 1];
	g_board[to + 1] = colorEmpty;
}
if (flags & moveflagPromotion) {
	piece = (g_board[to] & (~0x7)) | piecePawn;
	g_board[fr] = piece;
}else g_board[fr] = g_board[to];
if(flags & moveflagPassing){
	capi = whiteTurn ? to - 16 : to + 16;
	g_board[to] = colorEmpty;
}
g_board[capi] = captured;
if(captured & 7)
	g_phase++;
whiteTurn ^= 1;
g_moveNumber--;
}

var bsIn = -1;
var bsFm = '';
var bsPv = '';

function Quiesce(mu,depth,depthL,alpha,beta,score){
var myMobility = adjMobility;
var n = mu.length;;
var alphaDe = 0;
var alphaFm = '';
var alphaPv = '';
if(alpha < score)
	alpha = score;
if(alpha >= beta)
	alpha = score;
else while(n--){
	if(!(++g_totalNodes & 0x1fff))	
		g_stop = ((g_timeout && (Date.now() - g_startTime > g_timeout)) ||  (g_nodeout && (g_totalNodes > g_nodeout)));
	var cm = mu[n];
	MakeMove(cm);
	var me = GenerateAllMoves(whiteTurn,true);
	var osScore = myMobility - adjMobility;
	g_depth = 0;
	g_pv = '';
	if(g_inCheck)
		osScore = -0xffff;
	else if(depth < depthL)
		osScore = -Quiesce(me,depth + 1,depthL,-beta,-alpha,-osScore);
	UnmakeMove(cm);
	if(g_stop)return -0xffff;
	if(alpha < osScore){
		alpha = osScore;
		alphaDe = g_depth + 1;
		alphaFm = FormatMove(cm);
		alphaPv = alphaFm + ' ' + g_pv;
	}
	if(alpha >= beta)break;
}	
g_depth = alphaDe;
g_pv = alphaPv;
return alpha;
}

function GetScore(mu,depth,depthL,alpha,beta){
var myInsufficient = adjInsufficient;
var myMobility = adjMobility;	
var check = 0;
var n = mu.length;;
var myMoves = n;
var alphaDe = 0;
var alphaFm = '';
var alphaPv = '';
while(n--){
	if(!(++g_totalNodes & 0x1fff))	
		g_stop = ((depthL > 1) && ((g_timeout && (Date.now() - g_startTime > g_timeout)) ||  (g_nodeout && (g_totalNodes > g_nodeout))));
	var cm = mu[n];
	MakeMove(cm);
	var me = GenerateAllMoves(whiteTurn,depth == depthL);
	g_depth = 0;
	g_pv = '';
	var osScore = myMobility - adjMobility;
	if(g_inCheck){
		myMoves--;
		osScore = -0xffff;
	}else if((g_move50 > 99) || IsRepetition() || ((myInsufficient  || osScore < 0 ) && adjInsufficient))
		osScore = 0;
	else if(depth < depthL)
		osScore = -GetScore(me,depth + 1,depthL,-beta,-alpha);
	else
		osScore =  -Quiesce(me,1,depthL,-beta,-alpha,-osScore);
	UnmakeMove(cm);
	if(g_stop)return -0xffff;
	if(alpha < osScore){
		alpha = osScore;
		alphaFm = FormatMove(cm);
		alphaPv = alphaFm + ' ' + g_pv;
		alphaDe = g_depth + 1;
		if(depth == 1){
			if(osScore > 0xf000)
				g_scoreFm = 'mate ' + ((0xffff - osScore) >> 1);
			else if(osScore < -0xf000)
				g_scoreFm = 'mate ' + ((-0xfffe - osScore) >> 1);
			else
				g_scoreFm = 'cp ' + (osScore >> 2);
			bsIn = n;
			bsFm = alphaFm;
			bsPv = alphaPv;
			var time = Date.now() - g_startTime;
			var nps = Math.floor((g_totalNodes / time) * 1000);
			postMessage('info currmove ' + bsFm + ' currmovenumber ' + n + ' nodes ' + g_totalNodes + ' time ' + time + ' nps ' + nps + ' depth ' + g_depthout + ' seldepth ' + alphaDe + ' score ' + g_scoreFm + ' pv ' + bsPv);
		}
	}
	if(alpha >= beta)break;
}
if(!myMoves){
	GenerateAllMoves(whiteTurn ^ 1,true);
	if(!g_inCheck)alpha = 0;else alpha = -0xffff + depth;
}
g_depth = alphaDe;
g_pv = alphaPv;
return alpha;
}

function Search(depth,time,nodes){
var mu = GenerateAllMoves(whiteTurn,false);
var myInsufficient = adjInsufficient;
var myMobility = adjMobility;
var m1 = mu.length - 1;
g_stop = false;
g_totalNodes = 0;
g_depthout = depth ? depth : 1;
g_timeout = time;
g_nodeout = nodes;
do{
	bsIn = m1;
	adjInsufficient = myInsufficient;
	adjMobility = myMobility;
	var os = GetScore(mu,1,g_depthout,-0xffff,0xffff);
	if(bsIn != m1){
		var m = mu[m1];
		mu[m1] = mu[bsIn];
		mu[bsIn] = m;
	}
	if((g_depth < g_depthout++) || (os < - 0xf000) || (os > 0xf000))break;
}while((!depth || (g_depthout < depth)) && !g_stop && m1);
var time = Date.now() - g_startTime;
var nps = Math.floor((g_totalNodes / time) * 1000);
var ponder = bsPv.split(' ');
var pm = ponder.length > 1 ? ' ponder ' + ponder[1] : '';
postMessage('info nodes ' + g_totalNodes + ' time ' + time + ' nps ' + nps);
postMessage('bestmove ' + bsFm + pm);
return true;
}

var cUndo = function(){
this.captured = g_captured;
this.hash = g_hash;	
this.passing = g_passing;
this.castle = g_castleRights;
this.move50 = g_move50;
this.lastCastle = g_lastCastle;
}

Initialize();

function GetNumber(msg,re,def){
var r = re.exec(msg);
return r ? r[1] | 0 : def;
}

onmessage = function(e){
(/^(.*?)\n?$/).exec(e.data);
var msg = RegExp.$1;
if(msg == 'uci'){
	postMessage('id name Rapsimple ' + version);
	postMessage('id author Thibor Raven');
	postMessage('uciok');
}else if (msg == 'isready') postMessage('readyok');
else if ((/^position (?:(startpos)|fen (.*?))\s*(?:moves\s*(.*))?$/).exec(msg)){
	InitializeFromFen((RegExp.$1 == 'startpos') ? '' : RegExp.$2);
	if(RegExp.$3){
		var m =  (RegExp.$3).split(' ');
		for(var i = 0;i < m.length;i++)
			MakeMove(GetMoveFromString(m[i]));
	}
}else if((/^go /).exec(msg)){
	g_startTime = Date.now();
	var t = GetNumber(msg,/movetime (\d+)/,0);
	var d = GetNumber(msg,/depth (\d+)/,0);
	var n = GetNumber(msg,/nodes (\d+)/,0);
	if(!t && !d && !n){
		var ct = whiteTurn ? GetNumber(msg,/wtime (\d+)/,0) : GetNumber(msg,/btime (\d+)/,0);
		var ci = whiteTurn ? GetNumber(msg,/winc (\d+)/,0) : GetNumber(msg,/binc (\d+)/,0);
		var mg = GetNumber(msg,/movestogo (\d+)/,32);
		t = Math.floor(ct / mg) + ci - 0xff;
	}
	Search(d,t,n);
}
}

var version = '18-02-01';
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
var g_baseEval = 0;
var g_captured = 0;
var g_castleRights = 0xf;
var g_depth = 0;
var g_passing = 0;
var g_move50 = 0;
var g_moveNumber = 0;
var g_pv = '';
var g_totalNodes = 0;
var g_startTime = 0;
var g_inCheck = false;
var g_depthout = 0;
var g_timeout = 0;
var g_nodeout = 0;
var g_stop = false;
var g_scoreFm = '';
var g_lastCastle = 0;
var undoStack = [];
var arrField = [];
var g_board = new Array(256);
var boardCheck = new Array(256);
var boardCastle = new Array(256);
var whiteTurn = 1;
var usColor = 0;
var enColor = 0;
var eeColor = 0;
var arrMaterial = [0,100,300,300,500,800,0xffff];

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
var moves = GenerateAllMoves(whiteTurn);
for (var i = 0; i < moves.length; i++){
	if (FormatMove(moves[i]) == moveString)
		return moves[i];
}
}

function Initialize(){
arrField = [];
for(var n = 0; n < 256; n++){
	boardCheck[n] = 0;
	boardCastle[n]=15;
	g_board[n] = 0;
}
for(var y = 0;y < 8; y++)
	for(var x = 0;x < 8;x++)
		arrField.push((y + 4) * 16 + x + 4);
for(var n = 0;n < 6;n++){
	boardCastle[[68,72,75,180,184,187][n]] = [7,3,11,13,12,14][n];
	boardCheck[[71,72,73,183,184,185][n]] = [colorBlack | moveflagCastleQueen,colorBlack | maskCastle,colorBlack | moveflagCastleKing,colorWhite | moveflagCastleQueen,colorWhite | maskCastle,colorWhite | moveflagCastleKing][n];
}
}

function InitializeFromFen(fen){
g_baseEval = 0;
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
		var m = arrMaterial[piece & 7];
		g_baseEval += isWhite ? m : -m;
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
if(!whiteTurn){
	g_moveNumber++;
	g_baseEval = -g_baseEval;
}
undoStack=[];
}

function GenerateMove(moveStack,fr,to,add,flags){
if(add)
	moveStack[moveStack.length] = fr | (to << 8) | flags;
if(((g_board[to] & 7) == pieceKing) || (((boardCheck[to] & g_lastCastle) == g_lastCastle)&&(g_lastCastle & maskCastle)))
	g_inCheck = true;
}

function GenerateAllMoves(wt){
g_inCheck = false;	
usColor = wt ?  colorWhite : colorBlack;
enColor = wt ? colorBlack : colorWhite;
eeColor = enColor | colorEmpty;
var moves = [];
var to,del;
var color = wt ? 0 : 0x8;
for(var n = 0;n < 64;n++){
	var fr = arrField[n];
	var f = g_board[fr];
	if(f & usColor)f &= 7;else continue;
	switch(f){
		case 1:
		del = wt ? -16 : 16;
		to = fr + del;
		if(g_board[to] & colorEmpty){
			GeneratePwnMoves(moves,fr,to,true)
			if((!g_board[fr-del-del]) && ((g_board[to+del] & colorEmpty)))
				GeneratePwnMoves(moves,fr,to+del,true);
		}
		if(g_board[to - 1] & enColor)GeneratePwnMoves(moves,fr,to - 1,true);
		else if((to - 1) == g_passing)GeneratePwnMoves(moves,fr,g_passing,true,moveflagPassing);
		else if(g_board[to - 1] & colorEmpty)GeneratePwnMoves(moves,fr,to - 1,false);
		if(g_board[to + 1] & enColor)GeneratePwnMoves(moves,fr,to + 1,true);
		else if((to + 1) == g_passing)GeneratePwnMoves(moves,fr,g_passing,true,moveflagPassing);
		else if(g_board[to + 1] & colorEmpty)GeneratePwnMoves(moves,fr,to + 1,false);
		break;
		case 2:
		GenerateShrMoves(moves,fr,[14,-14,18,-18,31,-31,33,-33]);
		break;
		case 3:
		GenerateStdMoves(moves,fr,[15,-15,17,-17]);
		break;
		case 4:
		GenerateStdMoves(moves,fr,[1,-1,16,-16]);
		break;
		case 5:
		GenerateStdMoves(moves,fr,[1,-1,15,-15,16,-16,17,-17]);
		break;
		case 6:
		GenerateShrMoves(moves,fr,[1,-1,15,-15,16,-16,17,-17]);
		var cr = wt ? g_castleRights : g_castleRights >> 2;
		if (cr & 1)
			if(g_board[fr + 1] == colorEmpty && g_board[fr + 2] == colorEmpty)
				GenerateMove(moves,fr,fr + 2,true,moveflagCastleKing);
		if (cr & 2)
			if(g_board[fr - 1] == colorEmpty && g_board[fr - 2] == colorEmpty && g_board[fr - 3] == colorEmpty)
				GenerateMove(moves,fr,fr - 2,true,moveflagCastleQueen);
		break;
	}
}
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

function GenerateShrMoves(moves,fr,dir){
for(var n = 0;n < dir.length;n++){
	var to = fr + dir[n];
	if(g_board[to] & eeColor)
		GenerateMove(moves,fr,to,true);
}
}

function GenerateStdMoves(moves,fr,dir){
for(var n=0;n<dir.length;n++){
	var to = fr + dir[n];
	while (g_board[to] & colorEmpty){
		GenerateMove(moves,fr,to,true);
		to += dir[n];
	}
	if (g_board[to] & enColor)
		GenerateMove(moves,fr,to,true);
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
undoStack.push(new cUndo());
g_passing = 0;
var capturedType = g_captured & 0xF;
if(capturedType){
	g_baseEval += arrMaterial[g_captured & 7];
	g_move50 = 0;
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
	g_baseEval -= arrMaterial[piece & 7];
	g_baseEval += arrMaterial[newPiece & 7];
}else
	g_board[to] = g_board[fr];
g_board[fr] = colorEmpty;
g_castleRights &= boardCastle[fr] & boardCastle[to];
g_baseEval = -g_baseEval;
whiteTurn ^= 1;
g_moveNumber++;
}

function UnmakeMove(move){
var fr = move & 0xFF;
var to = (move >> 8) & 0xFF;
var flags = move & 0xFF0000;
var piece = g_board[to];
var capi = to;
var undo = undoStack[undoStack.length-1];
undoStack.pop();
g_passing = undo.passing;
g_castleRights = undo.castle;
g_move50 = undo.move50;
g_baseEval = undo.value;
g_lastCastle = undo.lastCastle;
var captured=undo.captured;
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
whiteTurn ^= 1;
g_moveNumber--;
}

var bsIn = -1;
var bsFm = '';
var bsPv = '';

function GetScore(mu,enMobility,depth,depthL,alpha,beta){
var check = 0;
var myMobility = mu.length;
var n = myMobility;
var myMoves = n;
var alphaDe = 0;
var alphaFm = '';
var alphaPv = '';
while(n--){
	if(!(++g_totalNodes & 0x1fff))	
		g_stop = ((depthL > 1) && ((g_timeout && (Date.now() - g_startTime > g_timeout)) ||  (g_nodeout && (g_totalNodes > g_nodeout))));
	var cm = mu[n];
	var to = (cm >> 8) & 0xFF;
	var toPie = g_board[to] & 0x7;
	MakeMove(cm);
	g_depth = 0;
	g_pv = '';
	var osScore = -g_baseEval + myMobility - enMobility;
	if(g_move50 > 99)
		osScore = 0;
	else if((depth < depthL) || toPie){
		var me = GenerateAllMoves(whiteTurn);
		if(g_inCheck){
			myMoves--;
			osScore = -0xffff;
		}else
			osScore = -GetScore(me,myMobility,depth + 1,depthL,-beta,-alpha);
	}
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
	GenerateAllMoves(whiteTurn ^ 1);
	if(!g_inCheck)alpha = 0;else alpha = -0xffff + depth;
}
g_depth = alphaDe;
g_pv = alphaPv;
return alpha;
}

function Search(depth,time,nodes){
var mu = GenerateAllMoves(whiteTurn);
var myMobility = mu.length;
var m1 = mu.length - 1;
g_stop = false;
g_totalNodes = 0;
g_depthout = depth ? depth : 1;
g_timeout = time;
g_nodeout = nodes;
do{
	bsIn = m1;
	var os = GetScore(mu,myMobility,1,g_depthout,-0xffff,0xffff);
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
this.passing = g_passing;
this.castle = g_castleRights;
this.move50 = g_move50;
this.value = g_baseEval;
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
	postMessage('id name Rapshort ' + version);
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

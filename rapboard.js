var piecePawn = 0x01;
var pieceKnight = 0x02;
var pieceBishop = 0x03;
var pieceRook = 0x04;
var pieceQueen = 0x05;
var pieceKing = 0x06;
var colorBlack = 0x08;
var colorWhite = 0x10;
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
var g_castleRights = 0xf; //&1 = wk, &2 = wq, &4 = bk, &8 = bq
var g_passing = 65;
var g_move50 = 0;
var g_moveNumber = 0;
var g_totalNodes = 0;
var g_startTime = 0;
var g_inCheck = false;
var g_depthout = 0;
var g_timeout = 0;
var g_nodeout = 0;
var g_stop = false;
var g_scoreFm = '';
var g_lastCastle = 0;
var g_phase = 32;
var undoStack = [];
var g_board =  new Array(65);
var g_pieceIndex = new Array(256);
var g_pieceList = new Array(2 * 8 * 16);
var g_pieceCount = new Array(2 * 8);
var g_destiny = new Array(8);
var whiteTurn = true;
var colorMy = colorWhite;
var colorEnemy = colorBlack;
var his = [];
boardCastle =[
 7,15,15,15, 3,15,15,11,
15,15,15,15,15,15,15,15,
15,15,15,15,15,15,15,15,
15,15,15,15,15,15,15,15,
15,15,15,15,15,15,15,15,
15,15,15,15,15,15,15,15,
15,15,15,15,15,15,15,15,
13,15,15,15,12,15,15,14];
boardCheck = [
0,0,0,colorBlack | moveflagCastleQueen,colorBlack | maskCastle,colorBlack | moveflagCastleKing,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,colorWhite | moveflagCastleQueen,colorWhite | maskCastle,colorWhite | moveflagCastleKing,0,0];
var tmpCenter = [[4,2],[8,8],[4,8],[-8,8],[8,0xf],[-8,8]];
var tmpMaterial = [[171,240],[764,848],[826,891],[1282,1373],[2526,2646],[0xffff,0xffff]];  
var tmpPassed = [[5,7],[5,14],[31,38],[73,73],[166,166],[252,252]];  
var tmpMobility = [
[[-4,-4],[0,0],[1,1],[2,2],[4,4],[4,4],[4,4],[4,4],[4,4],[4,4],[4,4],[4,4]],//pawn
[[-75,-76],[-57,-54],[-9,-28],[-2,-10],[6,5],[14,12],[22, 26],[29,29],[36, 29]],//knight
[[-48,-59],[-20,-23],[16, -3],[26, 13],[38, 24],[51, 42],[55, 54],[63, 57],[63, 65],[68, 73],[81, 78],[81, 86],[91, 88],[98, 97]],//bishop
[[-58,-76],[-27,-18],[-15, 28],[-10, 55],[-5, 69],[-2, 82],[9,112],[16,118],[30,132],[29,142],[32,155],[38,165],[46,166],[48,169],[58,171]],//rook
[[-39,-36],[-21,-15],[3,  8],[3, 18],[14, 34],[22, 54],[28, 61],[41, 73],[43, 79],[48, 92],[56, 94],[60,104],[60,113],[66,120],[67,123],[70,126],[71,133],[73,136],[79,140],[88,143],[88,148],[99,166],[102,170],[102,175],[106,184],[109,191],[113,206],[116,212]],//queen
[[90,9],[80,8],[70,7],[60,6],[50,5],[40,4],[30,3],[20,2],[10,1]]];//king
var arrMobility = [];
var adjMobility = 0;
var pieceValue = [];
var optCenter = 0;

function StrToSquare(s){
var f = {a:0,b:1,c:2,d:3,e:4,f:5,g:6,h:7};
var x = f[s.charAt(0)];
var y = 8 - parseInt(s.charAt(1));
return (y << 3) | x;
}

function FormatSquare(s){
return ['a','b','c','d','e','f','g','h'][s & 0x7] + (8 - (s >> 3));
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


function GetMoveFromString(s){
var moves = GenerateAllMoves(whiteTurn);
for(var i = 0; i < moves.length; i++)
	if(FormatMove(moves[i]) == s)
		return moves[i];
}

function GetFenCore(){
var result = '';
for(var row = 0; row < 8;row++){
	if (row != 0)
		result += '/';
	var empty = 0;
	for (var col = 0; col < 8; col++) {
		var piece = g_board[(row << 3) + col];
		if (!piece)
			empty++;
		else {
			if (empty != 0)
				result += empty;
			empty = 0;
			var pieceChar = [' ','p','n','b','r','q','k',' '][(piece & 7)];
			result += ((piece & colorWhite) != 0) ? pieceChar.toUpperCase() : pieceChar;
		}
	}
	if (empty != 0)
		result += empty;
}
return result;
}

function IsRepetition(){
var fen = GetFenCore();
for(var n = his.length - 2;n >= his.length - g_move50 + 1;n -= 2)
	if(his[n] == fen)
		return true;
return false;
}

function Initialize(){
for(var n = 0;n < 8;n++)
	g_destiny[n] =  new Array(64);
for(var p = 0;p < 6;p++){
	arrMobility[p] = [];
	for(var ph = 2;ph < 33;ph++){
		var f = (ph - 2) / 32;
		arrMobility[p][ph] = [];
		for(var m = 0;m < tmpMobility[p].length;m++){
			var a = tmpMobility[p][m][0];
			var b = tmpMobility[p][m][1];
			var v = Math.floor(a * f + b * (1 - f));
			arrMobility[p][ph][m] = v;
		}
	}
}
for(var ph = 2;ph < 33;ph++){
	pieceValue[ph] = [];
	for(var p = 0;p < 16;p++)
		pieceValue[ph][p]= new Array(64);
}
for(var n = 0; n < 64; n++){
	var x = n & 7;
	var y = n >> 3;
	var nb = ((7 - y) << 3) + x;
	var cx = Math.min(x,7 - x) + 1;
	var cy = Math.min(y,7 - y) + 1;
	var center = (cx * cy) - 1;
		if(y > 0 && y < 7){
			GeneratePwnDestiny(0,n,x,y,1);//pawn black
			GeneratePwnDestiny(1,n,x,y,-1);//pawn white
		}
		GenerateShrDestiny(2,n,x,y,[{x:2,y:-1},{x:2,y:1},{x:-2,y:-1},{x:-2,y:1},{x:-1,y:2},{x:1,y:2},{x:-1,y:-2},{x:1,y:-2}]);//knight
		GenerateShrDestiny(6,n,x,y,[{x:1,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]);//king
		GenerateStdDestiny(3,n,x,y,[{x:1,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1}]);//bishop
		GenerateStdDestiny(4,n,x,y,[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]);//rook
		GenerateStdDestiny(5,n,x,y,[{x:1,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]);//queen		
		for(var ph = 2;ph < 33;ph++){
			var f = (ph - 2) / 32;
			for(var p = 1;p < 7;p++){
				var v = Math.floor(tmpMaterial[p - 1][0] * f + tmpMaterial[p - 1][1] * (1 - f));
				var a = tmpCenter[p - 1][0];
				var b = tmpCenter[p - 1][1];
				a = optCenter > 0 ? a << optCenter : a >> optCenter;
				b = optCenter > 0 ? b << optCenter : b >> optCenter;
				v  += Math.floor((a * f + b * (1 - f)) * center);
				pieceValue[ph][p][n] = v;
				pieceValue[ph][p | 8][nb] = v;
				if(p == 1 && y > 0 && y < 7){
					var py = 6 - y;
					a = tmpPassed[py][0];
					b = tmpPassed[py][1];
					v = Math.floor(a * f + b * (1 - f));
					pieceValue[ph][p][n] += v;
					pieceValue[ph][p | 8][nb] += v;
				}
			}
		}
}
}

function InitializeFromFen(fen){
for(var n = 0;n < 65;n++)
	g_board[n] = 0;
g_phase = 0;
if(!fen)fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
var chunks = fen.split(' ');
var x = 0;
var y = 0;
var pieces = chunks[0];
for(var i = 0;i < pieces.length;i++){
	var c = pieces.charAt(i);
	if (c == '/') {
		y++;
		x = 0;
	}else if(c >= '0' && c <= '9'){
		for(var j = 0;j < parseInt(c);j++)
			x++;
	}else{
		g_phase++;
		var b = c.toLowerCase();
		var piece = b == c ? colorBlack : colorWhite;
		var index = (y << 3) + x;
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
		x++;
	}
}
whiteTurn = chunks[1].charAt(0) == 'w';
g_castleRights = 0;
if (chunks[2].indexOf('K') != -1)
	g_castleRights |= 1;
if (chunks[2].indexOf('Q') != -1)
	g_castleRights |= 2;
if (chunks[2].indexOf('k') != -1)
	g_castleRights |= 4;
if (chunks[2].indexOf('q') != -1)
	g_castleRights |= 8;
g_passing = 65;
if (chunks[3].indexOf('-') == -1)
	g_passing = StrToSquare(chunks[3]);
g_move50 = parseInt(chunks[4]);
g_moveNumber = parseInt(chunks[5]);
if(g_moveNumber)g_moveNumber--;
g_moveNumber *= 2;
if(!whiteTurn)g_moveNumber++;
undoStack=[];
InitializePieceList();
}

function InitializePieceList(){
g_baseEval = 0;
for(var i = 0; i < 16; i++){
	g_pieceCount[i] = 0;
	for (var j = 0;j < 16;j++)
		g_pieceList[(i << 4) | j] = 65;
}
for(var i = 0;i < 64;i++){
	g_pieceIndex[i] = 0;
	var piece = g_board[i] & 0xF;
	if(piece){
		g_pieceList[(piece << 4) | g_pieceCount[piece]] = i;
		g_pieceIndex[i] = g_pieceCount[piece];
		g_pieceCount[piece]++;
		if (piece & colorBlack)
			g_baseEval -= pieceValue[g_phase][piece][i];
		else
			g_baseEval += pieceValue[g_phase][piece][i];
	}
}
if (!whiteTurn) g_baseEval = -g_baseEval;
}

var countNA = 0;

function GenerateMove(moves,fr,to,add,flag){
var p = g_board[to] & 7;
if(add){
	var m = fr | (to << 8) | flag;
	if(p)
		moves[moves.length] = m;
	else{
		moves[moves.length] = moves[countNA];
		moves[countNA++] = m;
	}
		
}
if((p == pieceKing) || (((boardCheck[to] & g_lastCastle) == g_lastCastle)&&(g_lastCastle & maskCastle)))
	g_inCheck = true;
}

function GenerateMovePwn(moves,fr,to,add,flag){
var y = to >> 3;
if (((y == 0) || (y == 7)) && add){
	GenerateMove(moves,fr,to,add,moveflagPromoteQueen);
	GenerateMove(moves,fr,to,add,moveflagPromoteRook);
	GenerateMove(moves,fr,to,add,moveflagPromoteBishop);
	GenerateMove(moves,fr,to,add,moveflagPromoteKnight);
}else
	GenerateMove(moves,fr,to,add,flag);
}

function GenerateAllMoves(wt){
g_inCheck = false;	
adjMobility = 0;
countNA = 0;
var ml = 0;
colorMy = wt ? colorWhite : colorBlack;
colorEnemy = wt ? colorBlack : colorWhite;
var moves = [];
var fr,pieceIdx;
var color = wt ? 0 : 8;
var p = wt ? 1 : 0;
pieceIdx = (color | 1) << 4;//pawn
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	ml = moves.length;
	GeneratePwnMoves(moves,fr,g_destiny[p][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[0][g_phase][moves.length - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 2) << 4;//knight
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	ml = moves.length;
	GenerateShrMoves(moves,fr,g_destiny[2][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[1][g_phase][moves.length - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 3) << 4;//bishop
fr = g_pieceList[pieceIdx++];
while (g_board[fr]){
	ml = moves.length;
	GenerateStdMoves(moves,fr,g_destiny[3][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[2][g_phase][moves.length - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 4) << 4;//rook
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	ml = moves.length;
	GenerateStdMoves(moves,fr,g_destiny[4][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[3][g_phase][moves.length - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 5) << 4;//queen
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	ml = moves.length;
	GenerateStdMoves(moves,fr,g_destiny[5][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[4][g_phase][moves.length - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 6) << 4;//king
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	ml = moves.length;
	GenerateShrMoves(moves,fr,g_destiny[6][fr]);
	var cr = wt ? g_castleRights : g_castleRights >> 2;
	if (cr & 1)
		if((!g_board[fr + 1]) && (!g_board[fr + 2]))
			GenerateMove(moves,fr,fr + 2,true,moveflagCastleKing);
	if (cr & 2)
		if((!g_board[fr - 1]) && (!g_board[fr - 2]) && (!g_board[fr - 3]))
			GenerateMove(moves,fr,fr - 2,true,moveflagCastleQueen);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[5][g_phase][moves.length - ml];
	if(g_inCheck)return [];
}
return moves;
}

function GeneratePwnDestiny(piece,fr,x,y,dy){
g_destiny[piece][fr] = [[],[]];	
var to = ((y + dy) << 3) + x;
g_destiny[piece][fr][0].push(to);
if((y == 1) && (dy == 1))
	g_destiny[piece][fr][0].unshift(to + 8);
if((y == 6) && (dy == -1))
	g_destiny[piece][fr][0].unshift(to - 8);
if(x < 7)
	g_destiny[piece][fr][1].push(to + 1);
if(x > 0)
	g_destiny[piece][fr][1].push(to - 1);
}

function GeneratePwnMoves(moves,fr,des){
var n = des[0].length;
while(n--){
	var to = des[0][n];
	if(!g_board[to])
		GenerateMovePwn(moves,fr,to,true);
	else
		break;
}
var n = des[1].length;
while(n--){
	var to = des[1][n];
	if(g_board[to] & colorEnemy)
		GenerateMovePwn(moves,fr,to,true);
	else
		if(to == g_passing)
			GenerateMove(moves,fr,to,true,moveflagPassing);
}
}

function GenerateShrDestiny(piece,fr,x,y,dir){
g_destiny[piece][fr] = [];	
for(var n = 0;n < dir.length;n++){
	var d = dir[n];
	var cx = x + d.x;
	var cy = y + d.y;
	if(cx < 0 || cy < 0 || cx > 7 || cy > 7)continue;
	var to = (cy << 3) + cx;
	g_destiny[piece][fr].push(to);
}
}

function GenerateShrMoves(moves,fr,des){
var n = des.length;
while(n--){
	var to = des[n];
	if(!(g_board[to] & colorMy))
		GenerateMove(moves,fr,to,true);
}
}	

function GenerateStdDestiny(piece,fr,x,y,dir){
g_destiny[piece][fr] = [];	
for(var n = 0;n < dir.length;n++){
	var d = dir[n];
	var cx = x + d.x;
	var cy = y + d.y;
	var a = [];
	while((cx >= 0) && (cy >= 0) && (cx <= 7) && (cy <= 7)){
		var to = (cy << 3) + cx;
		a.unshift(to);
		cx += d.x;
		cy += d.y;
	}
	g_destiny[piece][fr].push(a);
}	
}

function GenerateStdMoves(moves,fr,des){
var n = des.length;
while(n--){
	var a = des[n];
	var d = a.length;
	while(d--){
		var to = a[d];
		if(!g_board[to])
			GenerateMove(moves,fr,to,true);
		else{
			if(g_board[to] & colorEnemy){
				GenerateMove(moves,fr,to,true);
			}
			break;
		}
	}
}
}

function MakeMove(move){
var fr = move & 0xFF;
var to = (move >> 8) & 0xFF;
var flags = move & 0xFF0000;
var piecefr = g_board[fr];
var piece = piecefr & 0xf;
var captured = g_board[to];
var capi = to;
g_lastCastle = (move & maskCastle) | (piecefr & maskColor);
if(flags & moveflagCastleKing){
	var rook = g_board[to + 1];
	g_board[to - 1] = rook;
	g_board[to + 1] = 0;
	var rookIndex = g_pieceIndex[to + 1];
	g_pieceIndex[to - 1] = rookIndex;
	g_pieceList[((rook & 0xF) << 4) | rookIndex] = to - 1;
}else if(flags & moveflagCastleQueen){
	var rook = g_board[to - 2];
	g_board[to + 1] = rook;
	g_board[to - 2] = 0;
	var rookIndex = g_pieceIndex[to - 2];
	g_pieceIndex[to + 1] = rookIndex;
	g_pieceList[((rook & 0xF) << 4) | rookIndex] = to + 1;
}else if(flags & moveflagPassing){
	capi = whiteTurn ? to + 8 : to - 8;
	captured = g_board[capi];
	g_board[capi] = 0;
}
undoStack.push(new cUndo(g_passing,g_castleRights,g_move50,captured,g_baseEval,g_lastCastle));
g_passing = 65;
var capturedType = captured & 0xF;
if (capturedType){
	g_pieceCount[capturedType]--;
	var lastPieceSquare = g_pieceList[(capturedType << 4) | g_pieceCount[capturedType]];
	g_pieceIndex[lastPieceSquare] = g_pieceIndex[capi];
	g_pieceList[(capturedType << 4) | g_pieceIndex[lastPieceSquare]] = lastPieceSquare;
	g_pieceList[(capturedType << 4) | g_pieceCount[capturedType]] = 65;
	g_baseEval += pieceValue[g_phase][capturedType][to];
	g_move50 = 0;
	g_phase--;
}else if((piece & 7) == piecePawn) {
	if (to == (fr + 16)) g_passing = (fr + 8);
	if (to == (fr - 16)) g_passing = (fr - 8);
	g_move50 = 0;
}else
	g_move50++;
g_pieceIndex[to] = g_pieceIndex[fr];
g_pieceList[((piece) << 4) | g_pieceIndex[to]] = to;
if (flags & moveflagPromotion){
	var newPiece = piecefr & (~0x7);
	if (flags & moveflagPromoteQueen)
		newPiece |= pieceQueen;
	else if (flags & moveflagPromoteRook)
		newPiece |= pieceRook;
	else if (flags & moveflagPromoteBishop)
		newPiece |= pieceBishop;
	else
		newPiece |= pieceKnight;
	g_board[to] = newPiece;
	var promoteType = newPiece & 0xF;
	g_pieceCount[piece]--;
	var lastPawnSquare = g_pieceList[(piece << 4) | g_pieceCount[piece]];
	g_pieceIndex[lastPawnSquare] = g_pieceIndex[to];
	g_pieceList[(piece << 4) | g_pieceIndex[lastPawnSquare]] = lastPawnSquare;
	g_pieceList[(piece << 4) | g_pieceCount[piece]] = 65;
	g_pieceIndex[to] = g_pieceCount[promoteType];
	g_pieceList[(promoteType << 4) | g_pieceIndex[to]] = to;
	g_pieceCount[promoteType]++;
	g_baseEval -= pieceValue[g_phase][piece][fr];
	g_baseEval += pieceValue[g_phase][promoteType][to];
}else{
	g_board[to] = g_board[fr];
	g_baseEval -= pieceValue[g_phase][piece][fr];
	g_baseEval += pieceValue[g_phase][piece][to];
}
g_board[fr] = 0;
g_castleRights &= boardCastle[fr] & boardCastle[to];
g_baseEval = -g_baseEval;
whiteTurn =! whiteTurn;
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
var captured = undo.captured;
if (flags & moveflagCastleKing) {
	var rook = g_board[to - 1];
	g_board[to + 1] =  rook;
	g_board[to - 1] = 0;
	var rookIndex = g_pieceIndex[to - 1];
	g_pieceIndex[to + 1] = rookIndex;
	g_pieceList[((rook & 0xF) << 4) | rookIndex] = to + 1;
}else if (flags & moveflagCastleQueen){
	var rook = g_board[to + 1];
	g_board[to - 2] =  rook;
	g_board[to + 1] = 0;
	var rookIndex = g_pieceIndex[to + 1];
	g_pieceIndex[to - 2] = rookIndex;
	g_pieceList[((rook & 0xF) << 4) | rookIndex] = to - 2;
}
if (flags & moveflagPromotion) {
	piece = (g_board[to] & (~0x7)) | piecePawn;
	g_board[fr] = piece;
	var pawnType = g_board[fr] & 0xF;
	var promoteType = g_board[to] & 0xF;
	g_pieceCount[promoteType]--;
	var lastPromoteSquare = g_pieceList[(promoteType << 4) | g_pieceCount[promoteType]];
	g_pieceIndex[lastPromoteSquare] = g_pieceIndex[to];
	g_pieceList[(promoteType << 4) | g_pieceIndex[lastPromoteSquare]] = lastPromoteSquare;
	g_pieceList[(promoteType << 4) | g_pieceCount[promoteType]] = 65;
	g_pieceIndex[to] = g_pieceCount[pawnType];
	g_pieceList[(pawnType << 4) | g_pieceIndex[to]] = to;
	g_pieceCount[pawnType]++;
}else g_board[fr] = g_board[to];
if(flags & moveflagPassing){
	capi = whiteTurn ? to - 8:to + 8;
	g_board[to] = 0;
}
g_board[capi] = captured;
g_pieceIndex[fr] = g_pieceIndex[to];
g_pieceList[((piece & 0xF) << 4) | g_pieceIndex[fr]] = fr;
var captureType = captured & 0xF;
if (captureType){
	g_pieceIndex[capi] = g_pieceCount[captureType];
	g_pieceList[(captureType << 4) | g_pieceCount[captureType]] = capi;
	g_pieceCount[captureType]++;
	g_phase++;
}
whiteTurn =! whiteTurn;
g_moveNumber--;
}

var bsIn = -1;
var bsFm = '';
var bsPv = '';

function Quiesce(mu,depth,depthL,alpha,beta,score){
var n = mu.length;
var alphaDe = 0;
var alphaFm = '';
var alphaPv = '';
var myMobility = adjMobility;
if(alpha < score)
	alpha = score;
if(alpha >= beta)
	alpha = score;
else while(n--){
	if(!(++g_totalNodes & 0x1ffff))	
		g_stop = ((depthL > 1) && ((g_timeout && (Date.now() - g_startTime > g_timeout)) ||  (g_nodeout && (g_totalNodes > g_nodeout))));
	if(g_stop){
		alpha = -0xffff;
		break;
	}
	var cm = mu[n];
	var to = (cm >> 8) & 0xFF;
	var toPie = g_board[to] & 0x7;
	if(!toPie)break;
	MakeMove(cm);
	var me = GenerateAllMoves(whiteTurn);
	var osPv = '';
	var osDe = 0;
	var osScore = -g_baseEval + myMobility - adjMobility;
	if(g_inCheck)
		osScore = -0xffff;
	else if(depth < depthL){
		var os = Quiesce(me,depth + 1,depthL,-beta,-alpha,-osScore);
		osScore = -os.score;
		osPv = ' ' + os.pv;
		osDe = os.depth;
	}
	UnmakeMove(cm);
	if((!g_stop)&&(alpha < osScore)){
		alpha = osScore;
		alphaDe = osDe + 1;
		alphaFm = FormatMove(cm);
		alphaPv = alphaFm + osPv;
	}
	if(alpha >= beta)break;
}	
return {score:alpha,depth:alphaDe,pv:alphaPv};
}

function GetScore(mu,depth,depthL,alpha,beta){
var check = 0;
var n = mu.length;
var noCheck = n;
var alphaDe = 0;
var alphaFm = '';
var alphaPv = '';
var myMobility = adjMobility;
while(n--){
	if(!(++g_totalNodes & 0x1fff))	
		g_stop = ((depthL > 1) && ((g_timeout && (Date.now() - g_startTime > g_timeout)) ||  (g_nodeout && (g_totalNodes > g_nodeout))));
	if(g_stop)return {score:-0xffff};
	var cm = mu[n];
	MakeMove(cm);
	var me = GenerateAllMoves(whiteTurn);
	var osPv = '';
	var osDe = 0;
	var osScore = -g_baseEval + myMobility - adjMobility;
	if(g_inCheck){
		noCheck--;
		osScore = -0xffff;
	}else if((g_move50 > 99) || ((depth == 1) && IsRepetition()))
		osScore = 0;
	else{
		if(depth < depthL)
			var os = GetScore(me,depth + 1,depthL,-beta,-alpha);
		else
			var os =  Quiesce(me,1,depthL,-beta,-alpha,-osScore);
		osScore = -os.score;
		osPv = ' ' + os.pv;
		osDe = os.depth;
	}
	UnmakeMove(cm);
	if((!g_stop) && (alpha < osScore)){
		alpha = osScore;
		alphaFm = FormatMove(cm);
		alphaPv = alphaFm + osPv;
		alphaDe = osDe + 1;
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
			var nps = Math.floor((g_totalNodes / (Date.now() - g_startTime)) * 1000);
			postMessage('info currmove ' + bsFm + ' currmovenumber ' + n + ' nodes ' + g_totalNodes + ' nps ' + nps + ' depth ' + g_depthout + ' seldepth ' + alphaDe + ' score ' + g_scoreFm + ' pv ' + bsPv);
		}
	}
	if(alpha >= beta)break;
}
if(!noCheck && !g_stop){
	GenerateAllMoves(!whiteTurn);
	if(!g_inCheck)alpha = 0;else alpha = -0xffff + depth;
}
return {score:alpha,depth:alphaDe,pv:alphaPv};
}

function Search(depth,time,nodes){
var mu = GenerateAllMoves(whiteTurn);
var m1 = mu.length - 1;
g_stop = false;
g_totalNodes = 0;
g_depthout = depth ? depth : 1;
g_timeout = time;
g_nodeout = nodes;
do{
	bsIn = m1;
	var os = GetScore(mu,1,g_depthout,-0xffff,0xffff);
	if(bsIn != m1){
		var m = mu[m1];
		mu[m1] = mu[bsIn];
		mu[bsIn] = m;
	}
	if((os.depth < g_depthout++) || (os.score < - 0xf000) || (os.score > 0xf000))break;
}while((!depth || (g_depthout < depth)) && !g_stop && m1);
var nps = Math.floor((g_totalNodes / (Date.now() - g_startTime)) * 1000);
var ponder = bsPv.split(' ');
var pm = ponder.length > 1 ? ' ponder ' + ponder[1] : '';
postMessage('info nodes ' + g_totalNodes + ' nps ' + nps);
postMessage('bestmove ' + bsFm + pm);
return true;
}


var cUndo=function(passing,castle,move50,captured,value,lastCastle){
this.passing = passing;
this.castle = castle;
this.move50 = move50;
this.captured = captured;
this.value = value;
this.lastCastle = lastCastle;
}

var cUci=function(){
this.tokens = [];
}

cUci.prototype.getArr = function(key, to){
var lo = 0;
var hi = 0;
for(var i=0; i < this.tokens.length; i++){
	if(this.tokens[i] == key) {
		lo = i + 1;
		hi = i;
		for (var j=lo; j < this.tokens.length; j++){
			if (this.tokens[j] == to)
				break;
			hi = j;
		}
	}
}
return {lo:lo, hi:hi};
}

cUci.prototype.getInt = function(key, def){
for (var i=0; i < this.tokens.length; i++)
	if (this.tokens[i] == key)
		if (i < this.tokens.length - 1)
			return parseInt(this.tokens[i + 1]);
return def;
}

var uci = new cUci();
Initialize();

onmessage = function(e){
(/^(.*?)\n?$/).exec(e.data);
var m = RegExp.$1;
m = m.trim();
m = m.replace(/\s+/g,' ');
uci.tokens  = m.split(' ');
switch (uci.tokens[0]){
	case 'go':
		g_startTime = Date.now();
		var t  = uci.getInt('movetime',0);
		var d = uci.getInt('depth',0);
		var n = uci.getInt('nodes',0);
		if(!t && !d && !n){
			var ct = whiteTurn ? uci.getInt('wtime',0) : uci.getInt('btime',0);
			var ci = whiteTurn ? uci.getInt('winc',0) : uci.getInt('binc',0);
			var mg = uci.getInt('movestogo',32);
			t = Math.floor(ct / mg + ci - 0xff);
		}
		Search(d,t,n);
	break;
	case 'isready':
		postMessage('readyok');
	break;
	case 'position':
		var fen='';
		var arr = uci.getArr('fen','moves');
		if (arr.lo > 0)
			for (var i=arr.lo; i <= arr.hi; i++)
				fen += uci.tokens[i]+' ';
		InitializeFromFen(fen);
		var arr = uci.getArr('moves','fen');
		his = [];
		his.push(GetFenCore());
		if(arr.lo > 0)
			for (var i=arr.lo; i <= arr.hi; i++){
				MakeMove(GetMoveFromString(uci.tokens[i]));
				his.push(GetFenCore());
			}
	break;
	case 'setoption':
		switch (uci.tokens[1]){
			case 'optCenter':
				optCenter = uci.getInt('value',optCenter);
			break;
		}
	break;
	case 'stop':
		g_stop = true;
	break;
	case 'quit':
		close();
	break;
	case 'uci':
		postMessage('id name rapspeed');
		postMessage('id author Thibor Raven');
		postMessage('option name optCenter type spin default ' + optCenter + ' min -4 max 4');
		postMessage('uciok');
	break;
	case 'ucinewgame':
	break;
}
}

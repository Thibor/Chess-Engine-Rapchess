var version = '18-02-01';
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
var g_countMove = 0;
var g_captured = 0;
var g_hash = 0;
var g_baseEval = 0;
var g_castleRights = 0xf; //&1 = wk, &2 = wq, &4 = bk, &8 = bq
var g_depth = 0;
var adjInsufficient = false;
var g_passing = 65;
var g_pieceM = 0;
var g_pieceO = 0;
var g_move50 = 0;
var g_moveNumber = 0;
var g_totalNodes = 0;
var g_startTime = 0;
var g_inCheck = false;
var g_depthout = 0;
var g_timeout = 0;
var g_nodeout = 0;
var g_pv = '';
var g_stop = false;
var g_scoreFm = '';
var g_lastCastle = 0;
var g_phase = 32;
var undoStack = [];
var undoIndex = 0;
var g_board =  new Array(65);
var g_hashBoard =  new Array(65);
var g_pieceIndex = new Array(256);
var g_pieceList = new Array(2 * 8 * 16);
var g_pieceCount = new Array(2 * 8);
var g_destiny = new Array(8);
var whiteTurn = 1;
var colorEnemy = colorBlack;
var colorUs = colorWhite;
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
boardPromotion = [
1,1,1,1,1,1,1,1,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
1,1,1,1,1,1,1,1];
boardOutpost = [
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,
0x10,0x10,0x10,0x10,0x10,0x10,0x10,0x10,
0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,
0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,
0x08,0x08,0x08,0x08,0x08,0x08,0x08,0x08,
0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0];
var adjOutpost = [0,8,32,16,4,2,0];
var tmpCenter = [[4,2],[8,8],[4,8],[-8,8],[8,0xf],[-8,8]];
var tmpMaterial = [[171,240],[764,848],[826,891],[1282,1373],[2526,2646],[0xffff,0xffff]];  
var tmpPassed = [[5,7],[5,14],[31,38],[73,73],[166,166],[252,252]];  
var tmpMobility = [[],
[[-75,-76],[-57,-54],[-9,-28],[-2,-10],[6,5],[14,12],[22, 26],[29,29],[36, 29]],//knight
[[-48,-59],[-20,-23],[16, -3],[26, 13],[38, 24],[51, 42],[55, 54],[63, 57],[63, 65],[68, 73],[81, 78],[81, 86],[91, 88],[98, 97]],//bishop
[[-58,-76],[-27,-18],[-15, 28],[-10, 55],[-5, 69],[-2, 82],[9,112],[16,118],[30,132],[29,142],[32,155],[38,165],[46,166],[48,169],[58,171]],//rook
[[-39,-36],[-21,-15],[3,  8],[3, 18],[14, 34],[22, 54],[28, 61],[41, 73],[43, 79],[48, 92],[56, 94],[60,104],[60,113],[66,120],[67,123],[70,126],[71,133],[73,136],[79,140],[88,143],[88,148],[99,166],[102,170],[102,175],[106,184],[109,191],[113,206],[116,212]],//queen
[[90,9],[80,8],[70,7],[60,6],[50,5],[40,4],[30,3],[20,2],[10,1]]];//king
var arrMobility = [];
var adjMobility = 0;
var pieceValue = [];
var optCenter = 0;

function RAND_32(){
return (Math.floor(Math.random() * 0x10000) << 16) | Math.floor(Math.random() * 0x10000);
}

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
var moves = GenerateAllMoves(whiteTurn,false);
for(var i = 0; i < moves.length; i++)
	if(FormatMove(moves[i]) == s)
		return moves[i];
}

function IsRepetition(){
for(var n = undoIndex - 4;n >= undoIndex - g_move50;n -= 2)
	if(undoStack[n].hash == g_hash)
		return true;
return false;
}

function Initialize(){
g_hash = RAND_32();
for(var f =0;f < 65;f++){
	g_hashBoard[f] = new Array(16);
	for(var p = 0;p < 16;p++)
		g_hashBoard[f][p] = RAND_32();
}
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
postMessage('info fe ' + fen);
movesIndex = 0;
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
whiteTurn = (chunks[1].charAt(0) == 'w')|0;
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
undoStack = [];
for(undoIndex = 0;undoIndex  < g_moveNumber;undoIndex++)
	undoStack[undoIndex] = new cUndo();
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
g_countMove++;
var p = g_board[to] & 7;
if((p == pieceKing) || ((g_lastCastle & maskCastle) && ((boardCheck[to] & g_lastCastle) == g_lastCastle)))
	g_inCheck = true;
else if(add){
	var m = fr | (to << 8) | flag;
	if(flag == moveflagPassing)p = 1;
	if(p)
		moves[moves.length] = m;
	else{
		moves[moves.length] = moves[countNA];
		moves[countNA++] = m;	
	}
}
}

function GenerateMovePwn(moves,fr,to,add,flag){
if(boardPromotion[to] && add){
	GenerateMove(moves,fr,to,add,moveflagPromoteQueen);
	GenerateMove(moves,fr,to,add,moveflagPromoteRook);
	GenerateMove(moves,fr,to,add,moveflagPromoteBishop);
	GenerateMove(moves,fr,to,add,moveflagPromoteKnight);
}else
	GenerateMove(moves,fr,to,add,flag);
}

function GenerateAllMoves(wt,attack){
g_pieceM = 0;
g_pieceO = 0;
g_countMove = 0;
g_inCheck = false;	
adjMobility = 0;
countNA = 0;
colorEnemy = wt ? colorBlack : colorWhite;
colorUs = wt ? colorWhite : colorBlack;
var ml = 0;
var moves = [];
var color = wt ? 0 : 8;
var pieceIdx = (color | 1) << 4;//pawn
var fr = g_pieceList[pieceIdx++];
var row = 0;
while(g_board[fr]){
	g_pieceO++;
	GeneratePwnMoves(moves,attack,fr,g_destiny[wt][fr]);
	if(g_inCheck)return [];
	var x = 1 << (fr & 7);
	if(row & x)adjMobility -= 16;
	row |= x;
	fr = g_pieceList[pieceIdx++];
}
if((row & 0xc0) == 0x80)adjMobility -= 32;
if((row & 0xe0) == 0x40)adjMobility -= 32;
if((row & 0x70) == 0x20)adjMobility -= 32;
if((row & 0x38) == 0x10)adjMobility -= 32;
if((row & 0x1c) == 0x08)adjMobility -= 32;
if((row & 0x0e) == 0x04)adjMobility -= 32;
if((row & 0x07) == 0x02)adjMobility -= 32;
if((row & 0x03) == 0x01)adjMobility -= 32;
pieceIdx = (color | pieceBishop) << 4;//bishop
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	g_pieceM++;
	ml = g_countMove;
	GenerateStdMoves(moves,attack,fr,g_destiny[3][fr]);
	if(g_inCheck)return [];
	adjMobility += arrMobility[2][g_phase][g_countMove - ml];
	fr = g_pieceList[pieceIdx++];
}
if(g_pieceM > 1)
        adjMobility += 64;
pieceIdx = (color | 2) << 4;//knight
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	g_pieceM++;
	ml = g_countMove;
	GenerateShrMoves(moves,attack,fr,g_destiny[2][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[1][g_phase][g_countMove - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 4) << 4;//rook
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	g_pieceO++;
	ml = g_countMove;
	GenerateStdMoves(moves,attack,fr,g_destiny[4][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[3][g_phase][g_countMove - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 5) << 4;//queen
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	g_pieceO++;
	ml = g_countMove;
	GenerateStdMoves(moves,attack,fr,g_destiny[5][fr]);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[4][g_phase][g_countMove - ml];
	if(g_inCheck)return [];
}
pieceIdx = (color | 6) << 4;//king
fr = g_pieceList[pieceIdx++];
while(g_board[fr]){
	ml = g_countMove;
	GenerateShrMoves(moves,attack,fr,g_destiny[6][fr]);
	var cr = wt ? g_castleRights : g_castleRights >> 2;
	if (cr & 1)
		if((!g_board[fr + 1]) && (!g_board[fr + 2]))
			GenerateMove(moves,fr,fr + 2,!attack,moveflagCastleKing);
	if (cr & 2)
		if((!g_board[fr - 1]) && (!g_board[fr - 2]) && (!g_board[fr - 3]))
			GenerateMove(moves,fr,fr - 2,!attack,moveflagCastleQueen);
	fr = g_pieceList[pieceIdx++];
	adjMobility += arrMobility[5][g_phase][g_countMove - ml];
	if(g_inCheck)return [];
}
adjInsufficient = (!g_pieceO) && (g_pieceM < 2);
if(!g_pieceO && !g_pieceM)
	adjMobility -= 64;	
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

function GeneratePwnMoves(moves,attack,fr,des){
var n = des[0].length;
while(n--){
		var to = des[0][n];
		if(!g_board[to])
			GenerateMovePwn(moves,fr,to,!attack);
		else
			break;
}
var n = des[1].length;
while(n--){
		var to = des[1][n];
		if(g_board[to] & colorEnemy)
			GenerateMovePwn(moves,fr,to,true);
		if((g_board[to] & colorUs) && (boardOutpost[to] & colorUs)){
			adjMobility += adjOutpost[g_board[to] & 7];
		}else if(to == g_passing)
			GenerateMove(moves,fr,to,true,moveflagPassing);
		else if((g_lastCastle & maskCastle) && ((boardCheck[to] & g_lastCastle) == g_lastCastle))
			g_inCheck = true;
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

function GenerateShrMoves(moves,attack,fr,des){
var n = des.length;
while(n--){
		var to = des[n];
		if(g_board[to] & colorEnemy)
			GenerateMove(moves,fr,to,true);
		else if(!g_board[to])
			GenerateMove(moves,fr,to,!attack);
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

function GenerateStdMoves(moves,attack,fr,des){
var n = des.length;
while(n--){
	var a = des[n];
	var d = a.length;
	while(d--){
		var to = a[d];
		if(!g_board[to])
				GenerateMove(moves,fr,to,!attack);
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
var capi = to;
g_captured = g_board[to];
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
	g_captured = g_board[capi];
	g_board[capi] = 0;
}
undoStack[undoIndex++] = new cUndo();
g_hash ^= g_hashBoard[fr][piece];
g_passing = 65;
var capturedType = g_captured & 0xF;
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
if(flags & moveflagPromotion){
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
	g_hash ^= g_hashBoard[to][promoteType];
}else{
	g_board[to] = g_board[fr];
	g_baseEval -= pieceValue[g_phase][piece][fr];
	g_baseEval += pieceValue[g_phase][piece][to];
	g_hash ^= g_hashBoard[to][piece];
}
g_board[fr] = 0;
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
var undo = undoStack[--undoIndex];
g_passing = undo.passing;
g_castleRights = undo.castle;
g_move50 = undo.move50;
g_baseEval = undo.value;
g_lastCastle = undo.lastCastle;
g_hash = undo.hash;
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
whiteTurn ^= 1;
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
	if(!(++g_totalNodes & 0x1fff))	
		g_stop = ((g_timeout && (Date.now() - g_startTime > g_timeout)) ||  (g_nodeout && (g_totalNodes > g_nodeout)));
	var cm = mu[n];
	MakeMove(cm);
	var me = GenerateAllMoves(whiteTurn,true);
	var osScore = -g_baseEval + myMobility - adjMobility;
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
var check = 0;
var n = mu.length;
var myMoves = n;
var alphaDe = 0;
var alphaFm = '';
var alphaPv = '';
var myMobility = adjMobility;
var myInsufficient = adjInsufficient;
while(n--){
	if(!(++g_totalNodes & 0x1fff))	
		g_stop = ((depthL > 1) && ((g_timeout && (Date.now() - g_startTime > g_timeout)) ||  (g_nodeout && (g_totalNodes > g_nodeout))));
	var cm = mu[n];
	MakeMove(cm);
	var me = GenerateAllMoves(whiteTurn,depth == depthL);
	g_depth = 0;
	g_pv = '';
	var osScore = -g_baseEval + myMobility - adjMobility;
	if(g_inCheck){
		myMoves--;
		osScore = -0xffff;
	}else if((g_move50 > 99) || IsRepetition() || (myInsufficient && (adjInsufficient || osScore > 0)))
		osScore = 0;
	else
		if(depth < depthL)
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
postMessage('info nodeeeeeeeeeee ' + nodes);
var mu = GenerateAllMoves(whiteTurn,false);
var m1 = mu.length - 1;
var insufficient = adjInsufficient;
var alpha = -0xffff;
var beta = 0xffff;
g_stop = false;
g_totalNodes = 0;
g_depthout = depth ? depth : 1;
g_timeout = time;
g_nodeout = nodes;
do{
	bsIn = m1;
	adjInsufficient = insufficient;
	var os = GetScore(mu,1,g_depthout,alpha,beta);
	if(os > alpha && os < beta){
		alpha = os - 50;
		beta = os + 50;
	}else{
		alpha = -0xffff;
		beta = 0xffff;
		if(!g_stop)continue;
	}
	if(bsIn != m1){
		var m = mu.splice(bsIn,1);
		mu.push(m);
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
this.hash = g_hash;	
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
		postMessage('id name Rapspeed ' + version);
		postMessage('id author Thibor Raven');
		postMessage('option name optCenter type spin default ' + optCenter + ' min -4 max 4');
		postMessage('uciok');
}else if (msg == 'isready') postMessage('readyok');
else if(msg == 'stop')g_stop = true;
else if(msg == 'quit')close();
else if(re = (/setoption(?: optCenter (\d+))+/).exec(msg))optCenter = re[1] | 0;
else if((/^position (?:(startpos)|fen (.*?))\s*(?:moves\s*(.*))?$/).exec(msg)){
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

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
var g_castleRights = 0xf; //&1 = wk, &2 = wq, &4 = bk, &8 = bq
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
var g_board = new Array(256);
var boardCheck = new Array(256);
var boardCastle = new Array(256);
var g_pieceIndex = new Array(256);
var g_pieceList = new Array(2 * 8 * 16);
var g_pieceCount = new Array(2 * 8);
var whiteTurn = true;
var colorEnemy = colorBlack;
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
for(var n = 0; n < 256; n++){
	var x = n & 0xf;
	var y = n >> 4;
	boardCheck[n] = 0;
	boardCastle[n]=15;
	if((x>3) && (y>3) && (x<12) && (y<12))
		g_board[n] = colorEmpty;
	else
		g_board[n] = 0;
}
var cm = [[68,7],[72,3],[75,11],[180,13],[184,12],[187,14]];
for(var n = 0;n < cm.length;n++)
	boardCastle[cm[n][0]] = cm[n][1];
var bm = [[71,colorBlack | moveflagCastleQueen],[72,colorBlack | maskCastle],[73,colorBlack | moveflagCastleKing],[183,colorWhite | moveflagCastleQueen],[184,colorWhite | maskCastle],[185,colorWhite | moveflagCastleKing]];
for(var n = 0;n < cm.length;n++)
	boardCheck[bm[n][0]] = bm[n][1];
}

function InitializeFromFen(fen){
for(var n = 0; n < 256; n++)
	if(g_board[n])
		g_board[n] = colorEmpty;
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
		var piece = b == c ? colorBlack : colorWhite;
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
g_passing = 0;
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

function InitializePieceList() {
g_baseEval = 0;
for (var i = 0; i < 16; i++){
		g_pieceCount[i] = 0;
		for (var j = 0; j < 16; j++)
			g_pieceList[(i << 4) | j] = 0;
}
for (var i = 0; i < 256; i++){
		g_pieceIndex[i] = 0;
		var piece = g_board[i] & 0xF;
		if (piece){
			g_pieceList[(piece << 4) | g_pieceCount[piece]] = i;
			g_pieceIndex[i] = g_pieceCount[piece];
			g_pieceCount[piece]++;
			g_baseEval = piece & colorBlack ? -arrMaterial[piece & 7] : arrMaterial[piece & 7];
		}
}
if (!whiteTurn) g_baseEval = -g_baseEval;
}

function GenerateMove(moveStack,fr,to,add,flags){
if(add)
	moveStack[moveStack.length] = fr | (to << 8) | flags;
if(((g_board[to] & 7) == pieceKing) || (((boardCheck[to] & g_lastCastle) == g_lastCastle)&&(g_lastCastle & maskCastle)))
	g_inCheck = true;
}

function GenerateAllMoves(wt){
g_inCheck = false;	
colorEnemy = wt ? colorBlack : colorWhite;
maskEE = colorEnemy | colorEmpty;
var ml = 0;
var moves = [];
var to,del;
var color = wt ? 0 : 0x8;
var pieceIdx = (color | 1) << 4;//pawn
var fr = g_pieceList[pieceIdx++];
while(fr){
	ml = moves.length;
	del = wt ? -16 : 16;
	to = fr + del;
	if(g_board[to] & colorEmpty){
		GeneratePwnMoves(moves,fr,to,true)
		if((!g_board[fr-del-del]) && ((g_board[to+del] & colorEmpty)))
			GeneratePwnMoves(moves,fr,to+del,true);
	}
	if(g_board[to - 1] & colorEnemy)GeneratePwnMoves(moves,fr,to - 1,true);
	else if((to - 1) == g_passing)GeneratePwnMoves(moves,fr,g_passing,true,moveflagPassing);
	else if(g_board[to - 1] & colorEmpty)GeneratePwnMoves(moves,fr,to - 1,false);
	if(g_board[to + 1] & colorEnemy)GeneratePwnMoves(moves,fr,to + 1,true);
	else if((to + 1) == g_passing)GeneratePwnMoves(moves,fr,g_passing,true,moveflagPassing);
	else if(g_board[to + 1] & colorEmpty)GeneratePwnMoves(moves,fr,to + 1,false);
	fr = g_pieceList[pieceIdx++];
	if(g_inCheck)return [];
}
pieceIdx = (color | 2) << 4;//knight
fr = g_pieceList[pieceIdx++];
while(fr){
	ml = moves.length;
	GenerateShrMoves(moves,fr,[14,-14,18,-18,31,-31,33,-33]);
	fr = g_pieceList[pieceIdx++];
	if(g_inCheck)return [];
}
pieceIdx = (color | 3) << 4;//bishop
fr = g_pieceList[pieceIdx++];
while (fr){
	ml = moves.length;
	GenerateStdMoves(moves,fr,[15,-15,17,-17]);
	fr = g_pieceList[pieceIdx++];
	if(g_inCheck)return [];
}
pieceIdx = (color | 4) << 4;//rook
fr = g_pieceList[pieceIdx++];
while(fr){
	ml = moves.length;
	GenerateStdMoves(moves,fr,[1,-1,16,-16]);
	fr = g_pieceList[pieceIdx++];
	if(g_inCheck)return [];
}
pieceIdx = (color | 5) << 4;//queen
fr = g_pieceList[pieceIdx++];
while(fr){
	ml = moves.length;
	GenerateStdMoves(moves,fr,[1,-1,15,-15,16,-16,17,-17]);
	fr = g_pieceList[pieceIdx++];
	if(g_inCheck)return [];
}
pieceIdx = (color | 6) << 4;//king
fr = g_pieceList[pieceIdx++];
while(fr){
	ml = moves.length;
	GenerateShrMoves(moves,fr,[1,-1,15,-15,16,-16,17,-17]);
	var cr = wt ? g_castleRights : g_castleRights >> 2;
	if (cr & 1)
		if(g_board[fr + 1] == colorEmpty && g_board[fr + 2] == colorEmpty)
			GenerateMove(moves,fr,fr + 2,true,moveflagCastleKing);
	if (cr & 2)
		if(g_board[fr - 1] == colorEmpty && g_board[fr - 2] == colorEmpty && g_board[fr - 3] == colorEmpty)
			GenerateMove(moves,fr,fr - 2,true,moveflagCastleQueen);
	fr = g_pieceList[pieceIdx++];
	if(g_inCheck)return [];
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
	if(g_board[to] & maskEE)
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
	if (g_board[to] & colorEnemy)
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
	var rook = g_board[to + 1];
	g_board[to - 1] = rook;
	g_board[to + 1] = colorEmpty;
	var rookIndex = g_pieceIndex[to + 1];
	g_pieceIndex[to - 1] = rookIndex;
	g_pieceList[((rook & 0xF) << 4) | rookIndex] = to - 1;
}else if(flags & moveflagCastleQueen){
	var rook = g_board[to - 2];
	g_board[to + 1] = rook;
	g_board[to - 2] = colorEmpty;
	var rookIndex = g_pieceIndex[to - 2];
	g_pieceIndex[to + 1] = rookIndex;
	g_pieceList[((rook & 0xF) << 4) | rookIndex] = to + 1;
}else if(flags & moveflagPassing){
	capi = whiteTurn?to+16:to-16;
	g_captured = g_board[capi];
	g_board[capi]=colorEmpty;
}
undoStack.push(new cUndo());
g_passing = 0;
var capturedType = g_captured & 0xF;
if (capturedType){
	g_pieceCount[capturedType]--;
	var lastPieceSquare = g_pieceList[(capturedType << 4) | g_pieceCount[capturedType]];
	g_pieceIndex[lastPieceSquare] = g_pieceIndex[capi];
	g_pieceList[(capturedType << 4) | g_pieceIndex[lastPieceSquare]] = lastPieceSquare;
	g_pieceList[(capturedType << 4) | g_pieceCount[capturedType]] = 0;
	g_baseEval += arrMaterial[g_captured & 7];
	g_move50 = 0;
}else if((piece & 7) == piecePawn) {
	if (to == (fr + 32)) g_passing = (fr + 16);
	if (to == (fr - 32)) g_passing = (fr - 16);
	g_move50 = 0;
}else
	g_move50++;
g_pieceIndex[to] = g_pieceIndex[fr];
g_pieceList[((piece) << 4) | g_pieceIndex[to]] = to;
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
	var promoteType = newPiece & 0xF;
	g_pieceCount[piece]--;
	var lastPawnSquare = g_pieceList[(piece << 4) | g_pieceCount[piece]];
	g_pieceIndex[lastPawnSquare] = g_pieceIndex[to];
	g_pieceList[(piece << 4) | g_pieceIndex[lastPawnSquare]] = lastPawnSquare;
	g_pieceList[(piece << 4) | g_pieceCount[piece]] = 0;
	g_pieceIndex[to] = g_pieceCount[promoteType];
	g_pieceList[(promoteType << 4) | g_pieceIndex[to]] = to;
	g_pieceCount[promoteType]++;
	g_baseEval -= arrMaterial[piece & 7];
	g_baseEval += arrMaterial[newPiece & 7];
}else
	g_board[to] = g_board[fr];
g_board[fr] = colorEmpty;
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
var captured=undo.captured;
if (flags & moveflagCastleKing) {
	var rook = g_board[to - 1];
	g_board[to + 1] =  rook;
	g_board[to - 1] = colorEmpty;
	var rookIndex = g_pieceIndex[to - 1];
	g_pieceIndex[to + 1] = rookIndex;
	g_pieceList[((rook & 0xF) << 4) | rookIndex] = to + 1;
}else if (flags & moveflagCastleQueen){
	var rook = g_board[to + 1];
	g_board[to - 2] =  rook;
	g_board[to + 1] = colorEmpty;
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
	g_pieceList[(promoteType << 4) | g_pieceCount[promoteType]] = 0;
	g_pieceIndex[to] = g_pieceCount[pawnType];
	g_pieceList[(pawnType << 4) | g_pieceIndex[to]] = to;
	g_pieceCount[pawnType]++;
}else g_board[fr] = g_board[to];
if(flags & moveflagPassing){
	capi = whiteTurn?to-16:to+16;
	g_board[to] = colorEmpty;
}
g_board[capi] = captured;
g_pieceIndex[fr] = g_pieceIndex[to];
g_pieceList[((piece & 0xF) << 4) | g_pieceIndex[fr]] = fr;
var captureType = captured & 0xF;
if (captureType){
	g_pieceIndex[capi] = g_pieceCount[captureType];
	g_pieceList[(captureType << 4) | g_pieceCount[captureType]] = capi;
	g_pieceCount[captureType]++;
}
whiteTurn =! whiteTurn;
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
	GenerateAllMoves(!whiteTurn);
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

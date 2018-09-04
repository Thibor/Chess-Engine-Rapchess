function MakeSquare(row, column) {
return ((row + 4) << 4) | (column + 4);
}

function GenerateValidMoves(){
var moveList = [];
var am = GenerateAllMoves(whiteTurn);
if(!g_inCheck)
	for(var i = am.length - 1; i >= 0; i--){
		var m = am[i];
		MakeMove(m);
		GenerateAllMoves(whiteTurn);
		if(!g_inCheck)
			moveList[moveList.length] = m;
		UnmakeMove(m);
	}
return moveList;
}

function EmoToGmo(emo){
var xmo = EmoToXmo(emo);
return XmoToGmo(xmo);
}

function EmoToXmo(emo){
var l='abcdefgh';
var n='87654321';
var a=emo.split('');
var n1=l.indexOf(a[0]);
var n2=n.indexOf(a[1]);
var n3=l.indexOf(a[2]);
var n4=n.indexOf(a[3]);
var ns=(n2<<3) | n1;
var nd=(n4<<3) | n3;
return {s:ns,d:nd,p:emo.charAt(4)};
}

function GmoToXmo(gmo){
var ma=(gmo & 0xFF);
var mb=(gmo >> 8) & 0xFF;
var max=(ma & 0xf)-4;
var mbx=(mb & 0xf)-4;
var may=(ma >> 4)-4;
var mby=(mb >> 4)-4;
ma=may*8+max;
mb=mby*8+mbx;
return {s:ma,d:mb,p:'q'};
}

function XmoToGmo(xmo){
var max = xmo.s & 7;
var mbx = xmo.d & 7;
var may = xmo.s >> 3;
var mby = xmo.d >> 3;
var sa = MakeSquare(may, max);
var sb = MakeSquare(mby, mbx);
var move = sa | (sb << 8);
if(xmo.p){
	if(xmo.p=='q') move=move | moveflagPromoteQueen;
	else if(xmo.p=='r') move=move | moveflagPromoteRook;
	else if(xmo.p=='b') move=move | moveflagPromoteBishop;
	else move=move | moveflagPromoteKnight;
}
var moves = GenerateValidMoves();
for(var i = 0; i < moves.length; i++){
	if((move & 0xFFFF)==(moves[i] & 0xFFFF))
		if(moves[i] & moveflagPromotion){
			if((move & 0xF0FFFF) == (moves[i] & 0xF0FFFF))
				return moves[i];
		}else return moves[i];
}
return null;
}

function cHistory(){
this.fen = '';
this.list = [];
}

cHistory.prototype.Add = function(m){
this.list.push(m);
}

cHistory.prototype.Clear=function(){
this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
this.list = [];
}

cHistory.prototype.StrMoves=function(){
var s = '';
for(var n = 0;n < this.list.length;n++)
	s += ' ' + this.list[n];
return s;
}

var cRapuci=function(){}

cRapuci.prototype.GetInt=function(tokens,key,shift,def){
for (var i=0; i < tokens.length; i++)
	if (tokens[i] == key)
		return parseInt(tokens[i + shift]);
return def;
}

cRapuci.prototype.GetStr=function(tokens,key){
for (var i=0; i < tokens.length; i++)
	if (tokens[i] == key)
		return tokens[i+1];
return '';
}

cRapuci.prototype.GetStrToEnd=function(tokens,key,def){
var val='';
for (var i=0; i < tokens.length; i++)
	if (tokens[i] == key){
		for (var j=i+1; j < tokens.length; j++)
			val += tokens[j] + ' ';
		return val;
	}
return def;
}

function cEngine(){
this.engine = null;	
this.owner = null;
this.name = '';
this.author = '';
this.file = '';	
this.goparam = '';	
}

cEngine.prototype.DoMove = function(){
$('#uciBody').empty();	
this.engine.postMessage('position fen ' + History.fen + ' moves' + History.StrMoves());
this.engine.postMessage('go ' + this.goparam);	
}

cEngine.prototype.Init = function(file,param){
this.name = '';
this.author = '';
this.file = file;
this.goparam = param;
this.Stop();
this.engine = new Worker(file + '.js');
this.engine.owner = this;
this.engine.onmessage = function(e){
	var message = e.data;
	message = message.trim();
	message = message.replace(/\s+/g,' ');
	var tokens  = message.split(' ');
	if (tokens[0] == 'bestmove'){
		Chess.DoEngineMove(tokens[1]);
	}else if (tokens[0] == 'info'){
		var s='';
		var mate = Rapuci.GetStr(tokens,'score');
		var score = Rapuci.GetInt(tokens,'score',2,false);
		var depth = Rapuci.GetInt(tokens,'depth',1);
		var seldepth = Rapuci.GetInt(tokens,'seldepth',1,0);
		var nps = Rapuci.GetInt(tokens,'nps',1,false);
		var pv = Rapuci.GetStrToEnd(tokens,'pv',false);
		var sDepth = depth;
		if(depth){
			if(seldepth)sDepth += '/' + seldepth;
			s += 'depth ' + sDepth + ' ';
		}
		if(nps){
			var nls = nps.toLocaleString();
			s += 'nps ' +nls + ' ';
		}
		if(pv)
			s+='pv '+ pv;
		if(score !== false){
			if(score > 0)score='+' + score;
			if(mate == 'mate')score += 'M';
			$('#output').text(this.owner.name + ' score ' + score + ' ' + s);
		}
		if(pv){
			this.pv = pv;
			this.sDepth = sDepth;
			$('#uciBody').prepend('<tr><td class="taright">'+score+'</td><td class="tacenter">' + sDepth + '</td><td>' + pv + '</td><tr>');
		}
	}else if (tokens[0] == 'id'){
		var a = Rapuci.GetStrToEnd(tokens,'author');
		var n = Rapuci.GetStrToEnd(tokens,'name');
		if(a)this.owner.author = a;
		if(n)this.owner.name = n;
		$('#output').text(this.owner.name + ' ' + this.owner.author);
	}
}
this.engine.postMessage('uci');
this.engine.postMessage('ucinewgame');
}

cEngine.prototype.Stop = function(){
if(this.engine)this.engine.terminate();
this.engine = null;
}

function cChess(){
this.fieldS = -1;
}

cChess.prototype.AfterAnimation=function(){
this.Render();
if(!whiteTurn)
	Engine.DoMove();
}

cChess.prototype.Animate = function(isou,ides){
$('.field').removeClass('hovered');
$('#f'+this.fieldS).addClass('hovered');
var fs = $('#f'+isou).position();
var fd = $('#f'+ides).position();
var delx = fd.left - fs.left;
var dely = fd.top - fs.top;
$('#p'+isou).animate({'left':delx,'top':dely},{
	duration:'slow',
	start:function(){$(this).css('z-index',200)},
	complete:function(){
		Chess.AfterAnimation();
	}
});
}

cChess.prototype.DoEngineMove=function(emo){
var gmo = EmoToGmo(emo);
if(!gmo)return false;
this.DoMove(gmo);
return true;
}

cChess.prototype.DoMove=function(gmo){
History.Add(FormatMove(gmo));
MakeMove(gmo);
var xmo = GmoToXmo(gmo);	
this.fieldS = xmo.d;
this.Animate(xmo.s,xmo.d);
}

cChess.prototype.NewGame = function(){
this.fieldS = -1;	
InitializeFromFen();
this.Render();
History.Clear();
var file = $('#inEngine').val();
var param = $('#inParam').val();
Engine.Init(file,param);
}

cChess.prototype.Render = function(){
this.RenderBoard();
this.RenderPiece();
}

cChess.prototype.RenderBoard = function(){
var hor = 'ABCDEFGH';
var table = $('<table>');
for(y1=0;y1<10;++y1){
	var tr=$('<tr>');
	var fy = this.rotate ?y1:9-y1;
	for(x1 = 0; x1 < 10; ++x1){
		var td = $('<td>');
		var fx = this.rotate ? 9 - x1 : x1;
		if(y1==0 || y1==9)
			if(x1>0 && x1<9)$(td).text(hor.charAt(fx-1));
		if(x1==0 || x1==9)
			if(y1>0 && y1<9)$(td).text(fy);
		if(y1>0 && y1<9 && x1>0 && x1<9){
			$(td).addClass('field');
			var f = ((8-fy)*8+(fx-1));
			var z = this.rotate ? 8 - fy : fy;
			$('<div>').addClass('boadiv').attr('id','d'+f).appendTo(td);
			$(td).attr('id','f'+f);
			$(td).data('number',f);
			$(td).data('numberz',z);
			var bgColor = (y1 ^ x1) & 1;
			if (bgColor)
				$(td).addClass('fieldb');
			else
				$(td).addClass('fieldw');
		}else $(td).addClass('fieldn');
		$(tr).append(td);
	}
	$(table).append(tr);
}
$('#board').empty().append(table);
$('.field').droppable({hoverClass:'hovered'});
$('.field').click(function(){
	Chess.SetSelected($(this).data('number'));
});
$('#f'+this.fieldS).addClass('hovered');
}

cChess.prototype.RenderPiece = function(){
var rn = ['','p','n','b','r','q','k'];
for(var i = 0;i < 64;i++){
	var x = i % 8;
	var y = Math.floor(i / 8);
	var piece = g_board[((y + 4) * 0x10) + x + 4];
	var pr = piece & 0x7;
	if(pr && pr < 7){
		var pieceName = rn[pr];
		pieceName += (piece & 0x8) ? 'b' : 'w';
		var p = $('<div>').attr('id','p'+i).data('number',i).addClass('piece '+pieceName).appendTo('#d'+i);
	}
}	
$('.piece').draggable({cursor:'pointer',containment: '#board',zIndex:300,
	revert:function(socket){
		return !Chess.SetSelected($(socket).data('number'));
	},
	start: function(){
		Chess.fieldS = $(this).data('number');
	}
});
$('.piece').click(function(){
	Chess.SetSelected($(this).data('number'));
});
}

cChess.prototype.SetSelected=function(i){
var xmo = {s:this.fieldS,d:i,p:'q'};
var gmo = XmoToGmo(xmo);
if(gmo){
	$('#p'+this.fieldS).data('number',i);
	this.DoMove(gmo);
	return true;
}else{
	$('.field').removeClass('hovered');
	$('#f'+i).addClass('hovered');
	this.fieldS = i;
	return false;
}
}
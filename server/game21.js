var uuid_seed=parseInt(Math.random()*10000);
var uuid={
v4:function(){
	uuid_seed++;
	return "uuid"+uuid_seed;
}
}
var io=io||require("socket.io-client");
//var socket=io.connect('ws://121.42.192.58:4000');
var socket=io.connect('ws://localhost:4000');
socket.on('connect',function(){
	socket.emit('sevonline', 'c44b73c2-c5bd-4fba-8d87-309eb4be93c3');
});

//db--------------------------------------------------
var gamestatus="canjoin";//进人canjoin，gamestart,进行中running(有turnoplock)，结束gameend
var cards=[];
//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;
var admitCount = 4;
var turnOpLock = -1;
function getStatus(idx){
	for(var name in onlineUsers){
		if(onlineUsers[name].mainIndex==idx){
			return onlineUsers[name].status;
		}
	}
}
function nextTurn(){

			turnOpLock++;
			turnOpLock%=onlineCount;

			if(getStatus(turnOpLock)!="normal"){

				var rest=0;
				for(var name in onlineUsers){
					if(onlineUsers[name].status=='normal'){
						rest++;
					}
				}

				if(rest>0){
					setTimeout(nextTurn,0);
				}else{
					for(var name in onlineUsers){
						for(var i=0;i<onlineUsers[name].ownCard.length;i++){//所有人的牌都掀起来
							onlineUsers[name].ownCard[i].open=1;
						}
						for( var peer in onlineUsers){
							
							var end_game_msg={
								username:name,
								session:"endgame",
								result:{
									peername:peer,
									peerIndex:onlineUsers[peer].mainIndex,
									peerCard:onlineUsers[peer].ownCard,
								}
							}
							socket.emit("push",end_game_msg);//游戏结束的时候掀起所有人的牌
						}
						gamestatus="endgame";
					}
					setTimeout(function(){
						//alert&&alert(rest+"游戏结束")
						try{
							location.reload();
						}catch(e){console.log(e);}
						try{
							process.exit();
						}catch(e){console.log(e);}
					},1000);

				}
			}else{
				for(var name in onlineUsers){
					var lock_msg={
						username:name,
						session:"turnOpLock",
						result:{
							turnOpLock:turnOpLock,
						}
					}
					socket.emit("push",lock_msg);//广播控制权
				}
			}
}
//db---------------------------------------------------
function audit(username){
	var result={0:1};
	function add(){
		var res=result;
		result={};
		var args={0:1};
		for(var i=0;i<arguments.length;i++){
			args[arguments[i]]=1;
			delete args[0];
		}
		for(var i in args){
			for(var j in res){
				result[parseInt(i)+parseInt(j)]=1;
			}
		}
		console.log(result);
	}

	var ownCard=onlineUsers[username].ownCard;
	for(var i=0;i<ownCard.length;i++){
		var cardid=parseInt(ownCard[i].cardid);
		
		if(!isNaN(cardid)){
			var face  =cardid%13+1;//face
			var flower=parseInt(cardid/13);//huase
			switch(face){
				case 1:
					add(1,11);
				break;
				case 11:
				case 12:
				case 13:
					add(10);
				break;
				default:
					add(face);
				break;
			}
		}
	}
	var res=[];
	for(var i in result){
		res.push(parseInt(i));
	}
	res.sort(function(x,y){return x-y;});
	onlineUsers[username].score=res;
	if(res[0]>21){
		onlineUsers[username].status="burst";
		return "burst";
	}
}
function audit_all(){
	for(var username in onlineUsers){audit(username);};
}
socket.on('login_other_place',function(res){
	console.log('login_other_place');
	process.exit();
});
var checkAliveTimeoutId=null;
function checkAlive(){
	clearTimeout(checkAliveTimeoutId);
	var t=(new Date()).getTime();
	var offline=[]
	for(var username in onlineUsers){
		var dt=t-onlineUsers[username].alive;
		if(dt>20000){
			delete onlineUsers[username];
			offline.push(username)
		}
	}
	
	if(offline.length>0){
		var restCount=0;
		for(var username in onlineUsers){
			restCount++;
			var push_msg={
				username:username,
				session:"offlineuser",
				result:{
					user:offline,
				}
			}
			socket.emit("push",push_msg);
		}
		try{location.reload();}catch(e){console.log(e);}
		try{process.exit();   }catch(e){console.log(e);}
		onlineCount=restCount;
	}
	if(onlineCount>0){
		setTimeout(checkAlive,10000);
	}
}
			function cp_all_userinfo(){
				var ou={};
				for(var name in onlineUsers){
					ou[name]={};
					for(var item in onlineUsers[name]){
						if(item=="ownCard"){
							//ou[name][item]=onlineUsers[name][item];
							var ownCard=onlineUsers[name][item];
							ou[name][item]=[];
							for(var i=0;i<ownCard.length;i++){
								var card=ownCard[i];
								ou[name][item].push({cardid:card.open==1?card.cardid:"pk",uuid:card.uuid,open:card.open});
							}
						}else if(item!="score"){
							ou[name][item]=onlineUsers[name][item];
						}
					}
				}
				console.log(ou);
				return ou;
			}
			function cp_one_userinfo(name){
				var u={};
				for(var item in onlineUsers[name]){
					if(item=="ownCard"){
							//ou[name][item]=onlineUsers[name][item];
							var ownCard=onlineUsers[name][item];
							u[item]=[];
							for(var i=0;i<ownCard.length;i++){
								var card=ownCard[i];
								u[item].push({cardid:card.open==1?card.cardid:"pk",uuid:card.uuid,open:card.open});
							}
					}else if(item!="score"){
						u[item]=onlineUsers[name][item];
					}
				}
				return u;
			}
socket.on('req',function(req){
	console.log(req);
	var username=req.username;
	var fn      =req.fn;
	var args    =req.args;
	var session =req.session;
	if(username==undefined)return;
	if(onlineUsers[username]==undefined && fn!="join")return;
	switch(fn){
		case "join":
			if(onlineUsers[username]==undefined){
				if(onlineCount<admitCount && gamestatus=="canjoin"){
					onlineUsers[username]={ownCard:[],status:"normal",license:0,mainIndex:onlineCount};
					onlineCount++;
				}else{//full	
					socket.emit('resp',{username:username,session:session,result:[0,'full']});//
					return;
				}
			}
			onlineUsers[username].username=username;
			var t=(new Date()).getTime();
			onlineUsers[username].alive=t;
			setTimeout(checkAlive,10000);
			//avoid get other users card
			var ret={
				username:username,
				session:session,
				result:[1,
					{
						onlineUsers:cp_all_userinfo(),
						onlineCount:onlineCount,
						user:onlineUsers[username],
						gamestatus:gamestatus,
						turnOpLock:turnOpLock,
					}
				]
			}
			console.log(ret);
			socket.emit("resp",ret);

			for(var name in onlineUsers){
				if(name!=username){
					var push_msg={
						username:name,
						session:"peer_join",
						result:{
							user:cp_one_userinfo(username),//onlineUsers[username]
						}
					}
					socket.emit("push",push_msg);
				}
			}
		break;
		case "license":
			onlineUsers[username].license=1;

			var licenseUser={};
			var licenseCnt=0;
			for(name in onlineUsers){
				
				if(onlineUsers[name].license==1){
					licenseCnt++;
				}
				licenseUser[name]=onlineUsers[name].license;
			}
			var license_msg={
				username:username,
				session:"licenseresp",
				result:licenseUser,//最好还是广播状态
			}
			console.log(license_msg);
			socket.emit("push",license_msg);
			
			if(admitCount>=onlineCount && licenseCnt==onlineCount){//start，开始游戏
				if(turnOpLock==-1)turnOpLock=parseInt(Math.random()*onlineCount);//初始化轮换锁
				var cardMul=2;
				cards=[];
				for(var i=0;i<(52*cardMul);i++){
					cards.push({cardid:i%52,uuid:uuid.v4(),open:0});//生成(52*cardMul)张牌，每张牌一个uuid
				}
				for(var i=0;i<(520*cardMul);i++){
					var a=parseInt(Math.random()*(52*cardMul));
					var b=parseInt(Math.random()*(52*cardMul));
					var temp=cards[a];
					cards[a]=cards[b];
					cards[b]=temp;
				}//洗牌
				gamestatus="startgame";
				gamestatus="running";
				for(var name in onlineUsers){
					var mainIndex=onlineUsers[name].mainIndex;
					var push_msg={
						username:name,
						session:"startgame",
						result:{
							mainIndex:mainIndex,
						}
					}
					
					console.log(push_msg);
					socket.emit("push",push_msg);//发牌

					var card_msg={
						username:name,
						session:"hintresp",
						result:{//should be 2 card
							hintCard:[cards.shift(),cards.shift(),],
						}
					}
					socket.emit("push",card_msg);
					
					var choose=parseInt(Math.random()*2);//random choose 1
					card_msg.result.hintCard[choose].open=1;//有一张是明牌
					
					onlineUsers[name].ownCard.push(card_msg.result.hintCard[0]);
					onlineUsers[name].ownCard.push(card_msg.result.hintCard[1]);
					audit(name);
					var lock_msg={
						username:name,
						session:"turnOpLock",
						result:{
							turnOpLock:turnOpLock,
						}
					}
					socket.emit("push",lock_msg);//广播控制权
					
					for( var peer in onlineUsers){
						if(peer!=name){
							var peer_msg={
								username:peer,
								session:"peer_card",
								result:{//should be 2 card
									peername:name,
									peerIndex:mainIndex,
									peerCard:[
										{
										cardid:(card_msg.result.hintCard[0].open==0?"pk":card_msg.result.hintCard[0].cardid),
										uuid:card_msg.result.hintCard[0].uuid,
										},
										{
										cardid:(card_msg.result.hintCard[1].open==0?"pk":card_msg.result.hintCard[1].cardid),
										uuid:card_msg.result.hintCard[1].uuid,
										},
									]
								}
							}
							socket.emit("push",peer_msg);//让对方3人知道自己的牌
						}
					}
					mainIndex++;
				}

			}
		break;
		case "hint":
			if(onlineUsers[username].mainIndex!=turnOpLock){
				console.log(username+"未获得轮转操作权");
				return;
			}
			var hint_msg={
				username:username,
				session:"hintresp",
				result:{//should be 1 card
					hintCard:[cards.shift(),],
				}
			}
			socket.emit("push",hint_msg);
			
			onlineUsers[username].ownCard.push(hint_msg.result.hintCard[0]);

			for( var peer in onlineUsers){//一个人拿到牌，要把牌告诉其他人
				if(peer!=username){
					var peer_hint_msg={
						username:peer,
						session:"peer_card",
						result:{//should be 1 card
							peername:username,
							peerIndex:onlineUsers[username].mainIndex,
							peerCard:[
								{cardid:"pk",uuid:hint_msg.result.hintCard[0].uuid,},
							]
						}
					}
					socket.emit("push",peer_hint_msg);//让对方3人知道自己的牌
				}
			}
			if(audit(username)=="burst"){//终于有人爆牌了
				for(var i=0;i<onlineUsers[username].ownCard.length;i++){
					onlineUsers[username].ownCard[i].open=1;
				}
				for( var peer in onlineUsers){//一个人拿到牌，要把牌告诉其他人
					if(peer!=username){
						var peer_burst_msg={
							username:peer,
							session:"burst",
							result:{
								peername:username,
								peerIndex:onlineUsers[username].mainIndex,
								peerCard:onlineUsers[username].ownCard,
							}
						}
						socket.emit("push",peer_burst_msg);//让对方3人知道自己的牌
					}
				}
			}
			nextTurn();

		break;
		case "skip":
			if(onlineUsers[username].mainIndex!=turnOpLock){
				console.log(username+"未获得轮转操作权");
				return;
			}
			var push_msg={
				username:username,
				session:"skipresp",
				result:{
					
				}
			}
			socket.emit("push",push_msg);
			nextTurn();
		break;
		case "open":
			if(onlineUsers[username].mainIndex!=turnOpLock){
				console.log(username+"未获得轮转操作权");
				return;
			}
			var open_msg={
				username:username,
				session:"openresp",
				result:{
					
				}
			}
			socket.emit("push",open_msg);
			for( var peer in onlineUsers){//开牌了，让所有人知道自己的牌面
				if(peer!=username){
					var peer_open_msg={
						username:peer,
						session:"peeropen",
						result:{
							peername:username,
							peerIndex:onlineUsers[username].mainIndex,
							peerCard:onlineUsers[username].ownCard,
						}
					}
					socket.emit("push",peer_open_msg);//让对方3人知道自己的牌
				}
			}
			onlineUsers[username].status="open";
			nextTurn();
		break;
		case "pingx":
			
			var t=(new Date()).getTime();
			onlineUsers[username].alive=t;
			var ret={
				username:username,
				session:session,//pongx
				result:[1,
					{
						t:t,
					}
				]
			}
			socket.emit("resp",ret);
		break;
		default:
		break;
	}
});

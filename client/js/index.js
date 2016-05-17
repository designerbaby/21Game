var selfMainIndex=null;
var turnOpLock=-1;
var sits=["bottom","right","top","left"];
	function sit(selfIdx){
	
		while(sits[selfIdx]!="bottom"){
			var temp=sits.shift();
			sits.push(temp);
		}
		return sits;
	}
  function send_login(username,password){
  socket.off('login');
  socket.on('login', function(res){
    console.log(res);
    if(res[0]==1){
      console.log("登陆成功");
      window.password=res[1].password;
      window.username=username;
      join();
    }else{
      if(res[1]=='sev_not_found'){
        setTimeout(send_login,5000);
      }else{
		var href=location.pathname.split("/").slice(0,-1).join("/");
		href+="/before.html";
		location.href=href;
      }
    }
  });
  //告诉服务器端有用户登录
  var args={username:username,password:password||""};
  console.log(args);
  socket.emit('req', {session:"login",sev:"accounts",fn:"login",args:args});
  console.log(args);

}

function login(username,password){
  function cb(){
    send_login(username,password);
  }
  if(socket!=null)return cb();
  connect(cb);
};
document.body.onload=function(){
		window.username=getQueryStringByName('username');
		window.password=getQueryStringByName('password');
		

		if(window.username==""||window.password==""){
			var href=location.pathname.split("/").slice(0,-1).join("/");
			href+="/before.html";
			location.href=href;
		}else{
			login(window.username,window.password);
		}
    }



var pingTimeoutId=null;
function ping(){
  clearTimeout(pingTimeoutId);
  socket.off('pongx');
  socket.on('pongx',function(res){

    if(isArray(res)){
      if(res[0]==1){
        pingTimeoutId=setTimeout(ping,10000);
      }else{
        console.log("服务端离线");
       
      }
    }

  });
  socket.emit('req', {sev:"game21",fn:"pingx",session:"pongx",args:{}});
}

function join(){

  socket.off('offlineuser');
  socket.on('offlineuser',function(res){
  	console.log('offlineuser',res);
  	alert("有用户退出，请刷新游戏");
  })
  socket.off('peer_join');
  socket.on('peer_join',function(res){
    console.log('peer_join',res);
	var userstruct=res.user;
	var position=sits[userstruct.mainIndex];
	document.getElementById(position+"_name").innerHTML='用户名:<span>'+userstruct.username+'</span>';
	console.log(userstruct,position);
			
			//有可能是重连进来的，所以带着牌状态进入
			var ownCard=userstruct.ownCard;
			for(var i=0;i<ownCard.length;i++){
				createOrUpdateCard(ownCard[i],userstruct.mainIndex);
			}
  });
  //加入game21
  socket.off('join');
  socket.on('join',function(res){
    console.log('join',res);
    if(isArray(res)){
      if(res[0]==1){
      	var result=res[1];
      	result.onlineUsers[result.user.username]=result.user;
      	var user=result.user;
		var mainIndex=user.mainIndex;
		selfMainIndex=mainIndex;
		console.log(sits);
		sit(mainIndex);//围坐，自己占据bottom
		console.log(sits);
		//自己的位置确定之后，其他人的位置也是知道的了
		for(var tmpIndex=0;tmpIndex<sits.length;tmpIndex++){
			var position=sits[tmpIndex];
			document.getElementsByClassName("item_"+position)[0].id="track"+tmpIndex;
			document.getElementsByClassName("item_"+position)[0].innerHTML+='<div>点数：<div id="score'+tmpIndex+'"></div></div><div id="index'+tmpIndex+'"></div>';
		}
		
		var onlineUsers=result.onlineUsers;
		console.log(onlineUsers);
		for(var name in onlineUsers){
			var userstruct=onlineUsers[name];
			var position=sits[userstruct.mainIndex];
			document.getElementById(position+"_name").innerHTML='用户名:<span>'+userstruct.username+'</span>';
			
			//自己可能是重连进来的，这种情况下可能其他人都有牌，自己也有牌
			var ownCard=userstruct.ownCard;
			for(var i=0;i<ownCard.length;i++){
				createOrUpdateCard(ownCard[i],userstruct.mainIndex);
				audit(userstruct.mainIndex);
			}
			
		}
		initCmd();
		switch(result.gamestatus){//保证游戏的过程中也是可以刷新的
			case "canjoin":
				ping();
				socket.off('offline')
				socket.on('offline',function(res){
				  console.log('offline',res);
				});
				
			break;
			case "startgame":
				ping();
				socket.off('offline')
				socket.on('offline',function(res){
				  console.log('offline',res);
				});
				document.getElementById("license").style['display']="none";
			break;
			case "running":
				ping();
				socket.off('offline')
				socket.on('offline',function(res){
				  console.log('offline',res);
				});
				document.getElementById("license").style['display']="none";
				(function(){
					turnOpLock=result.turnOpLock;
					for(var j=0;j<4;j++){
					  if(selfMainIndex!=j && turnOpLock!=j){
					  	document.getElementById("index"+j).style['background']="#fff";
					  }
					}
					if(selfMainIndex==turnOpLock){
						var nodes=document.getElementsByClassName("needTurnOpLock");
						for(var i=0;i<nodes.length;i++){
							nodes[i].style['display']="block";
						}
					}else{
						document.getElementById('index'+selfMainIndex).style['background']="#ccc";
					  
						var nodes=document.getElementsByClassName("needTurnOpLock");
						for(var i=0;i<nodes.length;i++){
							nodes[i].style['display']="none";
						}
					}
					document.getElementById("index"+turnOpLock).style['background']="green";
				})();
			break;
			case "endgame":
			(function(){
				clearTimeout(pingTimeoutId);//游戏结束，不再发送ping探测
				document.getElementById("exit").style['display']="block";
				document.getElementById("again").style['display']="block";
						var nodes=document.getElementsByClassName("needTurnOpLock");
						for(var i=0;i<nodes.length;i++){
							nodes[i].style['display']="none";
						}
				audit_all();
				judge_all();
			})();
			break;
		}
      }else{
        alert("未成功加入room");
        //$("#joinstatus").html("未成功加入");
      }
    }
  });
  socket.on('startgame',function(res){
    console.log('startgame',res);
    document.getElementById("license").style['display']="none";

  });
  socket.on('peer_card',function(res){
    console.log('peer_card',res);
    var peername=res.peername;
    var peerCard=res.peerCard;
    var peerIndex=res.peerIndex;

    for(var i=0;i<peerCard.length;i++){
    	createOrUpdateCard(peerCard[i],peerIndex);
    }
    audit(peerIndex);
  });
  socket.on('burst',function(res){
    console.log('burst',res);
    var peername=res.peername;
    var peerCard=res.peerCard;
    var peerIndex=res.peerIndex;
    for(var i=0;i<peerCard.length;i++){
    	createOrUpdateCard(peerCard[i],peerIndex);
    }
    audit(peerIndex);
  });
  socket.on('endgame',function(res){
    clearTimeout(pingTimeoutId);//游戏结束，不再发送ping探测
	document.getElementById("exit").style['display']="block";
	document.getElementById("again").style['display']="block";

    console.log('endgame',res);

	var nodes=document.getElementsByClassName("needTurnOpLock");
	for(var i=0;i<nodes.length;i++){
		nodes[i].style['display']="none";
	}
    var peername=res.peername;
    var peerCard=res.peerCard;
    var peerIndex=res.peerIndex;
    for(var i=0;i<peerCard.length;i++){
    	createOrUpdateCard(peerCard[i],peerIndex);
    }
    audit(peerIndex);
    judge_all();
  });
  socket.on('peeropen',function(res){
    console.log('peeropen',res);
    var peername=res.peername;
    var peerCard=res.peerCard;
    var peerIndex=res.peerIndex;
    for(var i=0;i<peerCard.length;i++){
    	createOrUpdateCard(peerCard[i],peerIndex);
    }
    audit(peerIndex);
  });
  socket.on('turnOpLock',function(res){
    console.log('turnOpLock',res);

    turnOpLock=res.turnOpLock;
    for(var j=0;j<4;j++){
      if(selfMainIndex!=j && turnOpLock!=j){
      	document.getElementById("index"+j).style['background']="#fff";
      
      }
    }
    if(selfMainIndex==turnOpLock){
    	var nodes=document.getElementsByClassName("needTurnOpLock");
		for(var i=0;i<nodes.length;i++){
			nodes[i].style['display']="block";
		}
    }else{
    	document.getElementById("index"+selfMainIndex).style['background'] = "#ccc";
    
    	var nodes=document.getElementsByClassName("needTurnOpLock");
		for(var i=0;i<nodes.length;i++){
			nodes[i].style['display']="none";
		}
    }
    document.getElementById("index"+turnOpLock).style['background'] = "green";
  
  });
  socket.emit('req', {sev:"game21",fn:"join",session:"join",args:{}});
}
function license(){
  socket.emit('req', {sev:"game21",fn:"license",session:"licenseresp",args:{}});
}
function hint(){
  if(selfMainIndex!=turnOpLock){alert("没有轮到你，急什么");return;}
  socket.emit('req', {sev:"game21",fn:"hint",session:"hintresp",args:{}});
}
function skip(){
  if(selfMainIndex!=turnOpLock){alert("没有轮到你，急什么");return;}
  socket.emit('req', {sev:"game21",fn:"skip",session:"skipresp",args:{}});
}
function open(){
  if(selfMainIndex!=turnOpLock){alert("没有轮到你，急什么");return;}
  socket.emit('req', {sev:"game21",fn:"open",session:"openresp",args:{}});
}
function createOrUpdateCard(card,mainIndex){
  var cid=card.cardid;
  var uid=card.uuid;
  var uid_node=document.getElementById(""+uid);
  console.log(uid_node);
  if(uid_node==null || uid_node==undefined || uid_node==false){
  	var newHtml='<img src="'+'image/card/'+cid+'.jpg'+'" width="75px" height="115px" style="height:115px;width:75px;" class="card" id="'+uid+'">';
    document.getElementById("index"+mainIndex).innerHTML+=newHtml;
  }else{
  	document.getElementById(""+uid).src = 'image/card/'+cid+'.jpg';
   
  }
  return document.getElementById(""+uid);
  
}
function initCmd(){
  socket.off('hintresp');
  socket.on('hintresp',function(res){
    console.log('hintresp',res);
    var hintCard=res.hintCard;
    for(var i=0;i<hintCard.length;i++){
		createOrUpdateCard(hintCard[i],selfMainIndex);
    }
    audit(selfMainIndex);
  });
  socket.off('licenseresp');
  socket.on('licenseresp',function(res){
    console.log('licenseresp',res);
    document.getElementById("license").style['display']="none";
  
  });
  socket.off('skipresp');
  socket.on('skipresp',function(res){
    console.log('skipresp',res);
  });
  socket.off('openresp');
  socket.on('openresp',function(res){
    console.log('openresp',res);
  });
  var license_node = document.getElementById("license");
  license_node.onclick = function(){
  	license();
  }
 
  var deal = document.getElementById("deal");
  deal.onclick = function(){
  	open();
  }
  
  var twist = document.getElementById("twist");
  twist.onclick = function(){
  	hint();
  }
 
  var shuffle = document.getElementById("shuffle");
  shuffle.onclick = function(){
  	skip();
  }
  
  document.getElementById("again").onclick = function(){
	location.search="?username="+escape(window.username)+"&password="+escape(window.password)+"&time="+((new Date()).getTime());
  }
  
  document.getElementById("exit").onclick = function(){
  	var href=location.pathname.split("/").slice(0,-1).join("/");
	href+="/before.html?username="+escape(window.username)+"&password="+escape(window.password)+location.hash;
	location.href=href;
  }

}

function audit(id){
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
	var imgs=document.getElementById("index"+id).getElementsByTagName("img");
	
	for(var i=0;i<imgs.length;i++){
		var src=imgs[i].src;
		var cardid=parseInt(src.split("/").slice(-1)[0].split(".jpg")[0]);
		
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
		res.push(i);
	}
	res.sort(function(x,y){return x-y;});
	if(res[0]>21){
		document.getElementById("track"+id).style.background = "red";
		
	}
	document.getElementById("score"+id).innerHTML=(res.join(" "));

}
function audit_all(){
	for(var i=0;i<4;i++){audit(i);}
}
function judge(id){
	var res = document.getElementById("score"+id).innerHTML.split(" ");
	
	if(res.length==0)return 0;
	var maxscore=0;
	for(var i=0;i<res.length;i++){
		res[i]=parseInt(res[i]);
		if(isNaN(res[i])){
			res[i]=0;
		}
		if(res[i]<=21 && res[i]>maxscore){
			maxscore=res[i];
		}
	}
	return maxscore;
}
var judged=0;
function judge_all(){
	if(judged==1)return;
	judged=1;
	var score=[];
	var maxscore=0;
	for(var i=0;i<4;i++){
		score[i]=judge(i);
		if(score[i]>maxscore){
			maxscore=score[i];
		}
	}
	var winnerCount=0;
	var winnerIndex=-1;
	for(var i=0;i<4;i++){
		if(score[i]==maxscore){
			winnerCount++;
			winnerIndex=i;
		}
	}
	if(winnerCount==1 && winnerIndex!=-1){
		var idxNode=document.getElementById(sits[winnerIndex]+"_name");
		var name=idxNode.getElementsByTagName("span")[0].innerHTML;
		alert(name+"胜出 点数："+maxscore);
	}else{
		alert("本次无人胜出");
	}
	
}

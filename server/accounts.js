var account_db={};
//还要用户登陆成功的记录，用户当天登陆失败的记录，当前总体登陆失败的记录
//必要的时候，要求用户输入验证码，甚至封锁帐号
var io=io||require("socket.io-client");
//var socket=io.connect('ws://121.42.192.58:4000');
var socket=io.connect('ws://localhost:4000');
socket.on('connect',function(){
	socket.emit('sevonline', 'b338d1c7-af64-441c-9ab1-0b0693a3ff4d');
});
socket.on('login_other_place',function(res){
	console.log('login_other_place');
	process.exit();
})
socket.on('req',function(req){
	var socketid=req.socketid;
	var cmd     =req.cmd;
	var fn      =req.fn;
	var args    =req.args;
	var session =req.session;
	switch(fn){
		case "login":
			console.log("login msg");
			console.log('args',args);
			
			var username=args.username;
			var account=account_db[username];
			console.log('account',account);
			if(account!=undefined){
				var password=args.password;
				if(password==account.password){
					socket.emit('proxy_op',{cmd:"set",obj:"authed",key:socketid,val:username});
					socket.emit('proxy_op',{cmd:"set",obj:"client",key:username,val:socketid});

					socket.emit('resp',{username:username,session:session,result:[1,{password:password}]});//成功重连
					return;
				}else{
					socket.emit('resp',{socketid:socketid,session:session,result:[0,"user exist"]});//已有该用户
				}
			}else{
					var password=args.password;
					if(password==undefined||password==""||password==null||password==false)
					{
						password=(new Date()).getTime();
					}
					account_db[username]={password:password};
					console.log('resp',account_db[username]);
					socket.emit('proxy_op',{cmd:"set",obj:"authed",key:socketid,val:username});
					socket.emit('proxy_op',{cmd:"set",obj:"client",key:username,val:socketid});

					socket.emit('resp',{username:username,session:session,result:[1,{password:password}]});//成功注册和登陆
					return;
			}
			socket.emit('resp',{socketid:socketid,session:session,result:[0,"login n"]});//登陆失败，原因不明
		break;
		case "logout":
			console.log("logout msg");
			console.log(args);
		break;
		default:
			console.log("unknow fn");
			console.log(fn);
			console.log(args);
		break;
	}
});

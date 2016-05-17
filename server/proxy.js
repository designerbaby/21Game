'use strict';
var uuid = require('node-uuid');
var io=require("socket.io")();
var proxyid=uuid.v4();
var sevmap={};
var socket_pool={};
function send(socketid,event_type,msg){
	if(socket_pool[socketid]!=undefined){
		socket_pool[socketid].emit(event_type,msg);
		return true;
	}
	return false;
}
var server={};//sevname:Endpoint所有的sev注册进入这里
var signed={};//通过认证的sev{socketid:sevname}

var client={};//usrname:Endpoint所有的usr注册进入这里
var authed={};//已经登陆的普通客户端{socketid:usrname}

class Endpoint{
	constructor(socketid){
		this.queue=[];//离线缓冲区
		this._sock=socketid;//发送通道
	}
	write(event_type,jsonMsg){
		this.queue.push([event_type,jsonMsg]);
		this._loop();
	}
	get socketid(){
		return this._sock;
	}
	set socketid(socketid){
		this._sock=socketid;
		this._loop();
	}
	_loop(){
		//console.log(this._sock);
		if(socket_pool[this._sock]==undefined)return;
		var socket=socket_pool[this._sock];
		if(this.queue.length){
			var dat=this.queue.shift();
			//console.log(dat);
			socket.emit(dat[0],dat[1]);
			var self=this;
			function loop(){
				self._loop();
			}
			setTimeout(loop,0);
		}
	}
}

function update_sign(){
	require("./walk")("./sev",function(path){
		var p=path.split("/");
		var name=p[p.length-1];
		require("fs").readFile(path,'utf-8',function(err,data){
			var sign=data.split("\n").join("").split("\'").join("");
			sevmap[sign]=name;
		});
	});
	setTimeout(update_sign,10000);
}
update_sign();

io.on('connection', function(socket){
	var socketid=uuid.v4();
	socket_pool[socketid]=socket;
	var socket_type="unknow";
	//console.log(socketid)
	//console.log("connection");
	socket.on('disconnect', function(){
		delete socket_pool[socketid];
		delete authed[socketid];
		delete signed[socketid];
	});
	socket.on('depserver',function(dep){//订阅服务上线消息
		var session=dep.session;
		
	});
	socket.on('sevonline',function(code){//服务端上线
		if(socket_type=='client')return;
		socket_type='server';

		//对服务的认证开始
		//console.log(code);
		if(sevmap[code]==undefined)return;
		var sevname=sevmap[code];
		//console.log(sevname);

		//设置服务的缓冲区，一定时间之后，这个缓冲区应该回收到数据库--------------------------------------------------------------
		if(server[sevname]==undefined)
			server[sevname]=new Endpoint(socketid);
		else{
			var old_socketid=server[sevname].socketid;//---------------------------------------------关闭
			server[sevname].socketid=socketid;
			if(old_socketid!=socketid && socket_pool[old_socketid]!=undefined){
				socket_pool[old_socketid].emit("login_other_place",1);
				socket_pool[old_socketid].disconnect();
			}
		}
			

		signed[socketid]=sevname;
		//console.log(server);
		//对服务的认证结束

		socket.on('proxy_op',function(op){//登陆服务器请求proxy进行某些操作
			var cmd=op.cmd;
			var obj=op.obj;
			var key=op.key;
			var val=op.val;
			if(cmd==undefined || obj==undefined || key==undefined)return;
			switch(cmd){
				case "get":
				break;
				case "set":
					switch(obj){
						case "authed":
							if(typeof val === "string")
								authed[key]=val;
							else
								delete authed[key];
							//console.log(authed);
						break;
						case "client":
							if(typeof val === "string"){
								//设置用户的缓冲区，一定时间之后，这个缓冲区应该回收到数据库---------------------------------------------------
								if(client[key]==undefined)
									client[key]=new Endpoint(val);
								else{
									var old_socketid=client[key].socketid;//---------------------------------------关闭
									client[key].socketid=val;
									if(old_socketid!=val && socket_pool[old_socketid]!=undefined){
										socket_pool[old_socketid].emit("login_other_place",1);
										socket_pool[old_socketid].disconnect();
									}
								}
							}else{
								delete client[key];
							}
							//console.log(client);
						break;
					}
				break;
			}
			
		});

		//服务器之间的操作---远程过程调用
		socket.on('call',function(call_msg){
			var dst_sev =call_msg.dst_sev;
			
			var fn      =call_msg.fn;
			var args    =call_msg.args;
			var session =call_msg.session;//未必需要一个session
			delete call_msg.dst_sev;
			if(signed[socketid]==undefined)return;
			call_msg.src_sev=signed[socketid];
			if(server[dst_sev]==undefined)return;
			server[dst_sev].write('call',call_msg);
		});

		//服务器之间的操作---远程调用返回
		socket.on('done',function(done_msg){
			var session=done_msg.session;
			var src_sev=done_msg.src_sev;
			var result =done_msg.result;
			if(server[src_sev]==undefined)return;
			server[src_sev].write(session!=undefined?session:"done", result);
		});
		


		socket.on('resp',function(resp_msg){//服务端返回消息
			var session =resp_msg.session;
			var socketid=resp_msg.socketid;
			var username=resp_msg.username;
			var result  =resp_msg.result;
			if(username!=undefined){//已经认证成功的用户
				if(client[username]!=undefined){
					client[username].write(session!=undefined?session:"resp",result);
				}
			}else if(socketid!=undefined){//未认证的用户
				send(socketid,session!=undefined?session:"resp",result);
			}
		});
		socket.on('push',function(push_msg){//服务端推送消息
			var session =push_msg.session;
			var socketid=push_msg.socketid;
			var username=push_msg.username;
			var result  =push_msg.result;
			if(username!=undefined){//已经认证成功的用户
				if(client[username]==undefined){
					console.log(username+" offline");
					return;
				}
				
				client[username].write(
					session!=undefined?session:"push",
					result
				);
			}else if(socketid!=undefined){//未认证的用户
				send(socketid,session!=undefined?session:"push",result);
			}
		});
	});
	
	socket.on("req",function(req){//客户端请求服务端实现某些功能
		//var req_msg={sev:"",fn:"",session:"",args:{}}
		if(socket_type=='server')return;
		socket_type='client';
		//console.log("client "+socketid+" req");
		//console.log(req);
		var sev    =req.sev;
		var fn     =req.fn;
		var session=req.session;
		var args   =req.args;
		delete req.sev;//服务看不到自身名称

		if(authed[socketid]==undefined){//未通过验证的客户端连接只能访问accounts服务，传递socketid进行标识
			if(sev!="accounts"){
				socket.emit(session!=undefined?session:"resp",[0,"login_n"]);
				console.log(socketid+" "+"not login");
				return;
			}else{
				if(server[sev]!=undefined){
					//console.log(server[sev].queue);
					req.socketid=socketid;
					server[sev].write("req",req);
				}else{
					socket.emit(session!=undefined?session:"resp",[0,"sev_not_found"]);
				}
				//这里应该取消传递，因为这种消息有可能是攻击探测--------------------------------------------------------------
				return;
			}
		}else{//通过验证的客户端可以访问任意服务，传递username进行标识
				if(server[sev]!=undefined){
					req.username=authed[socketid];
					server[sev].write("req",req);
				}else{//这里应该路由到上层服务器，或者路由到其他proxy服务器------------------------------------------
					socket.emit(session!=undefined?session:"resp",[0,"sev_not_found"]);
					console.log(sev+" not found");
				}
		}

	});
});

io.listen(4000, function(){
	console.log('listening on *:3000');
});

io.listen(3000, function(){
	console.log('listening on *:3000');
});


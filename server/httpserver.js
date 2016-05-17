var http = require("http"),url  = require("url"),path = require("path"),fs   = require("fs");
var server=[];
var createServer=function(port,ip){
	var s=http.createServer(function (req, res) {//这个function来自网络，请自己认领
		var pathname=__dirname+"/../client/"+url.parse(req.url).pathname;
		if (path.extname(pathname)=="")pathname+="/";
		if (pathname.charAt(pathname.length-1)=="/")pathname+="index.html";

		fs.exists(pathname,function(exists){
			if(exists){
				switch(path.extname(pathname)){
					case ".html":
						res.writeHead(200, {"Content-Type": "text/html"});
						break;
					case ".js":
						res.writeHead(200, {"Content-Type": "text/javascript"});
						break;
					case ".css":
						res.writeHead(200, {"Content-Type": "text/css"});
						break;
					case ".gif":
						res.writeHead(200, {"Content-Type": "image/gif"});
						break;
					case ".jpg":
						res.writeHead(200, {"Content-Type": "image/jpeg"});
						break;
					case ".png":
						res.writeHead(200, {"Content-Type": "image/png"});
						break;
					default:
						res.writeHead(200, {"Content-Type": "application/octet-stream"});
				}

				fs.readFile(pathname,function (err,data){
					res.end(data);
				});
			} else {
				res.writeHead(404, {"Content-Type": "text/html"});
				res.end("<h1>404 Not Found</h1>");
			}
		});

	});
	s.listen(port, ip);
	server.push(s);
	console.log("Server running at http://"+ip+":"+port+"/");
}


var ip=[];//记录上一次使用的所有ip
var timeoutHandle=function(){//每隔一段时间检测一次ip地址，然后和旧的ip地址列表比较，新ip则listen，消失的ip则close
	var interfaces=require("os").networkInterfaces();//获取当前所有的网卡信息
	var tmp=[]//记录当前使用的所有ip
	for(var item in interfaces){
		var interface=interfaces[item];
		for(var i=0;i<interface.length;i++){
			if(interface[i].family=="IPv4"){
				var address=interface[i].address;
				tmp.push(address);
				if(ip.indexOf(address)==-1){//得到一个新的ip
					createServer(8080,address);
				}else{//对于旧ip,应该从旧ip列表中删除
					ip=ip.slice(0,ip.indexOf(address)).concat(ip.slice(ip.indexOf(address)+1));//删除某个address
				}
			}
		}
	}
	try{
		for(var i=0;i<ip.length;i++)for(var j=0;j<server.length;j++)if(server[j]._connectionKey.indexOf(ip[i])!=-1){
			//最后保留在ip[]中的ip地址都是代表这个ip消失了，监听这个ip的server也应该结束才对
			try{server[j].close();console.log(ip[i]+"-close");}catch(error){console.log(error);}
		}
	}catch(e){console.log(e);}
	ip=tmp;
	setTimeout(timeoutHandle,10000);
}
timeoutHandle()


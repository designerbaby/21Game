var socket=null;
function connect(cb){
	if(socket!=null)return;
	//socket = io.connect('ws://121.42.192.58:3000');//连接websocket后端服务器
	//socket = io.connect('ws://121.42.192.58:3000');
	socket=io.connect('ws://localhost:3000');

	socket.on('login_other_place',function(){
		location.reload();
	})
	socket.on('connect',function(){
		console.log("connect");
		if(typeof cb==='function')cb();
	});
	socket.on('disconnect',function(){
		console.log("disconnect");
		//self.socket = io.connect('ws://localhost:3000');
	});
	socket.on('reconnect',function(){
		console.log("reconnect");
	});
	socket.on('reconnecting',function(){
		console.log("reconnecting");
	});
}
  function str2map(str){
    var theRequest={};
    if(str!="" && str!=undefined && str){
      var strs=str.split("&");
      for(var i=0;i<strs.length;i++){
        var par=strs[i].split("=");
        
        theRequest[par[0]]=unescape(par[1]);
      } 
    }
    return theRequest;
  }
  function getQueryStringByName(name){

    if(window.search==undefined){
      var url=location.search;
      if(url.indexOf("?")!=-1){
        window.search=str2map(url.substr(1));
      }else{
        window.search=str2map("");
      }
    }
    return window.search[name]||"";
  }
function isArray(obj) {   
  return Object.prototype.toString.call(obj) === '[object Array]';    
}  

      function showDialog(){//点击开始游戏显示的对话框
        document.getElementById("mask").style.display="block";
        setTimeout(show(),1500);
        function show(){
          document.getElementById("dialog").style.display="block";
        }
      };
      function translation(){//显示游戏说明的对话框
        document.getElementById("mask").style.display="block";
        setTimeout(document.getElementById("yxsm").style.display="block",1500);
      }
      function exitGames(){//退出游戏的方法
        window.close();
      }
	 function loginSubmit(){//登陆确认
		var username = document.getElementById("input").value;
		console.log(username);
		if(username!="" ){
			var password=document.getElementById("password").value;
			if(password!=""){
				login(username,password);
			}else{
				login(username);
			}
		}
		return false;
	};
	var confirm = document.getElementById("confirm");
	confirm.onclick = function(){
		console.log('click');
		loginSubmit();
	}
	var input = document.getElementById("confirm");
	input.onkeydown = function(){
		e = e || event;
		if (e.keyCode === 13) {
			loginSubmit();
		}
	}
	var cancel = document.getElementById("cancel");
	cancel.onclick = function(){
		document.getElementById("dialog").style.display="none";
		document.getElementById("mask").style.display="none";
	}
	function send_login(username,password){//传送登陆的信息
		socket.off('login');
		socket.on('login', function(res){
			console.log(res);
			if(res[0]==1){
				window.password=res[1].password;
				window.username=username;
				var href=location.pathname.split("/").slice(0,-1).join("/");
				href+="/index.html?username="+escape(window.username)+"&password="+escape(window.password)+location.hash;
				
				location.href=href;
			}else{
				if(res[1]=='sev_not_found'){
					setTimeout(send_login,5000);
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
	window.onload=function(){
		window.username=getQueryStringByName('username');
		window.password=getQueryStringByName('password');
		document.getElementById("input").value = username;
		document.getElementById("password").value = password;
	};

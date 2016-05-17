var fs = require('fs');  
function walk(path, handleFile) {
	fs.stat(path,function(err1,stats){
		if(err1){
			console.log("stat error");return;
		}
		if(stats.isDirectory()){
			fs.readdir(path,function(err,files){
			  if (err) {  
			      console.log('read dir error');return;
			  }
		      files.forEach(function(item) {  
		          var tmpPath = path + '/' + item;
					 walk(tmpPath,handleFile)   
		      });  
			});
			return;
		}
		handleFile(path);
	})
}  
  
module.exports= walk; 

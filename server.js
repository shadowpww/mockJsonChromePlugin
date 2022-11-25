//加载http模块
var http = require('http');
//加载文件模块
var fs = require('fs');
var path = require('path');
//创建一个服务器
var server = http.createServer(function(req, res) {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    let request = JSON.parse(data); // 拿到数据后，把数据存储起来
    const { mockJSON } = request;
    //先读取文件
    fs.readFile(path.resolve(__dirname, '../mock/test.ts'), function(
      err,
      data
    ) {
      if (!err) {
        fs.writeFile(
          path.resolve(__dirname, '../mock/test.ts'),
          `export default ${JSON.stringify({ ...mockJSON })}`,
          err => {
            if (err) {
              console.log('err', err);
              res.end('error', err);
              return;
            } else {
              res.end('success');
            }
          }
        );
      } else {
        res.end(JSON.stringify({ code: 'error', msg: err }));
      }
    });
  });
});
//监听这个端口
server.listen(8005, function() {
  console.log('服务已启动');
});

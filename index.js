const express = require('express');
const path = require('path');
const multer = require('multer');
const webp = require('webp-converter');
// 引入EJS模板引擎
const ejs = require('ejs');
const fs = require("fs");

webp.grant_permission();
const app = express();
const port = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// 指定静态目录
const uploadsPath = "uploads";
const staticDir = path.join(__dirname, uploadsPath);
app.use(express.static(staticDir));

// 首页路由响应处理程序
app.get('/', (req, res) => {
  ejs.renderFile(__dirname + '/views/index.ejs', {}, (err, html) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.send(html);
  });
});



// 设置存储文件的目录和文件名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const currentDate = new Date();
    const folderName = currentDate.getFullYear() + '-' +
      (currentDate.getMonth() + 1) + '-' +
      currentDate.getDate();
    fs.mkdirSync(uploadsPath + "/" + folderName, {
      recursive: true
    });
    cb(null, uploadsPath + "/" + folderName);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });



// 处理文件上传的路由
app.post('/upload', upload.single('file'), (req, res) => {
  // 转换为webp格式
  const inputFile = path.join(__dirname, req.file.path);
  console.log("inputFile", inputFile, req.file);
  const destination = req.file.destination;
  const name = path.basename(req.file.originalname, path.extname(req.file.originalname));
  const outputPath = `${destination}/${name}.webp`;
  const outputFile = path.join(__dirname, outputPath);
  try {
    webp.cwebp(inputFile, outputFile, "-q 80", logging = "-v");
    console.info("转换文件完成: ", inputFile);
    // 使用download.ejs模板渲染页面，并提供下载链接
    const outProxyPath = outputPath.substring(uploadsPath.length + 1);
    const downloadUrl = `${req.protocol}://${req.hostname}:${port}/${outProxyPath}`;
    // res.render('download', { downloadUrl });
    res.redirect(`/download?url=${encodeURIComponent(downloadUrl)}`);
    // 删除临时文件
    setTimeout(() => {
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
    }, 10 * 60 * 1000);
  } catch (error) {
    console.error(error);
    res.status(500).send('转换失败');
  }
});

app.get('/download', (req, res) => {
  const downloadUrl = decodeURIComponent(req.query.url);
  res.render('download', { downloadUrl });
});

app.listen(port, () => {
  console.log('应用程序正在监听端口' + port);
});

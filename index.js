const express = require('express');
const path = require('path');
const multer = require('multer');
const webp = require('webp-converter');
// 引入EJS模板引擎
const ejs = require('ejs');
const fs = require("fs");
const md5 = require('md5');

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

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowedFileTypes = /jpeg|jpg|png/; // 允许的文件类型
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (mimetype && extname) {
      // 验证通过，允许上传
      cb(null, true);
    } else {
      // 验证不通过，拒绝上传
      cb(new Error('只能上传jpeg、jpg、png格式的图片文件'));
    }
  }
});

// 处理文件上传的路由
// 处理文件上传的路由
app.post('/upload', upload.single('file'), async (req, res) => {
  // 获取转换率
  const quality = parseInt(req.body.quality);

  // 检查转换率是否有效
  if (isNaN(quality) || quality < 1 || quality > 100) {
    res.status(400).send('转换率无效');
    return;
  }

  // 获取文件的MD5值
  const inputFile = path.join(__dirname, req.file.path);
  const fileData = fs.readFileSync(inputFile);
  const fileMD5 = md5(fileData) + "_" + quality;

  // 生成目标路径和文件名
  const destination = req.file.destination;
  const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));
  const outputPath = `${destination}/${originalName}_${fileMD5}.webp`;
  const outputFile = path.join(__dirname, outputPath);

  // 检查目标路径是否存在相同的文件
  if (fs.existsSync(outputFile)) {
    console.log("文件已存在: ", outputFile);
    const outProxyPath = outputPath.substring(uploadsPath.length + 1);
    const downloadUrl = `${req.protocol}://${req.hostname}:${port}/${outProxyPath}`;
    res.redirect(`/download?url=${encodeURIComponent(downloadUrl)}`);
    return;
  }
  try {
    await webp.cwebp(inputFile, outputFile, `-q ${quality}`, logging = "-v");
    console.info("转换文件完成: ", inputFile);
    const outProxyPath = outputPath.substring(uploadsPath.length + 1);
    const downloadUrl = `${req.protocol}://${req.hostname}:${port}/${outProxyPath}`;
    res.redirect(`/download?url=${encodeURIComponent(downloadUrl)}`);
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

// 错误处理程序
app.use((err, req, res, next) => {
  res.status(500).render('error', { errorMessage: err });
});


app.listen(port, () => {
  console.log('应用程序正在监听端口' + port);
});

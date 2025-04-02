# Google Drive 图片自动更新设置指南

本指南将帮助您设置网站与Google Drive的集成，实现画廊和展示区图片的自动更新。

## 1. 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击顶部的"创建项目"
3. 输入项目名称（如"calvinsuals-website"）
4. 点击"创建"

## 2. 启用Google Drive API

1. 在左侧菜单中，导航到"API和服务" > "库"
2. 搜索"Google Drive API"并点击结果
3. 点击"启用"按钮

## 3. 创建API密钥

1. 在左侧菜单中，导航到"API和服务" > "凭据"
2. 点击"创建凭据"按钮，然后选择"API密钥"
3. 复制生成的API密钥（稍后会用到）
4. 建议限制API密钥只能用于Google Drive API

## 4. 创建OAuth 2.0客户端ID

1. 在"API和服务" > "凭据"页面中，点击"创建凭据"按钮
2. 选择"OAuth客户端ID"
3. 配置OAuth同意屏幕（如果尚未设置）:
   - 用户类型: 选择"外部"
   - 填写应用名称、用户支持邮箱和开发者联系信息
   - 添加授权域（您网站的域名）
4. 创建OAuth客户端ID:
   - 应用类型: 选择"Web应用"
   - 名称: 输入"Calvinsuals Website"
   - 授权的JavaScript来源: 添加您网站的URL（开发时可以使用`http://localhost:8000`）
   - 授权的重定向URI: 添加您网站的URL
5. 点击"创建"
6. 复制生成的客户端ID（稍后会用到）

## 5. 在Google Drive中组织文件夹

1. 在Google Drive中，为每个画廊或展示区创建单独的文件夹
2. 上传相应的图片到各个文件夹
3. 获取每个文件夹的ID：
   - 打开文件夹
   - 从浏览器地址栏中提取文件夹ID，格式为：`https://drive.google.com/drive/folders/YOUR_FOLDER_ID`

## 6. 配置网站

1. 打开`js/drive-config.js`文件
2. 填入您的API密钥和客户端ID:
   ```javascript
   API_KEY: '您的API密钥',
   CLIENT_ID: '您的客户端ID',
   ```
3. 填入各个画廊对应的Google Drive文件夹ID:
   ```javascript
   FOLDER_MAPPINGS: {
     'car-gallery': '汽车画廊文件夹ID',
     'portrait-gallery': '人像画廊文件夹ID',
     'showcase1 .car-gallery': '展示区1文件夹ID',
     // ...其他展示区...
   }
   ```

## 7. 测试集成

1. 在本地启动网站或上传至服务器
2. 访问页面时，会弹出Google授权对话框
3. 允许访问以后，画廊和展示区应该会自动加载Google Drive中的图片
4. 每30秒（默认值）会自动检查更新，如需调整频率，请修改`POLLING_INTERVAL`值

## 8. 共享权限设置

确保Google Drive文件夹的共享设置允许"知道链接的任何人都可以查看"。这样才能确保网站访问者能够看到图片。

## 注意事项

1. 确保图片格式为网络常用格式（JPG, PNG, WebP等）
2. 图片文件名将显示为alt属性和标题
3. 图片按创建时间排序，最新上传的图片会显示在前面
4. 首次加载时，用户需要授权访问Google Drive
5. 如果更改了文件夹结构或ID，需要更新`drive-config.js`文件

## 高级配置

如需更多自定义选项，您可以编辑`js/google-drive-loader.js`和`js/drive-init.js`文件。

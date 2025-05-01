# Google Drive + GitHub 图片自动更新设置指南

本指南将帮助您设置一个自动化系统，让您只需将照片放入Google Drive文件夹，就能自动更新到网站，无需手动修改代码。

## 步骤一：设置GitHub仓库

1. **创建GitHub账户**（如果还没有）
   - 访问 [GitHub.com](https://github.com) 注册账户

2. **创建新仓库**
   - 登录后点击右上角"+"图标，选择"New repository"
   - 输入仓库名称，如"calvinsuals-website"
   - 选择"Public"（公开）
   - 点击"Create repository"

3. **将网站代码上传到GitHub**
   - 使用GitHub Desktop（已在您电脑上安装）:
     - 打开GitHub Desktop
     - 选择"File" > "Add local repository"
     - 浏览并选择您的网站文件夹 (`c:\Users\chans\OneDrive\Desktop\calvinsuals web`)
     - 如果询问是否初始化Git仓库，选择"Yes"
     - 添加提交信息，如"Initial commit: website code"
     - 点击"Publish repository"，选择您刚创建的GitHub仓库

## 步骤二：设置Google Cloud和Drive

1. **创建Google Cloud项目**
   - 访问 [Google Cloud Console](https://console.cloud.google.com)
   - 点击页面顶部的项目下拉菜单，然后点击"新建项目"
   - 输入项目名称（如"calvinsuals-drive-sync"）并点击"创建"

2. **启用Google Drive API**
   - 在左侧菜单中，导航到"API和服务" > "库"
   - 搜索"Google Drive API"并点击结果
   - 点击"启用"按钮

3. **创建服务账号**
   - 在左侧菜单中，导航到"IAM和管理" > "服务账号"
   - 点击"创建服务账号"
   - 输入服务账号名称（如"drive-sync"）并点击"创建"
   - 为服务账号分配"基本" > "编辑者"角色
   - 点击"完成"

4. **创建并下载密钥**
   - 在服务账号列表中，点击刚创建的服务账号名称
   - 在"密钥"标签页，点击"添加密钥" > "创建新密钥"
   - 选择"JSON"格式并点击"创建"
   - 密钥文件会自动下载到您的电脑，请妥善保存为 `service-account-key.json`

5. **在Google Drive中创建文件夹**
   - 在Google Drive中，为每个画廊/展示区创建单独的文件夹
   - 例如：创建"汽车画廊"、"人像画廊"、"展示区1"等文件夹
   - 获取每个文件夹的ID（从URL中提取，格式为：`https://drive.google.com/drive/folders/YOUR_FOLDER_ID`）
   - 共享这些文件夹给您的服务账号（右键点击文件夹 > 共享 > 添加服务账号的邮箱地址）

## 步骤三：配置GitHub Secrets

1. **在GitHub仓库中添加Secrets**
   - 访问您的GitHub仓库
   - 点击"Settings" > "Secrets and variables" > "Actions"
   - 点击"New repository secret"
   - 名称填写: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - 值: 粘贴`service-account-key.json`文件的全部内容
   - 点击"Add secret"

## 步骤四：配置文件夹映射

1. **编辑文件夹映射配置**
   - 打开 `.github/scripts/folder_mappings.json` 文件
   - 将每个占位符替换为实际的Google Drive文件夹ID
   - 例如:
   ```json
   {
     "1a2b3c4d5e6f7g8h9i0j": "images/automotive/portfolio",
     "abcdefghijklmnopqrst": "images/portrait/portfolio",
     ...
   }
   ```

## 步骤五：启用GitHub Pages

1. **配置GitHub Pages**
   - 在GitHub仓库中，点击"Settings" > "Pages"
   - Source: 选择"main"分支
   - 文件夹: 选择"/ (root)"
   - 点击"Save"
   - 几分钟后，您的网站将在显示的URL上线

## 步骤六：使用方法

1. **上传图片到Google Drive**
   - 将图片上传到相应的Google Drive文件夹
   - GitHub Actions会每30分钟检查一次更新（也可以手动触发）
   - 新图片会自动添加到您的网站，并进行优化

2. **手动触发同步**（可选）
   - 访问GitHub仓库的"Actions"标签页
   - 点击左侧的"Sync Google Drive Images"工作流
   - 点击"Run workflow"按钮

## 故障排除

如果遇到问题，可以检查以下几点：

1. **GitHub Actions日志**
   - 在GitHub仓库中，点击"Actions"标签页查看同步日志
   - 查找错误信息并根据错误进行修复

2. **权限问题**
   - 确保已正确共享Google Drive文件夹给服务账号
   - 确保服务账号有适当的权限

3. **图片格式**
   - 确保上传的是支持的图片格式（JPEG, PNG, GIF, WebP, TIFF, BMP）

## 维护建议

1. 定期备份您的图片和代码
2. 如果网站结构变化，记得更新文件夹映射配置
3. 每年检查一次服务账号密钥是否需要更新

---

设置完成后，您就可以享受全自动的图片更新体验了！只需将照片放入Google Drive文件夹，它们会自动出现在您的网站上。

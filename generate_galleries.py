name: Generate Gallery JSON

on:
  push:
    branches:
      - main # 当推送到 main 分支时触发
    paths:
      - 'images/**' # 当 images 目录或其子目录内容变化时触发
      - '.github/workflows/generate_json.yml' # 当工作流文件本身变化时触发
  workflow_dispatch: # 允许手动触发

jobs:
  generate:
    runs-on: ubuntu-latest # 在最新的 Ubuntu 虚拟环境中运行
    permissions:
      contents: write # 需要写入权限来提交和推送更改

    steps:
      # 第一步：签出代码仓库
      - name: Checkout repository
        uses: actions/checkout@v4 # 使用官方的 checkout action

      # 第二步：设置 Python 环境
      - name: Set up Python
        uses: actions/setup-python@v5 # 使用官方的 setup-python action
        with:
          python-version: '3.11' # 指定 Python 版本

      # 第三步：安装 Python 依赖
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip # 升级 pip
          pip install -r requirements.txt # 从 requirements.txt 安装库

      # 第四步：运行 Python 脚本生成 JSON
      # 使用 env 将 GitHub Secrets 安全地传递为环境变量
      - name: Run script to generate JSON
        run: python generate_galleries.py
        env:
          R2_ENDPOINT_URL: ${{ secrets.R2_ENDPOINT_URL }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
          R2_PUBLIC_BASE_URL: ${{ secrets.R2_PUBLIC_BASE_URL }}

      # 第五步：提交并推送生成的 JSON 文件更改（如果存在）
      - name: Commit and push changes
        run: |
          set -e # 如果任何命令失败，立即退出脚本
          
          # 配置 Git 用户信息
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          
          echo "--- 开始将文件添加到 Git ---"
          # 添加可能由脚本生成的或修改的文件/目录
          git add images/automotive/galleries.json images/portrait/galleries.json images/comparison_groups.json images/**/images.json
          # 添加 display_*.json 文件
          git add images/display_automotive.json images/display_portrait.json
          
          echo "--- 添加文件后的 Git 状态 ---"
          git status
          
          echo "--- 检查是否存在用于提交的暂存更改 ---"
          # 检查是否有实际的更改需要提交
          if git diff --staged --quiet; then
            echo "未检测到 JSON 文件有更改。"
          else
            echo "检测到更改，开始提交和推送..."
            git commit -m "Automated: 更新画廊 JSON 文件" # 提交信息
            git push origin main # 推送到 main 分支
            echo "提交和推送完成。"
          fi
        # 注意：这里的 git add 命令可能需要根据您的 generate_galleries.py 脚本实际输出的文件进行调整。
        # 目前它会尝试添加 galleries.json, comparison_groups.json, images.json 和 display_*.json 文件。

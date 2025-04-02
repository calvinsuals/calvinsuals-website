# 触发工作流测试 - 添加于2025年4月2日
#!/usr/bin/env python3
"""
Google Drive图片同步脚本
此脚本从Google Drive下载图片并更新到网站仓库
"""

import os
import io
import json
import logging
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from PIL import Image

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 支持的图片格式
SUPPORTED_MIMETYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp'
]

def load_folder_mappings():
    """从配置文件加载文件夹映射"""
    try:
        # 确定配置文件路径（位于当前脚本同目录下）
        script_dir = os.path.dirname(os.path.abspath(__file__))
        mapping_file = os.path.join(script_dir, 'folder_mappings.json')
        
        # 读取配置文件
        with open(mapping_file, 'r', encoding='utf-8') as f:
            mappings = json.load(f)
        
        # 过滤掉注释项（值为"注释"的项）
        mappings = {k: v for k, v in mappings.items() if v != "注释"}
        logger.info(f"成功加载了 {len(mappings)} 个文件夹映射")
        return mappings
    
    except Exception as e:
        logger.error(f"加载文件夹映射失败: {e}")
        # 如果加载失败，返回空字典
        return {}

def get_drive_service():
    """创建并返回一个授权的Google Drive服务"""
    # 获取凭证
    try:
        # 确定凭证文件路径
        script_dir = os.path.dirname(os.path.abspath(__file__))
        repo_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
        credentials_path = os.path.join(repo_root, 'service-account-key.json')
        
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        # 构建Drive服务
        return build('drive', 'v3', credentials=credentials)
    except Exception as e:
        logger.error(f"获取Drive服务失败: {e}")
        raise

def list_folder_files(service, folder_id):
    """列出Google Drive文件夹中的所有图片文件"""
    try:
        # 构建查询条件
        query = f"'{folder_id}' in parents and trashed = false and mimeType contains 'image/'"
        
        # 执行查询
        results = service.files().list(
            q=query,
            fields="files(id, name, mimeType, modifiedTime)"
        ).execute()
        
        files = results.get('files', [])
        logger.info(f"在文件夹 {folder_id} 中找到 {len(files)} 个文件")
        return files
    
    except Exception as e:
        logger.error(f"列出文件夹 {folder_id} 中的文件失败: {e}")
        return []

def download_and_save_file(service, file_id, file_name, target_dir):
    """下载文件并保存到目标目录"""
    try:
        # 确保目标目录存在
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, file_name)
        
        # 检查文件是否已存在并比较修改时间（后续可以实现）
        if os.path.exists(target_path):
            logger.info(f"文件已存在，检查是否需要更新: {target_path}")
            # 这里可以实现检查文件修改时间的逻辑，如果远程文件更新则重新下载
            
        # 下载文件
        request = service.files().get_media(fileId=file_id)
        file_data = io.BytesIO()
        downloader = MediaIoBaseDownload(file_data, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
            logger.debug(f"下载进度: {int(status.progress() * 100)}%")
        
        # 保存文件
        with open(target_path, 'wb') as f:
            f.write(file_data.getvalue())
        
        logger.info(f"成功下载文件到: {target_path}")
        
        # 优化图片
        optimize_image(target_path)
        
        return True
    
    except Exception as e:
        logger.error(f"下载文件 {file_id} 失败: {e}")
        return False

def optimize_image(file_path, max_width=1920, quality=85):
    """优化图片尺寸和质量"""
    try:
        # 检查文件是否为图片
        if not any(file_path.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.webp']):
            logger.info(f"跳过非图片文件优化: {file_path}")
            return
        
        # 打开图片
        img = Image.open(file_path)
        
        # 检查图片是否需要调整大小
        width, height = img.size
        if width > max_width:
            # 计算新高度，保持比例
            new_height = int(height * (max_width / width))
            # 调整图片大小
            img = img.resize((max_width, new_height), Image.LANCZOS)
            logger.info(f"调整图片尺寸: {width}x{height} -> {max_width}x{new_height}")
        
        # 保存优化后的图片
        img.save(file_path, quality=quality, optimize=True)
        logger.info(f"优化图片完成: {file_path}")
    
    except Exception as e:
        logger.error(f"优化图片失败 {file_path}: {e}")

def sync_folder(service, folder_id, target_dir):
    """同步一个文件夹的所有图片"""
    # 获取文件夹中的所有文件
    files = list_folder_files(service, folder_id)
    
    # 统计
    total = len(files)
    success = 0
    
    # 下载每个文件
    for file in files:
        if file['mimeType'] in SUPPORTED_MIMETYPES:
            if download_and_save_file(service, file['id'], file['name'], target_dir):
                success += 1
    
    logger.info(f"文件夹 {folder_id} 同步完成: 成功 {success}/{total}")
    return success

def main():
    """主函数"""
    try:
        # 获取脚本所在目录
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # 获取仓库根目录
        repo_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
        
        logger.info(f"脚本目录: {script_dir}")
        logger.info(f"仓库根目录: {repo_root}")
        
        # 加载文件夹映射
        folder_mappings = load_folder_mappings()
        if not folder_mappings:
            logger.error("没有找到有效的文件夹映射，退出程序")
            return
        
        # 获取Drive服务
        service = get_drive_service()
        
        # 同步每个文件夹
        total_files = 0
        for folder_id, target_dir in folder_mappings.items():
            # 跳过注释
            if folder_id.startswith('#') or target_dir == '注释':
                continue
                
            # 处理相对路径
            full_target_dir = os.path.join(repo_root, target_dir)
            
            logger.info(f"开始同步文件夹: {folder_id} -> {full_target_dir}")
            synced = sync_folder(service, folder_id, full_target_dir)
            total_files += synced
        
        logger.info(f"所有文件夹同步完成，共同步 {total_files} 个文件")
    
    except Exception as e:
        logger.error(f"执行脚本时发生错误: {e}")

if __name__ == "__main__":
    main()

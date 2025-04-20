import os
import json
from pathlib import Path
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
import traceback

# --- 配置 ---
# 本地 JSON 文件存放的基础路径 (相对于脚本)
LOCAL_JSON_BASE_DIR = Path("images")

# 需要处理的画廊类型及其在 R2 上的前缀
GALLERY_CONFIG = {
    "automotive": {"prefix": "images/automotive/", "output_main": "galleries.json", "output_sub": "images.json"},
    "portrait":   {"prefix": "images/portrait/",   "output_main": "galleries.json", "output_sub": "images.json"}
}

# 需要处理的独立图片列表区域及其在 R2 上的前缀和本地输出文件名
DISPLAY_CONFIG = {
    "display_automotive": {"prefix": "images/display/automotive display/", "output_json": "display_automotive.json"},
    "display_portrait":   {"prefix": "images/display/portrait display/",   "output_json": "display_portrait.json"}
}

# 需要处理的对比组区域及其在 R2 上的前缀和本地输出文件名
COMPARISON_CONFIG = {
    "comparison_groups": {"prefix": "images/comparison/", "output_json": "comparison_groups.json"}
}

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
# -------------

# --- Cloudflare R2 配置 (从环境变量读取) ---
R2_ENDPOINT_URL = os.environ.get("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")
R2_PUBLIC_BASE_URL = os.environ.get("R2_PUBLIC_BASE_URL")

missing_vars = []
if not R2_ENDPOINT_URL: missing_vars.append("R2_ENDPOINT_URL")
if not R2_ACCESS_KEY_ID: missing_vars.append("R2_ACCESS_KEY_ID")
if not R2_SECRET_ACCESS_KEY: missing_vars.append("R2_SECRET_ACCESS_KEY")
if not R2_BUCKET_NAME: missing_vars.append("R2_BUCKET_NAME")
if not R2_PUBLIC_BASE_URL: missing_vars.append("R2_PUBLIC_BASE_URL")

if missing_vars:
    print(f"错误：缺少必要的 Cloudflare R2 环境变量配置！请设置: {', '.join(missing_vars)}")
    exit(1)

# --- 初始化 S3 客户端 ---
s3_client = None
try:
    print("正在初始化 R2 客户端...")
    s3_client = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto',
    )
    print("尝试连接 Cloudflare R2 (跳过 ListBuckets 验证)...")
    print(f"  正在尝试获取存储桶 '{R2_BUCKET_NAME}' 的位置信息以验证连接...")
    response = s3_client.get_bucket_location(Bucket=R2_BUCKET_NAME)
    print(f"  存储桶位置信息获取成功 (Status: {response.get('ResponseMetadata', {}).get('HTTPStatusCode')})。连接 R2 成功。")
except Exception as e:
    print(f"错误: 初始化 R2 客户端时发生错误: {e}")
    print(traceback.format_exc())
    exit(1)
# ------------------------

def list_r2_image_urls(bucket: str, prefix: str) -> list[str]:
    """获取 R2 指定前缀下的图片公共 URL 列表"""
    image_urls = []
    if prefix and not prefix.endswith('/'): prefix += '/'
    print(f"    - 正在列出 R2 前缀 '{prefix}' ...")
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
        object_count = 0
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    object_count += 1
                    key = obj['Key']
                    if key != prefix and Path(key).suffix.lower() in SUPPORTED_EXTENSIONS:
                        full_url = f"{R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"
                        image_urls.append(full_url)
        print(f"    - 共找到 {object_count} 个对象, {len(image_urls)} 个是支持的图片。")
    except ClientError as e:
        print(f"  错误: 访问 R2 前缀 '{prefix}' 出错: {e}")
        return []
    except Exception as e:
        print(f"  错误: 列出 R2 对象时未知错误: {e}")
        print(traceback.format_exc())
        return []
    image_urls.sort()
    return image_urls

def get_r2_sub_prefixes(bucket: str, prefix: str) -> list[str]:
    """获取 R2 指定前缀下的一级子目录 (模拟画廊 ID 或对比组 ID)"""
    sub_prefixes = set()
    if prefix and not prefix.endswith('/'): prefix += '/'
    print(f"  - 正在获取 R2 '{prefix}' 下的子目录...")
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix, Delimiter='/')
        for page in pages:
            if 'CommonPrefixes' in page:
                for common_prefix in page['CommonPrefixes']:
                    full_sub_prefix = common_prefix.get('Prefix', '')
                    if full_sub_prefix.startswith(prefix) and full_sub_prefix.endswith('/'):
                         sub_id = full_sub_prefix[len(prefix):].strip('/')
                         if sub_id:
                              sub_prefixes.add(sub_id)
        print(f"  - 共找到 {len(sub_prefixes)} 个子目录 ID。")
        return sorted(list(sub_prefixes))
    except ClientError as e:
        print(f"  错误: 尝试从 R2 列出子目录时出错 (前缀: '{prefix}'): {e}")
        return []
    except Exception as e:
        print(f"  错误: 列出 R2 子目录时未知错误: {e}")
        print(traceback.format_exc())
        return []

def write_json_local(file_path: Path, data: object):
    """将数据写入本地 JSON 文件"""
    try:
        # 确保父目录存在
        file_path.parent.mkdir(parents=True, exist_ok=True)
        script_dir = Path(__file__).parent
        relative_path = file_path.relative_to(script_dir)
        print(f"    DEBUG: 准备写入本地文件: '{relative_path}'")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"    DEBUG: 文件写入完成: '{relative_path}'")
    except OSError as e:
        print(f"  错误: 无法写入 JSON 文件 '{file_path}': {e}")
        print(traceback.format_exc())
    except Exception as e:
        print(f"  错误: 写入 JSON 时发生未知错误: {e}")
        print(traceback.format_exc())

def main():
    """主函数"""
    if s3_client is None:
         print("错误：R2 客户端未成功初始化。")
         return

    script_dir = Path(__file__).parent
    local_base_json_dir = script_dir / LOCAL_JSON_BASE_DIR

    # --- 处理画廊页面 (Automotive, Portrait) ---
    for gallery_type, config in GALLERY_CONFIG.items():
        local_gallery_type_path = local_base_json_dir / gallery_type
        r2_prefix = config['prefix']
        print(f"\n正在处理 '{gallery_type}' 画廊 (从 R2:{R2_BUCKET_NAME} 前缀 '{r2_prefix}')")

        gallery_ids = get_r2_sub_prefixes(R2_BUCKET_NAME, r2_prefix)
        if not gallery_ids:
             print(f"  在 R2 '{r2_prefix}' 下未找到任何画廊子目录，跳过。")
             # 考虑是否清空本地 galleries.json
             # write_json_local(local_gallery_type_path / config['output_main'], [])
             continue

        all_sub_galleries_info = []
        for gallery_id in gallery_ids:
            print(f"  - 正在处理 R2 画廊: {gallery_id}")
            r2_gallery_prefix = f"{r2_prefix}{gallery_id}/"
            image_urls = list_r2_image_urls(R2_BUCKET_NAME, r2_gallery_prefix)

            if image_urls:
                # 在本地生成子画廊的 images.json
                sub_json_path = local_gallery_type_path / gallery_id / config['output_sub']
                write_json_local(sub_json_path, [{"images": image_urls}])

                # 准备主列表信息
                title = gallery_id.replace('_', ' ').title()
                json_file_relative_path = f"{gallery_id}/{config['output_sub']}"
                all_sub_galleries_info.append({
                    "id": gallery_id,
                    "title": title,
                    "jsonFile": json_file_relative_path
                })
            else:
                print(f"    - 在 R2 路径 '{r2_gallery_prefix}' 未找到符合条件的图片。")

        if all_sub_galleries_info:
            main_json_path = local_gallery_type_path / config['output_main']
            write_json_local(main_json_path, all_sub_galleries_info)
            print(f"  - 已更新本地主列表 '{main_json_path.relative_to(script_dir)}'")
        else:
            print(f"  未能在 R2 的 '{r2_prefix}' 路径下找到任何包含图片的画廊。")

    # --- 处理独立图片列表区域 (主页轮播) ---
    for area_name, config in DISPLAY_CONFIG.items():
        r2_prefix = config['prefix']
        local_json_path = local_base_json_dir / config['output_json'] # 直接输出到 images/ 目录下
        print(f"\n正在处理 '{area_name}' 区域 (从 R2:{R2_BUCKET_NAME} 前缀 '{r2_prefix}')")

        image_urls = list_r2_image_urls(R2_BUCKET_NAME, r2_prefix)
        if image_urls:
            # 直接将 URL 列表写入 JSON 文件
            write_json_local(local_json_path, image_urls)
            print(f"  - 已更新本地 JSON '{local_json_path.relative_to(script_dir)}'")
        else:
            print(f"  在 R2 前缀 '{r2_prefix}' 未找到图片。")
            # 考虑是否清空本地 JSON？
            # write_json_local(local_json_path, [])

    # --- 处理对比组区域 ---
    for area_name, config in COMPARISON_CONFIG.items():
        r2_prefix = config['prefix']
        local_json_path = local_base_json_dir / config['output_json']
        print(f"\n正在处理 '{area_name}' 区域 (从 R2:{R2_BUCKET_NAME} 前缀 '{r2_prefix}')")

        comparison_group_ids = get_r2_sub_prefixes(R2_BUCKET_NAME, r2_prefix)
        if not comparison_group_ids:
             print(f"  在 R2 '{r2_prefix}' 下未找到任何对比组子目录，跳过。")
             continue

        all_comparison_groups_data = []
        for group_id in comparison_group_ids:
             print(f"  - 正在处理 R2 对比组: {group_id}")
             r2_group_prefix = f"{r2_prefix}{group_id}/"
             image_urls = list_r2_image_urls(R2_BUCKET_NAME, r2_group_prefix)

             if len(image_urls) >= 2: # 确保至少有两张图片用于对比
                 # 假设按名称排序后，第一张是 before，第二张是 after
                 before_url = image_urls[0]
                 after_url = image_urls[1]
                 # 可以添加简单的检查，比如文件名是否包含 "before"/"after"
                 # if "before" in Path(before_url).name.lower() and "after" in Path(after_url).name.lower():
                 #      pass # 名字符合预期
                 # else:
                 #      print(f"    警告: 对比组 '{group_id}' 的图片名称可能不符合 before/after 约定，按排序取前两张。")

                 all_comparison_groups_data.append({
                     "id": group_id,
                     "before_src": before_url,
                     "after_src": after_url
                 })
                 print(f"    - 已处理对比组，Before: {Path(before_url).name}, After: {Path(after_url).name}")
             elif len(image_urls) == 1:
                 print(f"    警告: 对比组 '{group_id}' 只找到一张图片，无法创建对比。")
             else:
                 print(f"    - 在 R2 路径 '{r2_group_prefix}' 未找到符合条件的图片。")

        if all_comparison_groups_data:
            write_json_local(local_json_path, all_comparison_groups_data)
            print(f"  - 已更新本地对比组 JSON '{local_json_path.relative_to(script_dir)}'")
        else:
            print(f"  未能在 R2 的 '{r2_prefix}' 路径下找到任何有效的对比组。")

    print("\n处理完成！JSON 文件已在本地 Git 仓库中更新（如果内容有变化）。")
    print("请使用 'git status', 'git add', 'git commit', 'git push' 将这些更新推送到 GitHub。")

if __name__ == "__main__":
    main()
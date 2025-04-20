import os
import json
from pathlib import Path
import boto3 # 用于与 S3 兼容 API (如 R2) 交互
from botocore.exceptions import NoCredentialsError, ClientError

# --- 配置 ---
# 本地 JSON 文件存放的基础路径 (相对于脚本)
LOCAL_JSON_BASE_DIR = Path("images")
GALLERY_TYPES = ["automotive", "portrait"] # 需要处理的画廊类型 (对应 R2 上的前缀)
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"} # 支持的图片扩展名 (小写)
SUB_GALLERY_JSON_FILENAME = "images.json" # 本地子画廊JSON文件名
# -------------

# --- Cloudflare R2 配置 (从环境变量读取) ---
R2_ENDPOINT_URL = os.environ.get("R2_ENDPOINT_URL")         # 必须: R2 的 S3 API 端点, 例如 https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")       # 必须: 您生成的 API 令牌的 Access Key ID
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY") # 必须: 您生成的 API 令牌的 Secret Access Key
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")           # 必须: 您的 R2 存储桶名称
R2_PUBLIC_BASE_URL = os.environ.get("R2_PUBLIC_BASE_URL")     # 必须: R2 存储桶的公开访问基础 URL, 例如 https://pub-xxx.r2.dev 或您的自定义域 (结尾不要带 /)

# 检查必要的 R2 配置是否存在
missing_vars = []
if not R2_ENDPOINT_URL: missing_vars.append("R2_ENDPOINT_URL")
if not R2_ACCESS_KEY_ID: missing_vars.append("R2_ACCESS_KEY_ID")
if not R2_SECRET_ACCESS_KEY: missing_vars.append("R2_SECRET_ACCESS_KEY")
if not R2_BUCKET_NAME: missing_vars.append("R2_BUCKET_NAME")
if not R2_PUBLIC_BASE_URL: missing_vars.append("R2_PUBLIC_BASE_URL")

if missing_vars:
    print(f"错误：缺少必要的 Cloudflare R2 环境变量配置！请设置以下变量: {', '.join(missing_vars)}")
    exit(1) # 配置不全则退出脚本

# --- 初始化 S3 客户端 ---
s3_client = None
try:
    s3_client = boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto', # 对于 R2 通常设置为 'auto'
    )
    # 移除了 s3_client.list_buckets() 验证调用以避免权限问题
    print("尝试连接 Cloudflare R2 (跳过 ListBuckets 验证)...") # 修改了打印信息
except NoCredentialsError:
    print("错误: Boto3 无法找到 AWS/R2 凭证。请确保环境变量已正确设置。")
    exit(1)
except ClientError as e:
     # 这里的错误处理可能需要调整，因为 ListBuckets 移除了
     error_code = e.response.get('Error', {}).get('Code')
     if error_code == 'InvalidAccessKeyId' or error_code == 'SignatureDoesNotMatch':
          print(f"错误: R2 API 凭证无效 (Access Key ID 或 Secret Access Key 不正确)。请检查环境变量。 {e}")
     elif error_code == 'AccessDenied':
          print(f"错误: 访问 R2 资源被拒绝。这不应该在初始化时发生（移除了ListBuckets）。 {e}")
     else:
          print(f"错误: 初始化 R2 客户端时发生客户端错误: {e}")
     exit(1)
except Exception as e:
    print(f"错误: 初始化 R2 客户端时发生未知错误: {e}")
    exit(1)
# ------------------------


def list_r2_image_urls(bucket: str, prefix: str) -> list[str]:
    """使用 R2 API 列出指定前缀下的对象，并返回它们的公开 URL 列表"""
    image_urls = []
    # 确保前缀以 / 结尾，以便正确列出目录内容
    if prefix and not prefix.endswith('/'):
        prefix += '/'

    print(f"    - 正在从 R2 存储桶 '{bucket}' 列出前缀 '{prefix}' 下的对象...")
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix)

        object_count = 0
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    object_count += 1
                    key = obj['Key']
                    # 检查是否是支持的文件类型（忽略前缀本身）
                    if key != prefix and Path(key).suffix.lower() in SUPPORTED_EXTENSIONS:
                        # 构建完整的公开 URL
                        full_url = f"{R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"
                        image_urls.append(full_url)

        print(f"    - 在 R2 前缀 '{prefix}' 共找到 {object_count} 个对象，其中 {len(image_urls)} 个是支持的图片。")

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'AccessDenied':
             print(f"  错误: 访问 R2 存储桶 '{bucket}' 前缀 '{prefix}' 被拒绝。请检查 API 令牌权限是否包含列出对象的权限 (通常是 Object Read only 的一部分)。")
        else:
             print(f"  错误: 访问 R2 存储桶 '{bucket}' 前缀 '{prefix}' 时出错: {e}")
        return [] # 返回空列表表示失败
    except Exception as e:
        print(f"  错误: 列出 R2 对象时发生未知错误: {e}")
        return []

    image_urls.sort() # 按 URL 排序
    return image_urls

def generate_local_sub_gallery_json(local_gallery_type_dir: Path, gallery_id: str, image_urls: list[str]):
    """在本地生成子画廊的 JSON 文件 (包含 R2 图片 URL)"""
    local_json_dir = local_gallery_type_dir / gallery_id
    json_file_path = local_json_dir / SUB_GALLERY_JSON_FILENAME
    json_file_path.parent.mkdir(parents=True, exist_ok=True)

    json_data = [{"images": image_urls}]
    try:
        script_dir = Path(__file__).parent
        relative_json_path = json_file_path.relative_to(script_dir)
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        print(f"    - 已更新本地 JSON '{relative_json_path}' (包含 {len(image_urls)} 个 R2 图片 URL)")
    except OSError as e:
        print(f"  错误: 无法写入 JSON 文件 '{json_file_path}': {e}")
    except Exception as e:
        print(f"  错误: 写入 JSON 时发生未知错误: {e}")


def generate_local_main_gallery_json(local_gallery_type_dir: Path, sub_galleries_info: list[dict]):
    """在本地生成主画廊列表的 galleries.json 文件"""
    json_file_path = local_gallery_type_dir / "galleries.json"
    json_file_path.parent.mkdir(parents=True, exist_ok=True)

    sub_galleries_info.sort(key=lambda x: x['id'])
    try:
        script_dir = Path(__file__).parent
        relative_json_path = json_file_path.relative_to(script_dir)
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(sub_galleries_info, f, indent=2, ensure_ascii=False)
        print(f"  - 已更新本地主列表 '{relative_json_path}'")
    except OSError as e:
        print(f"  错误: 无法写入主列表 JSON 文件 '{json_file_path}': {e}")
    except Exception as e:
        print(f"  错误: 写入主列表 JSON 时发生未知错误: {e}")

def get_r2_gallery_ids(bucket: str, gallery_type: str) -> list[str]:
    """动态获取 R2 上指定类型下的画廊 ID (即一级子'目录')"""
    gallery_ids = set()
    prefix = f"images/{gallery_type}/"
    print(f"  - 正在从 R2 获取 '{prefix}' 下的画廊ID...")
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        # 使用 Delimiter='/' 来模拟列出目录
        pages = paginator.paginate(Bucket=bucket, Prefix=prefix, Delimiter='/')

        for page in pages:
            if 'CommonPrefixes' in page:
                for common_prefix in page['CommonPrefixes']:
                    full_prefix = common_prefix.get('Prefix', '')
                    if full_prefix.startswith(prefix) and full_prefix.endswith('/'):
                         gallery_id = full_prefix[len(prefix):].strip('/')
                         if gallery_id:
                              gallery_ids.add(gallery_id)

        print(f"  - 在 R2 '{prefix}' 下共找到 {len(gallery_ids)} 个画廊 ID。")
        return sorted(list(gallery_ids))

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'AccessDenied':
             print(f"  错误: 尝试从 R2 列出画廊 ID 时被拒绝 (前缀: '{prefix}')。请检查 API 令牌是否具有列出存储桶根目录或指定前缀对象的权限。")
        else:
             print(f"  错误: 尝试从 R2 列出画廊 ID 时出错 (前缀: '{prefix}'): {e}")
        return []
    except Exception as e:
        print(f"  错误: 列出 R2 画廊 ID 时发生未知错误: {e}")
        return []


def main():
    """主函数，处理所有画廊类型"""
    if s3_client is None:
         print("错误：R2 客户端未成功初始化。")
         return

    script_dir = Path(__file__).parent
    local_base_json_dir = script_dir / LOCAL_JSON_BASE_DIR # 本地 JSON 文件的根目录

    for gallery_type in GALLERY_TYPES:
        local_gallery_type_path = local_base_json_dir / gallery_type
        print(f"\n正在处理 '{gallery_type}' 画廊 (从 R2:{R2_BUCKET_NAME} 读取列表)")

        # 动态获取 R2 上存在的画廊 ID
        gallery_ids_on_r2 = get_r2_gallery_ids(R2_BUCKET_NAME, gallery_type)

        if not gallery_ids_on_r2:
             print(f"  在 R2 存储桶 '{R2_BUCKET_NAME}' 的 '{gallery_type}' 路径下未找到任何画廊，跳过。")
             # 可以在这里选择删除或清空本地的 galleries.json
             # generate_local_main_gallery_json(local_gallery_type_path, [])
             continue

        all_sub_galleries_info = [] # 存储当前类型下所有子画廊的信息

        # 遍历从 R2 获取到的画廊 ID
        for gallery_id in gallery_ids_on_r2:
            print(f"  - 正在处理 R2 画廊: {gallery_id}")
            r2_gallery_prefix = f"images/{gallery_type}/{gallery_id}/"

            # 从 R2 获取该画廊的图片 URL 列表
            image_urls = list_r2_image_urls(R2_BUCKET_NAME, r2_gallery_prefix)

            if image_urls:
                # 在本地对应的位置生成包含 URL 的 images.json
                generate_local_sub_gallery_json(local_gallery_type_path, gallery_id, image_urls)

                # 准备主列表信息
                title = gallery_id.replace('_', ' ').title()
                json_file_relative_path = f"{gallery_id}/{SUB_GALLERY_JSON_FILENAME}"
                all_sub_galleries_info.append({
                    "id": gallery_id,
                    "title": title,
                    "jsonFile": json_file_relative_path
                })
            else:
                print(f"    - 在 R2 路径 '{r2_gallery_prefix}' 未找到符合条件的图片。")

        # 在本地生成主画廊列表 galleries.json
        if all_sub_galleries_info:
            generate_local_main_gallery_json(local_gallery_type_path, all_sub_galleries_info)
        else:
            print(f"  未能在 R2 的 '{gallery_type}' 路径下找到任何包含图片的画廊。")
            # generate_local_main_gallery_json(local_gallery_type_path, [])

    print("\n处理完成！JSON 文件已在本地 Git 仓库中更新（如果内容有变化）。")
    print("请使用 'git status', 'git add', 'git commit', 'git push' 将这些更新推送到 GitHub。")
    print("GitHub Action 将不再负责生成 JSON，现在只负责部署网站（如果使用 Cloudflare Pages）或自动提交（如果需要）。")

if __name__ == "__main__":
    main()
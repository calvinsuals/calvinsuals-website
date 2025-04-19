import os
import json
from pathlib import Path

# --- 配置 ---
BASE_IMAGE_DIR = Path("images") # 图片库根目录
GALLERY_TYPES = ["automotive", "portrait"] # 需要处理的画廊类型
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"} # 支持的图片扩展名 (小写)
SUB_GALLERY_JSON_FILENAME = "images.json" # 子画廊JSON文件名
# -------------

def find_image_files(directory: Path) -> list[str]:
    """在指定目录查找并返回排序后的图片文件名列表"""
    image_files = []
    if not directory.is_dir():
        return image_files
    try:
        for item in directory.iterdir():
            if item.is_file():
                # 检查扩展名是否支持 (忽略大小写)
                if item.suffix.lower() in SUPPORTED_EXTENSIONS:
                    image_files.append(item.name)
    except OSError as e:
        print(f"  错误: 无法访问目录 {directory}: {e}")
    image_files.sort() # 按文件名排序
    return image_files

def generate_sub_gallery_json(directory: Path, image_files: list[str]):
    """生成子画廊的 JSON 文件"""
    json_file_path = directory / SUB_GALLERY_JSON_FILENAME
    # 使用要求的 JSON 结构
    json_data = [
        {
            "images": image_files
        }
    ]
    try:
        # 使用 utf-8 编码写入，确保中文字符（如果文件名包含）没问题
        with open(json_file_path, 'w', encoding='utf-8') as f:
            # indent=2 用于格式化输出，方便阅读
            # ensure_ascii=False 允许非 ASCII 字符直接写入
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        print(f"    - 已生成 {json_file_path.relative_to(BASE_IMAGE_DIR.parent)} (包含 {len(image_files)} 张图片)")
    except OSError as e:
        print(f"  错误: 无法写入 JSON 文件 {json_file_path}: {e}")

def generate_main_gallery_json(gallery_type_dir: Path, sub_galleries_info: list[dict]):
    """生成主画廊列表的 galleries.json 文件"""
    json_file_path = gallery_type_dir / "galleries.json"
    # 按 'id' (文件夹名) 排序
    sub_galleries_info.sort(key=lambda x: x['id'])
    try:
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(sub_galleries_info, f, indent=2, ensure_ascii=False)
        print(f"  - 已生成主列表 {json_file_path.relative_to(BASE_IMAGE_DIR.parent)}")
    except OSError as e:
        print(f"  错误: 无法写入主列表 JSON 文件 {json_file_path}: {e}")


def main():
    """主函数，处理所有画廊类型"""
    script_dir = Path(__file__).parent # 获取脚本所在的目录
    # 将基础图片目录设置为相对于脚本的位置
    global BASE_IMAGE_DIR
    BASE_IMAGE_DIR = script_dir / "images"

    if not BASE_IMAGE_DIR.is_dir():
        print(f"错误: 基础图片目录 '{BASE_IMAGE_DIR}' 不存在或不是一个目录。请确保 'images' 文件夹与脚本在同一目录下。")
        return

    for gallery_type in GALLERY_TYPES:
        gallery_type_path = BASE_IMAGE_DIR / gallery_type
        print(f"\n正在处理 '{gallery_type}' 画廊: {gallery_type_path}")

        if not gallery_type_path.is_dir():
            print(f"  警告: 目录 '{gallery_type_path}' 不存在，跳过。")
            continue

        all_sub_galleries_info = [] # 存储当前类型下所有子画廊的信息

        try:
            # 遍历画廊类型下的子目录 (即每个子画廊)
            for item in gallery_type_path.iterdir():
                if item.is_dir():
                    sub_gallery_dir = item
                    gallery_id = sub_gallery_dir.name # 文件夹名作为 ID
                    print(f"  - 发现子画廊: {gallery_id}")

                    # 查找子画廊中的图片
                    image_files = find_image_files(sub_gallery_dir)

                    if image_files:
                        # 生成子画廊的 images.json
                        generate_sub_gallery_json(sub_gallery_dir, image_files)

                        # 准备主列表 galleries.json 的信息
                        # 简单的标题生成：用下划线替换空格并首字母大写
                        title = gallery_id.replace('_', ' ').title()
                        # jsonFile 路径是相对于 galleries.json 的
                        json_file_relative_path = f"{gallery_id}/{SUB_GALLERY_JSON_FILENAME}"
                        all_sub_galleries_info.append({
                            "id": gallery_id,
                            "title": title,
                            "jsonFile": json_file_relative_path
                        })
                    else:
                        print(f"    - 在 '{gallery_id}' 中未找到支持的图片文件，跳过生成 {SUB_GALLERY_JSON_FILENAME}。")

            # 生成主画廊列表 galleries.json
            if all_sub_galleries_info:
                generate_main_gallery_json(gallery_type_path, all_sub_galleries_info)
            else:
                print(f"  在 '{gallery_type}' 目录下未找到任何包含图片的子画廊，未生成 galleries.json。")

        except OSError as e:
             print(f"  错误: 处理目录 {gallery_type_path} 时发生错误: {e}")

    print("\n处理完成！")

if __name__ == "__main__":
    main()
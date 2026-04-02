#!/usr/bin/env python3
"""
根据 images/about_modal.json（由 generate_galleries.py 从 R2 列出）更新 index.html 里 About 头像与弹窗图 src。
每个资源对应 R2 子目录内排序后的「最后一张」图片（jpg/webp/png 均在 SUPPORTED_EXTENSIONS 内；同目录多文件时 webp 常优先）。
<img> 需带 data-about-asset="hero"|xiaohongshu1|… 与 JSON 键一致。
与 sync_critical_preload.py 相同的主机替换规则。
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
ABOUT_JSON = ROOT / "images" / "about_modal.json"

R2_PUBLIC_HOST = "pub-67b44c34fdd2480e83feffb3cfc185b9.r2.dev"
R2_CUSTOM_HOST = "img.calvinsuals.com"


def normalize_image_url(url: str) -> str:
    if not url or not isinstance(url, str):
        return url
    return url.replace(R2_PUBLIC_HOST, R2_CUSTOM_HOST)


def load_modal_urls() -> dict[str, str]:
    if not ABOUT_JSON.is_file():
        return {}
    try:
        data = json.loads(ABOUT_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(data, dict):
        return {}
    out: dict[str, str] = {}
    for k, v in data.items():
        if isinstance(k, str) and isinstance(v, str) and v.strip():
            out[k] = normalize_image_url(v.strip())
    return out


def replace_img_src_for_asset(html_text: str, key: str, new_url: str) -> tuple[str, bool]:
    esc = html.escape(new_url, quote=True)
    pattern = re.compile(r"<img\b[^>]+>", re.IGNORECASE)

    def is_target_tag(tag: str) -> bool:
        return f'data-about-asset="{key}"' in tag

    pos = 0
    out_parts: list[str] = []
    replaced = False
    for m in pattern.finditer(html_text):
        tag = m.group(0)
        out_parts.append(html_text[pos : m.start()])
        pos = m.end()
        if not replaced and is_target_tag(tag):
            new_tag, n = re.subn(
                r'(\bsrc=")([^"]*)(")',
                rf"\1{esc}\3",
                tag,
                count=1,
            )
            if n == 0:
                new_tag = tag[:-1] + f' src="{esc}">'
            out_parts.append(new_tag)
            replaced = True
        else:
            out_parts.append(tag)
    out_parts.append(html_text[pos:])
    return "".join(out_parts), replaced


def main() -> None:
    if not INDEX.is_file():
        raise SystemExit(f"Missing {INDEX}")

    urls = load_modal_urls()
    if not urls:
        print("未找到 images/about_modal.json 或其中无 URL，跳过 about 图片 src 同步。")
        return

    text = INDEX.read_text(encoding="utf-8")
    for key, url in urls.items():
        text, ok = replace_img_src_for_asset(text, key, url)
        if ok:
            print(f"已更新 about 图: {key} -> {url[:64]}...")
        else:
            print(f"警告: index.html 中未找到 data-about-asset=\"{key}\" 的 <img>，跳过。")

    INDEX.write_text(text, encoding="utf-8")
    print("已根据 about_modal.json 写入 index.html About 头像与弹窗图片地址。")


if __name__ == "__main__":
    main()

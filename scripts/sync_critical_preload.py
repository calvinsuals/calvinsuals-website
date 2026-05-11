#!/usr/bin/env python3
"""
根据 JSON 更新 index.html 内 CRITICAL-PRELOAD：仅桌面端图片 preload（不使用 as=fetch 的 preload，避免 Chrome 清历史后与普通配置文件的缓存/恢复交互异常）。
与 js/main.js 中 normalizeImageUrl 使用相同主机替换规则。
本地改完 images/*.json 后执行：python scripts/sync_critical_preload.py
GitHub Actions 在 generate_galleries.py 之后会运行本脚本并一并提交 index.html。
"""
from __future__ import annotations

import json
import re
import html
from pathlib import Path
from urllib.parse import quote, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

R2_PUBLIC_HOST = "pub-67b44c34fdd2480e83feffb3cfc185b9.r2.dev"
R2_CUSTOM_HOST = "img.calvinsuals.com"


def normalize_image_url(url: str) -> str:
    if not url or not isinstance(url, str):
        return url
    return url.replace(R2_PUBLIC_HOST, R2_CUSTOM_HOST)


def first_list_url(json_path: Path) -> str:
    if not json_path.is_file():
        return ""
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return ""
    if isinstance(data, list) and data and isinstance(data[0], str):
        return normalize_image_url(data[0])
    return ""


def first_comparison_pair_urls(json_path: Path) -> tuple[str, str]:
    """comparison_groups.json 首组 before/after，供滚到对比区前预加载。"""
    if not json_path.is_file():
        return "", ""
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return "", ""
    if not isinstance(data, list) or not data or not isinstance(data[0], dict):
        return "", ""
    g = data[0]
    b = g.get("before_src") or ""
    a = g.get("after_src") or ""
    if isinstance(b, str):
        b = normalize_image_url(b)
    else:
        b = ""
    if isinstance(a, str):
        a = normalize_image_url(a)
    else:
        a = ""
    return b, a


def preload_href(url: str) -> str:
    """路径中含空格等时编码，与浏览器请求一致。"""
    p = urlparse(url)
    encoded_path = quote(p.path, safe="/")
    rebuilt = urlunparse((p.scheme, p.netloc, encoded_path, p.params, p.query, p.fragment))
    return html.escape(rebuilt, quote=False)


def build_preload_lines() -> list[str]:
    lines: list[str] = []

    auto = first_list_url(ROOT / "images" / "display_automotive.json")
    portrait = first_list_url(ROOT / "images" / "display_portrait.json")
    cb, ca = first_comparison_pair_urls(ROOT / "images" / "comparison_groups.json")
    desktop_media = ' media="(min-width: 768px)"'

    if auto:
        lines.append(
            f'    <link rel="preload" as="image" fetchpriority="high"{desktop_media} href="{preload_href(auto)}">'
        )

    if cb or ca or portrait:
        lines.append(
            "    <!-- 桌面再抢对比双图 + 人像首图；手机由 main.js 错峰加载 -->"
        )
    if cb:
        lines.append(
            f'    <link rel="preload" as="image" fetchpriority="high"{desktop_media} href="{preload_href(cb)}">'
        )
    if ca:
        lines.append(
            f'    <link rel="preload" as="image" fetchpriority="high"{desktop_media} href="{preload_href(ca)}">'
        )
    if portrait:
        lines.append(
            f'    <link rel="preload" as="image"{desktop_media} href="{preload_href(portrait)}">'
        )

    return lines


def main() -> None:
    if not INDEX.is_file():
        raise SystemExit(f"Missing {INDEX}")

    inner_lines = build_preload_lines()
    if not inner_lines:
        inner = "    <!-- sync_critical_preload: 未找到 display JSON 首图 URL -->"
    else:
        inner = "\n".join(inner_lines)

    text = INDEX.read_text(encoding="utf-8")
    start = "<!-- CRITICAL-PRELOAD:START -->"
    end = "<!-- CRITICAL-PRELOAD:END -->"
    if start not in text or end not in text:
        raise SystemExit(f"{INDEX} 缺少 {start} / {end} 标记")

    pattern = re.compile(
        re.escape(start) + r".*?" + re.escape(end),
        flags=re.DOTALL,
    )
    replacement = f"{start}\n{inner}\n    {end}"
    new_text, n = pattern.subn(replacement, text, count=1)
    if n != 1:
        raise SystemExit("未能替换 CRITICAL-PRELOAD 区块（请检查标记是否唯一）")

    INDEX.write_text(new_text, encoding="utf-8")
    print("已更新 index.html 内 CRITICAL-PRELOAD（仅桌面图片 preload，无 JSON preload）")


if __name__ == "__main__":
    main()

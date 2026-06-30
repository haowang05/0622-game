"""
素材裁剪脚本 - 将 2800x1840 的透明 PNG 素材按有效像素裁剪
生成裁剪后的图片和 JSON 定位清单（manifest.json）

用法：python crop_assets.py
输出：code/assets/cropped/ (裁剪后图片)
      code/assets/manifest.json (定位清单)
"""

import os
import json
from PIL import Image

# === 配置 ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "assets", "cropped")
MANIFEST_PATH = os.path.join(SCRIPT_DIR, "assets", "manifest.json")
PADDING = 2  # 裁剪边缘留白像素，防止边缘被截断
CANVAS_W = 2800
CANVAS_H = 1840

# 背景文件名关键词 —— 背景不做裁剪
BG_KEYWORDS = ["背景", "亮背景", "原背景", "background"]

# 需要处理的文件夹列表（按场景编号）
SCENE_FOLDERS = [
    "1", "2", "3", "4", "5,7", "6", "8", "9,11", "10",
    "12", "13", "14，16", "15", "17，21", "18，20", "19",
    "22", "23最终", "图标"
]


def is_background(filename):
    """判断是否是背景图"""
    name = os.path.splitext(filename)[0].lower()
    return any(kw in name for kw in BG_KEYWORDS)


def crop_image(img, padding=PADDING):
    """裁剪图片到有效像素区域"""
    bbox = img.getbbox()
    if bbox is None:
        return None, None  # 全透明图片

    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(img.width, bbox[2] + padding)
    bottom = min(img.height, bbox[3] + padding)

    cropped = img.crop((left, top, right, bottom))
    offset = {"x": left, "y": top}
    return cropped, offset


def process_folder(folder_name, folder_path, manifest):
    """处理单个场景文件夹"""
    entries = {}

    for root, dirs, files in os.walk(folder_path):
        for filename in sorted(files):
            if not filename.lower().endswith(".png"):
                continue

            src_path = os.path.join(root, filename)
            # 计算相对路径（相对于场景文件夹）
            rel_to_scene = os.path.relpath(src_path, folder_path)
            rel_to_source = os.path.relpath(src_path, SOURCE_DIR)

            try:
                img = Image.open(src_path)
            except Exception as e:
                print(f"  [SKIP] {rel_to_source}: {e}")
                continue

            if img.mode != "RGBA":
                img = img.convert("RGBA")

            entry = {
                "original_width": img.width,
                "original_height": img.height,
            }

            if is_background(filename):
                # 背景图不裁剪
                # 复制到输出目录
                out_subdir = os.path.join(OUTPUT_DIR, folder_name)
                if "/" in rel_to_scene or "\\" in rel_to_scene:
                    out_subdir = os.path.join(OUTPUT_DIR, folder_name, os.path.dirname(rel_to_scene))
                os.makedirs(out_subdir, exist_ok=True)
                out_path = os.path.join(out_subdir, filename)
                img.save(out_path, "PNG", optimize=True)

                entry["is_background"] = True
                entry["cropped"] = False
                entry["width"] = img.width
                entry["height"] = img.height
                entry["offset"] = {"x": 0, "y": 0}
                entry["output_path"] = os.path.relpath(out_path, os.path.dirname(MANIFEST_PATH))
            else:
                # 非背景图 → 裁剪
                cropped, offset = crop_image(img)
                if cropped is None:
                    print(f"  [SKIP] {rel_to_source}: fully transparent")
                    continue

                out_subdir = os.path.join(OUTPUT_DIR, folder_name)
                if "/" in rel_to_scene or "\\" in rel_to_scene:
                    out_subdir = os.path.join(OUTPUT_DIR, folder_name, os.path.dirname(rel_to_scene))
                os.makedirs(out_subdir, exist_ok=True)
                out_path = os.path.join(out_subdir, filename)
                cropped.save(out_path, "PNG", optimize=True)

                # 计算文件大小对比
                orig_size = os.path.getsize(src_path)
                crop_size = os.path.getsize(out_path)

                entry["is_background"] = False
                entry["cropped"] = True
                entry["width"] = cropped.width
                entry["height"] = cropped.height
                entry["offset"] = offset
                entry["output_path"] = os.path.relpath(out_path, os.path.dirname(MANIFEST_PATH))
                entry["file_size_reduction"] = f"{(1 - crop_size / max(orig_size, 1)) * 100:.0f}%"

                print(f"  [OK] {rel_to_source}: {img.width}x{img.height} → {cropped.width}x{cropped.height} (offset: {offset['x']},{offset['y']}) -{entry['file_size_reduction']}")

            # 使用相对路径作为 key
            key = rel_to_source.replace("\\", "/")
            entries[key] = entry

    return entries


def main():
    print("=" * 60)
    print("素材裁剪工具")
    print(f"源目录: {SOURCE_DIR}")
    print(f"输出目录: {OUTPUT_DIR}")
    print(f"清单文件: {MANIFEST_PATH}")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)

    manifest = {
        "canvas": {"width": CANVAS_W, "height": CANVAS_H},
        "padding": PADDING,
        "scenes": {}
    }

    total_cropped = 0
    total_skipped = 0

    for folder_name in SCENE_FOLDERS:
        # 处理中文逗号和英文逗号
        folder_actual = folder_name
        folder_path = os.path.join(SOURCE_DIR, folder_actual)
        if not os.path.isdir(folder_path):
            # 尝试替换逗号
            for alt in [folder_name.replace("，", ","), folder_name.replace(",", "，")]:
                folder_path = os.path.join(SOURCE_DIR, alt)
                if os.path.isdir(folder_path):
                    folder_actual = alt
                    break

        if not os.path.isdir(folder_path):
            print(f"[WARN] Folder not found: {folder_name}")
            total_skipped += 1
            continue

        print(f"\n[{folder_name}] Processing...")
        entries = process_folder(folder_actual, folder_path, manifest)
        manifest["scenes"][folder_name] = entries
        total_cropped += sum(1 for e in entries.values() if e.get("cropped"))

    # 处理根目录的色谱文件
    spectrum_path = os.path.join(SOURCE_DIR, "色谱.png")
    if os.path.exists(spectrum_path):
        img = Image.open(spectrum_path)
        out_path = os.path.join(OUTPUT_DIR, "色谱.png")
        img.save(out_path, "PNG", optimize=True)
        manifest["scenes"]["_root"] = {
            "色谱.png": {
                "original_width": img.width,
                "original_height": img.height,
                "is_background": True,
                "cropped": False,
                "width": img.width,
                "height": img.height,
                "offset": {"x": 0, "y": 0},
                "output_path": os.path.relpath(out_path, os.path.dirname(MANIFEST_PATH))
            }
        }

    # 保存 manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"完成！裁剪了 {total_cropped} 个文件")
    print(f"清单已保存到: {MANIFEST_PATH}")
    print(f"裁剪文件已保存到: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()

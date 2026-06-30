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
REFERENCE_MANIFEST = os.path.abspath(os.path.join(
    SCRIPT_DIR, '..', '..', '项目三学生版本', 'code', 'manifest_curl.json'
))
REFERENCE_CROPPED = os.path.abspath(os.path.join(
    SCRIPT_DIR, '..', '..', '项目三学生版本', 'code', 'assets', 'cropped'
))
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


def to_manifest_output_path(*parts):
    """与学生版 manifest 一致：output_path 使用反斜杠。"""
    clean = [p.replace("\\", "/").strip("/") for p in parts if p and p not in (".", "")]
    return "cropped\\" + "\\".join(clean)


def make_output_path(folder_name, rel_to_scene, filename):
    subdir = os.path.dirname(rel_to_scene)
    if subdir and subdir != ".":
        return to_manifest_output_path(folder_name, subdir, filename)
    return to_manifest_output_path(folder_name, filename)


def normalize_output_path(output_path):
    return output_path.replace("\\", "/")


def merge_reference_assets(manifest):
    """合并学生版 reference 中源目录缺失、但 cropped 已存在的补充素材。"""
    if not os.path.isfile(REFERENCE_MANIFEST):
        print(f"[WARN] Reference manifest not found: {REFERENCE_MANIFEST}")
        return 0

    with open(REFERENCE_MANIFEST, "r", encoding="utf-8") as f:
        reference = json.load(f)

    merged = 0
    for scene_key, entries in reference.get("scenes", {}).items():
        if scene_key not in manifest["scenes"]:
            manifest["scenes"][scene_key] = {}

        for asset_name, ref_entry in entries.items():
            if asset_name in manifest["scenes"][scene_key]:
                continue

            ref_rel = normalize_output_path(ref_entry["output_path"])
            ref_abs = os.path.join(os.path.dirname(REFERENCE_MANIFEST), "..", "assets", ref_rel)
            ref_abs = os.path.normpath(ref_abs)
            if not os.path.isfile(ref_abs):
                ref_abs = os.path.join(REFERENCE_CROPPED, os.path.relpath(ref_rel, "cropped"))
            if not os.path.isfile(ref_abs):
                print(f"  [SKIP REF] missing cropped file: {ref_rel}")
                continue

            out_rel = ref_rel
            out_abs = os.path.join(os.path.dirname(MANIFEST_PATH), out_rel)
            os.makedirs(os.path.dirname(out_abs), exist_ok=True)
            if not os.path.isfile(out_abs):
                with open(ref_abs, "rb") as src, open(out_abs, "wb") as dst:
                    dst.write(src.read())

            entry = {k: v for k, v in ref_entry.items() if k != "output_path"}
            entry["output_path"] = ref_entry["output_path"].replace("/", "\\")
            manifest["scenes"][scene_key][asset_name] = entry
            merged += 1
            print(f"  [REF] {asset_name}: {entry['width']}x{entry['height']} offset {entry['offset']}")

    return merged


def verify_against_reference(manifest):
    """对比当前 manifest 与学生版 reference 的几何信息。"""
    if not os.path.isfile(REFERENCE_MANIFEST):
        return

    with open(REFERENCE_MANIFEST, "r", encoding="utf-8") as f:
        reference = json.load(f)

    compare_fields = [
        "width", "height", "offset", "cropped", "is_background",
        "original_width", "original_height"
    ]
    mismatches = []
    missing = []
    assets_base = os.path.dirname(MANIFEST_PATH)

    for scene_key, entries in reference.get("scenes", {}).items():
        for asset_name, ref_entry in entries.items():
            cur_entry = manifest.get("scenes", {}).get(scene_key, {}).get(asset_name)
            if not cur_entry:
                missing.append(f"{scene_key}/{asset_name}")
                continue
            for field in compare_fields:
                if cur_entry.get(field) != ref_entry.get(field):
                    mismatches.append(
                        (f"{scene_key}/{asset_name}", field, cur_entry.get(field), ref_entry.get(field))
                    )

            out_rel = normalize_output_path(cur_entry["output_path"])
            out_abs = os.path.join(assets_base, out_rel)
            if not os.path.isfile(out_abs):
                missing.append(f"file:{out_rel}")

    print(f"\n[VERIFY] missing vs reference: {len(missing)}")
    for item in missing[:10]:
        print(f"  - {item}")
    if len(missing) > 10:
        print(f"  ... and {len(missing) - 10} more")

    print(f"[VERIFY] geometry mismatches vs reference: {len(mismatches)}")
    for item in mismatches[:10]:
        print(f"  - {item[0]} | {item[1]}: {item[2]} vs {item[3]}")
    if len(mismatches) > 10:
        print(f"  ... and {len(mismatches) - 10} more")


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
                entry["output_path"] = make_output_path(folder_name, rel_to_scene, filename)
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
                entry["output_path"] = make_output_path(folder_name, rel_to_scene, filename)
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
                "output_path": "cropped\\色谱.png"
            }
        }

    print("\n[REF] Merging supplemental assets from student reference...")
    merged = merge_reference_assets(manifest)

    # 保存 manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    verify_against_reference(manifest)

    print(f"\n{'=' * 60}")
    print(f"完成！裁剪了 {total_cropped} 个文件，补充合并 {merged} 个 reference 素材")
    print(f"清单已保存到: {MANIFEST_PATH}")
    print(f"裁剪文件已保存到: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()

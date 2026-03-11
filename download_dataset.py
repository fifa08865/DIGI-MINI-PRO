"""
download_dataset.py — ดาวน์โหลด Banana Ripeness Dataset จาก Roboflow
===================================================================
ใช้สำหรับดาวน์โหลด dataset สำหรับ train YOLOv8 Classification Model

วิธีใช้:
    python download_dataset.py

หมายเหตุ:
    - ต้องมี Roboflow API Key (สมัครฟรีที่ https://roboflow.com)
    - Dataset จะถูกบันทึกในโฟลเดอร์ dataset/
    - ถ้ายังไม่มี API Key สามารถดาวน์โหลดด้วยตัวเองจาก Roboflow website
      แล้ววางรูปในโครงสร้าง dataset/train/{class_name}/ ได้เลย
"""

import os
import sys
import shutil
from pathlib import Path


def create_sample_structure():
    """สร้างโครงสร้างโฟลเดอร์ dataset ตัวอย่าง"""
    base = Path("dataset")
    classes = ["unripe", "ripe", "overripe"]
    splits = ["train", "valid", "test"]

    for split in splits:
        for cls in classes:
            folder = base / split / cls
            folder.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("📁 สร้างโครงสร้างโฟลเดอร์ dataset เรียบร้อย!")
    print("=" * 60)
    print()
    print("โครงสร้าง:")
    print("  dataset/")
    for split in splits:
        print(f"  ├── {split}/")
        for i, cls in enumerate(classes):
            connector = "└──" if i == len(classes) - 1 else "├──"
            print(f"  │   {connector} {cls}/")
    print()
    print("📌 กรุณาใส่รูปกล้วยในแต่ละโฟลเดอร์ตามระดับความสุก:")
    print("   - unripe/   → รูปกล้วยดิบ (สีเขียว)")
    print("   - ripe/     → รูปกล้วยสุก (สีเหลือง)")
    print("   - overripe/ → รูปกล้วยสุกเกินไป (มีจุดน้ำตาล/ดำ)")
    print()
    print("💡 แนะนำ: ใส่รูปอย่างน้อย 50 รูปต่อคลาสสำหรับ train")
    print("          อย่างน้อย 10 รูปต่อคลาสสำหรับ valid และ test")


def download_from_roboflow(api_key: str):
    """ดาวน์โหลด dataset จาก Roboflow"""
    try:
        from roboflow import Roboflow
    except ImportError:
        print("❌ ไม่พบ roboflow package กรุณาติดตั้ง:")
        print("   pip install roboflow")
        sys.exit(1)

    print("🔄 กำลังเชื่อมต่อ Roboflow...")

    try:
        rf = Roboflow(api_key=api_key)

        # ใช้ public banana ripeness classification dataset จาก Roboflow Universe
        # workspace: roboflow-universe-projects
        # project: banana-ripeness-classification
        print("📦 กำลังดาวน์โหลด dataset จาก Roboflow Universe...")
        print("   Workspace: roboflow-universe-projects")
        print("   Project:   banana-ripeness-classification")
        print()

        project = rf.workspace("roboflow-universe-projects").project("banana-ripeness-classification")

        # ดึง version ล่าสุด
        version = project.version(1)

        # ดาวน์โหลดเป็น classification folder format
        dataset = version.download("folder", location="dataset_raw")

    except Exception as e:
        error_msg = str(e)
        print(f"❌ เกิดข้อผิดพลาด: {error_msg}")
        print()

        if "401" in error_msg or "Unauthorized" in error_msg or "Invalid" in error_msg:
            print("🔑 API Key ไม่ถูกต้อง หรือหมดอายุ")
            print("   สมัครใหม่ได้ที่: https://app.roboflow.com/settings/api")
        elif "404" in error_msg or "not found" in error_msg.lower():
            print("📦 ไม่พบ dataset — ลองดาวน์โหลดเองจาก:")
            print("   https://universe.roboflow.com/roboflow-universe-projects/banana-ripeness-classification")
        else:
            print("🔧 ลองวิธีอื่น:")
            print("   1. ดาวน์โหลดเองจาก Roboflow website")
            print("   2. เลือกตัวเลือก 2 (สร้างโฟลเดอร์เปล่า) แล้วใส่รูปเอง")
        print()
        print("📥 วิธีดาวน์โหลดเอง:")
        print("   1. ไปที่ https://universe.roboflow.com")
        print("   2. ค้นหา 'banana ripeness classification'")
        print("   3. คลิก Download Dataset > Format: Folder Classification")
        print("   4. แตกไฟล์ zip แล้ววางในโฟลเดอร์ dataset/")
        return

    # จัดโครงสร้างใหม่ให้ตรงกับ YOLOv8 classification format
    raw_path = Path("dataset_raw")
    dest_path = Path("dataset")

    if dest_path.exists():
        shutil.rmtree(dest_path)

    # ค้นหาโฟลเดอร์ที่มี train/valid/test
    source_root = raw_path
    # Roboflow อาจสร้างโฟลเดอร์ย่อยลงไปอีกชั้น
    for sub in raw_path.rglob("train"):
        if sub.is_dir():
            source_root = sub.parent
            break

    copied = False
    for split in ["train", "valid", "test"]:
        src = source_root / split
        if src.exists():
            shutil.copytree(src, dest_path / split)
            copied = True

    if not copied:
        # ถ้าไม่เจอ train/valid/test ให้ copy ทุกอย่างเป็น train
        print("⚠️  ไม่พบโครงสร้าง train/valid/test — คัดลอกทุกอย่างเป็น train/")
        if raw_path.exists():
            shutil.copytree(raw_path, dest_path / "train")
            copied = True

    # Cleanup
    if raw_path.exists():
        shutil.rmtree(raw_path)

    if copied:
        print("✅ ดาวน์โหลด dataset เรียบร้อย!")
        print_dataset_stats()
    else:
        print("❌ ไม่สามารถจัดโครงสร้าง dataset ได้")
        print("   กรุณาดาวน์โหลดเองแล้ววางใน dataset/")


def download_manual_instructions():
    """แสดงวิธีดาวน์โหลด dataset ด้วยตัวเอง"""
    print()
    print("=" * 60)
    print("📥 วิธีดาวน์โหลด Dataset ด้วยตัวเอง")
    print("=" * 60)
    print()
    print("วิธีที่ 1: จาก Roboflow Universe")
    print("─" * 40)
    print("  1. เปิด: https://universe.roboflow.com/roboflow-universe-projects/banana-ripeness-classification")
    print("  2. คลิก 'Download Dataset'")
    print("  3. เลือก Format: 'Folder Classification'")
    print("  4. ดาวน์โหลด zip แล้วแตกไฟล์")
    print("  5. วางไฟล์ใน dataset/ ตามโครงสร้างนี้:")
    print("     dataset/train/unripe/  ← รูปกล้วยดิบ")
    print("     dataset/train/ripe/    ← รูปกล้วยสุก")
    print("     dataset/train/overripe/ ← รูปกล้วยงอม")
    print()
    print("วิธีที่ 2: จาก Google Images")
    print("─" * 40)
    print("  1. ค้นหา 'green unripe banana' → บันทึกใน dataset/train/unripe/")
    print("  2. ค้นหา 'ripe yellow banana'  → บันทึกใน dataset/train/ripe/")
    print("  3. ค้นหา 'overripe brown banana' → บันทึกใน dataset/train/overripe/")
    print("  4. แนะนำอย่างน้อย 50 รูปต่อคลาส")
    print()
    print("วิธีที่ 3: จาก Kaggle")
    print("─" * 40)
    print("  1. เปิด: https://www.kaggle.com/datasets")
    print("  2. ค้นหา 'banana ripeness'")
    print("  3. ดาวน์โหลดแล้วจัดโฟลเดอร์ตามข้างบน")
    print()

    # สร้างโฟลเดอร์ให้เลย
    create_now = input("ต้องการสร้างโครงสร้างโฟลเดอร์เปล่าตอนนี้? (y/n): ").strip().lower()
    if create_now == 'y':
        create_sample_structure()


def print_dataset_stats():
    """แสดงสถิติ dataset"""
    base = Path("dataset")
    if not base.exists():
        print("❌ ไม่พบโฟลเดอร์ dataset/")
        return

    print()
    print("=" * 60)
    print("📊 สถิติ Dataset")
    print("=" * 60)

    total = 0
    for split in ["train", "valid", "test"]:
        split_path = base / split
        if not split_path.exists():
            continue

        split_total = 0
        print(f"\n  {split.upper()}:")
        for cls_dir in sorted(split_path.iterdir()):
            if cls_dir.is_dir():
                # นับทุกไฟล์รูปภาพ
                extensions = ['*.jpg', '*.jpeg', '*.png', '*.webp', '*.JPG', '*.JPEG', '*.PNG']
                count = 0
                for ext in extensions:
                    count += len(list(cls_dir.glob(ext)))
                print(f"    {cls_dir.name:15s} → {count:>5d} รูป")
                split_total += count
        print(f"    {'รวม':15s} → {split_total:>5d} รูป")
        total += split_total

    print(f"\n  {'รวมทั้งหมด':17s} → {total:>5d} รูป")
    print("=" * 60)


def main():
    print()
    print("🍌 Banana Ripeness Dataset Downloader")
    print("=" * 60)
    print()
    print("เลือกวิธีดาวน์โหลด:")
    print("  1. ดาวน์โหลดจาก Roboflow (ต้องมี API Key)")
    print("  2. สร้างโครงสร้างโฟลเดอร์เปล่า (ใส่รูปเอง)")
    print("  3. แสดงสถิติ dataset ที่มีอยู่")
    print("  4. แสดงวิธีดาวน์โหลด dataset ด้วยตัวเอง")
    print()

    choice = input("เลือก (1/2/3/4): ").strip()

    if choice == "1":
        print()
        print("📌 สมัคร API Key ฟรีที่: https://app.roboflow.com/settings/api")
        print()
        api_key = input("กรุณาใส่ Roboflow API Key: ").strip()
        if not api_key:
            print("❌ ไม่ได้ใส่ API Key")
            sys.exit(1)
        download_from_roboflow(api_key)
    elif choice == "2":
        create_sample_structure()
    elif choice == "3":
        print_dataset_stats()
    elif choice == "4":
        download_manual_instructions()
    else:
        print("❌ ตัวเลือกไม่ถูกต้อง")
        sys.exit(1)


if __name__ == "__main__":
    main()

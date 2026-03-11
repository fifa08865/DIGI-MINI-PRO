"""
train.py — Train YOLOv8 Classification Model สำหรับตรวจจับความสุกของกล้วย
========================================================================
ใช้ Ultralytics YOLOv8 Classification เพื่อ train model บน banana dataset

วิธีใช้:
    python train.py

ผลลัพธ์:
    - Model จะถูกบันทึกที่ runs/classify/banana_ripeness/weights/best.pt
    - Confusion Matrix, Training Curves, และ Metrics อยู่ในโฟลเดอร์เดียวกัน
"""

import os
import sys
from pathlib import Path
from ultralytics import YOLO


def check_dataset():
    """ตรวจสอบว่ามี dataset พร้อมหรือยัง"""
    dataset_path = Path("dataset")

    if not dataset_path.exists():
        print("❌ ไม่พบโฟลเดอร์ dataset/")
        print("   กรุณารัน: python download_dataset.py")
        return False

    train_path = dataset_path / "train"
    if not train_path.exists():
        print("❌ ไม่พบโฟลเดอร์ dataset/train/")
        print("   กรุณารัน: python download_dataset.py")
        return False

    # ตรวจสอบว่ามีรูปภาพ
    total_images = 0
    classes = []
    for cls_dir in sorted(train_path.iterdir()):
        if cls_dir.is_dir():
            count = len(list(cls_dir.glob("*")))
            if count > 0:
                classes.append(cls_dir.name)
                total_images += count

    if total_images == 0:
        print("❌ ไม่พบรูปภาพใน dataset/train/")
        print("   กรุณาใส่รูปกล้วยในโฟลเดอร์ตามระดับความสุก")
        return False

    print(f"✅ พบ dataset: {total_images} รูป, {len(classes)} คลาส ({', '.join(classes)})")
    return True


def train():
    """Train YOLOv8 Classification Model"""
    print()
    print("🍌 Banana Ripeness — YOLOv8 Classification Training")
    print("=" * 60)
    print()

    # ตรวจสอบ dataset
    if not check_dataset():
        sys.exit(1)

    # =============================================
    # ⚙️ Hyperparameters — ปรับได้ตามต้องการ
    # =============================================
    MODEL_SIZE = "yolov8n-cls"    # nano model (เล็ก เร็ว) ตัวเลือก: yolov8n-cls, yolov8s-cls, yolov8m-cls
    EPOCHS = 50                    # จำนวนรอบ train (เพิ่มได้ถ้าต้องการ accuracy สูงขึ้น)
    IMAGE_SIZE = 224               # ขนาดรูป (224 เป็นมาตรฐาน classification)
    BATCH_SIZE = 16                # ขนาด batch (ลดลงถ้า GPU memory ไม่พอ)
    PATIENCE = 15                  # หยุด train อัตโนมัติถ้า accuracy ไม่เพิ่มขึ้น
    PROJECT_NAME = "runs/classify"
    RUN_NAME = "banana_ripeness"

    print(f"  📐 Model:      {MODEL_SIZE}")
    print(f"  🔄 Epochs:     {EPOCHS}")
    print(f"  📷 Image Size: {IMAGE_SIZE}px")
    print(f"  📦 Batch Size: {BATCH_SIZE}")
    print(f"  ⏱️  Patience:   {PATIENCE}")
    print(f"  💾 Save to:    {PROJECT_NAME}/{RUN_NAME}/")
    print()

    # โหลด pretrained model
    print("📥 กำลังโหลด pretrained model...")
    model = YOLO(f"{MODEL_SIZE}.pt")

    # เริ่ม training
    print("🚀 เริ่ม training...")
    print()

    results = model.train(
        data="dataset",
        epochs=EPOCHS,
        imgsz=IMAGE_SIZE,
        batch=BATCH_SIZE,
        patience=PATIENCE,
        project=PROJECT_NAME,
        name=RUN_NAME,
        exist_ok=True,
        pretrained=True,
        optimizer="Adam",
        lr0=0.001,
        verbose=True,
    )

    # แสดงผลลัพธ์
    print()
    print("=" * 60)
    print("✅ Training เสร็จสิ้น!")
    print("=" * 60)
    print()

    # ตรวจสอบว่า model ถูกบันทึกหรือไม่
    best_model = Path(PROJECT_NAME) / RUN_NAME / "weights" / "best.pt"
    last_model = Path(PROJECT_NAME) / RUN_NAME / "weights" / "last.pt"

    if best_model.exists():
        print(f"  🏆 Best Model:  {best_model}")
        print(f"  📄 Last Model:  {last_model}")
    else:
        print("  ⚠️  ไม่พบ model file — อาจเกิดข้อผิดพลาดระหว่าง training")

    # แสดง path ของผลลัพธ์อื่นๆ
    results_dir = Path(PROJECT_NAME) / RUN_NAME
    print()
    print("  📊 ผลลัพธ์ทั้งหมดอยู่ที่:")
    print(f"     {results_dir.absolute()}")
    print()
    print("  ไฟล์สำคัญ:")
    important_files = [
        "confusion_matrix.png",
        "confusion_matrix_normalized.png",
        "results.png",
        "results.csv",
    ]
    for f in important_files:
        fpath = results_dir / f
        status = "✅" if fpath.exists() else "❌"
        print(f"     {status} {f}")

    print()
    print("🎯 ขั้นตอนถัดไป:")
    print("   1. ตรวจสอบ confusion_matrix.png เพื่อดูความแม่นยำ")
    print("   2. รัน: python predict.py <path_to_image>")
    print("   3. รัน: streamlit run app.py  เพื่อเปิด Web UI")
    print()


if __name__ == "__main__":
    train()

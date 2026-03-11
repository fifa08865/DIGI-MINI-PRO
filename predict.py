"""
predict.py — ทำนายความสุกของกล้วยจากรูปภาพ ด้วย YOLOv8
======================================================
ใช้ trained model ทำนายระดับความสุกของกล้วยจากรูปภาพ

วิธีใช้:
    python predict.py <path_to_image>
    python predict.py banana.jpg
    python predict.py images/test1.png images/test2.jpg

ตัวเลือก:
    --model <path>   กำหนด path ของ model (default: runs/classify/banana_ripeness/weights/best.pt)
    --conf <float>   กำหนด confidence threshold (default: 0.25)
"""

import sys
import argparse
from pathlib import Path
from ultralytics import YOLO


# ข้อมูลแต่ละระดับความสุก
RIPENESS_INFO = {
    "unripe": {
        "thai": "ยังไม่สุก 🟢",
        "emoji": "🟢🍌",
        "description": "กล้วยยังเขียวอยู่ ต้องรออีกหลายวันกว่าจะสุก",
        "tip": "เก็บไว้ในอุณหภูมิห้อง หรือใส่ถุงกระดาษเพื่อเร่งให้สุก",
    },
    "ripe": {
        "thai": "สุกแล้ว 🟡",
        "emoji": "🟠🍌",
        "description": "กล้วยสุกพอดี พร้อมรับประทาน!",
        "tip": "รับประทานได้เลย หรือเก็บในตู้เย็นเพื่อยืดอายุ 2-3 วัน",
    },
    "overripe": {
        "thai": "สุกเกินไป 🟤",
        "emoji": "🟤🍌",
        "description": "กล้วยสุกเกินไป มีจุดน้ำตาล/ดำ",
        "tip": "เหมาะทำขนมปัง กล้วยทอด สมูทตี้ หรือไอศกรีมกล้วย",
    },
}


def find_model():
    """ค้นหา trained model"""
    default_path = Path("runs/classify/banana_ripeness/weights/best.pt")
    if default_path.exists():
        return str(default_path)

    # ค้นหาใน runs/
    runs_dir = Path("runs/classify")
    if runs_dir.exists():
        for model_dir in sorted(runs_dir.iterdir(), reverse=True):
            best = model_dir / "weights" / "best.pt"
            if best.exists():
                return str(best)

    return None


def predict(image_paths, model_path=None, conf_threshold=0.25):
    """ทำนายความสุกของกล้วย"""

    # หา model
    if model_path is None:
        model_path = find_model()

    if model_path is None or not Path(model_path).exists():
        print("❌ ไม่พบ trained model!")
        print("   กรุณารัน: python train.py ก่อน")
        sys.exit(1)

    # โหลด model
    print(f"📥 โหลด model: {model_path}")
    model = YOLO(model_path)
    print()

    for img_path in image_paths:
        if not Path(img_path).exists():
            print(f"❌ ไม่พบไฟล์: {img_path}")
            continue

        print(f"🔍 วิเคราะห์: {img_path}")
        print("-" * 50)

        # ทำนาย
        results = model.predict(
            source=img_path,
            conf=conf_threshold,
            verbose=False,
        )

        if results and len(results) > 0:
            result = results[0]
            probs = result.probs

            if probs is not None:
                # ดึงผลลัพธ์
                top1_idx = probs.top1
                top1_conf = probs.top1conf.item()
                class_name = result.names[top1_idx]

                # แสดงผล
                info = RIPENESS_INFO.get(class_name, {
                    "thai": class_name,
                    "emoji": "🍌",
                    "description": "",
                    "tip": "",
                })

                print(f"   ผลลัพธ์:    {info['emoji']} {info['thai']}")
                print(f"   ความมั่นใจ: {top1_conf:.1%}")
                print(f"   คำอธิบาย:   {info['description']}")
                print(f"   💡 แนะนำ:   {info['tip']}")
                print()

                # แสดง confidence ทุกคลาส
                print("   📊 รายละเอียด:")
                all_probs = probs.data.tolist()
                for idx, prob in enumerate(all_probs):
                    name = result.names[idx]
                    bar_len = int(prob * 30)
                    bar = "█" * bar_len + "░" * (30 - bar_len)
                    marker = " ◄" if idx == top1_idx else ""
                    name_info = RIPENESS_INFO.get(name, {"thai": name})
                    print(f"      {name_info['thai']:20s} |{bar}| {prob:.1%}{marker}")
            else:
                print("   ❌ ไม่สามารถวิเคราะห์ได้")
        else:
            print("   ❌ ไม่สามารถวิเคราะห์ได้")

        print()


def main():
    parser = argparse.ArgumentParser(
        description="🍌 Banana Ripeness Prediction — ทำนายความสุกของกล้วย"
    )
    parser.add_argument(
        "images",
        nargs="+",
        help="Path ของรูปภาพที่ต้องการวิเคราะห์",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Path ของ trained model (.pt)",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold (default: 0.25)",
    )

    args = parser.parse_args()

    print()
    print("🍌 Banana Ripeness Prediction")
    print("=" * 50)
    print()

    predict(args.images, args.model, args.conf)


if __name__ == "__main__":
    main()

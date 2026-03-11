# 🍌 Banana Ripeness Detection with YOLOv8

โปรเจค Digital Image Processing — ตรวจจับความสุกของกล้วยจากรูปภาพ ด้วย **YOLOv8 Classification Model**

## 📋 สารบัญ

- [ภาพรวมโปรเจค](#-ภาพรวมโปรเจค)
- [วิธีติดตั้ง](#-วิธีติดตั้ง)
- [วิธีใช้งาน](#-วิธีใช้งาน)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [ผลลัพธ์](#-ผลลัพธ์)
- [เทคโนโลยีที่ใช้](#-เทคโนโลยีที่ใช้)

---

## 🎯 ภาพรวมโปรเจค

| รายการ | รายละเอียด |
|--------|-----------|
| **วัตถุประสงค์** | ตรวจจับความสุกของกล้วยจากรูปภาพ |
| **Model** | YOLOv8n-cls (Ultralytics) |
| **Classification** | 3 คลาส |
| **UI** | Streamlit Web Application |

### คลาสที่ตรวจจับ

| คลาส | คำอธิบาย | ตัวอย่าง |
|-------|---------|---------|
| 🟢 **Unripe** (ยังไม่สุก) | กล้วยสีเขียว ยังไม่สุก | กล้วยดิบ |
| 🟡 **Ripe** (สุกแล้ว) | กล้วยสีเหลือง สุกพร้อมทาน | กล้วยสุก |
| 🟤 **Overripe** (สุกเกินไป) | กล้วยมีจุดน้ำตาล/ดำ | กล้วยงอม |

---

## 🚀 วิธีติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
pip install -r requirements.txt
```

### 2. ดาวน์โหลด Dataset

```bash
python download_dataset.py
```

เลือก:
- **ตัวเลือก 1** — ดาวน์โหลดจาก Roboflow (ต้องมี API Key ฟรี)
- **ตัวเลือก 2** — สร้างโครงสร้างโฟลเดอร์เปล่าแล้วใส่รูปเอง

### 3. Train Model

```bash
python train.py
```

Training จะใช้เวลาประมาณ 10-20 นาที (ขึ้นอยู่กับ GPU/CPU)

---

## 💻 วิธีใช้งาน

### Web UI (แนะนำ)

```bash
streamlit run app.py
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:8501`

### Command Line

```bash
python predict.py banana.jpg
python predict.py image1.jpg image2.png image3.jpg
```

---

## 📁 โครงสร้างโปรเจค

```
DIGI FiNal/
├── 📄 requirements.txt       # Python dependencies
├── 📄 download_dataset.py    # ดาวน์โหลด dataset
├── 📄 train.py               # Train YOLOv8 model
├── 📄 predict.py             # ทำนายจาก command line
├── 📄 app.py                 # Streamlit Web UI
├── 📄 README.md              # คู่มือ (ไฟล์นี้)
├── 📁 dataset/               # Dataset
│   ├── train/                # ข้อมูล training
│   ├── valid/                # ข้อมูล validation
│   └── test/                 # ข้อมูล testing
└── 📁 runs/                  # ผลลัพธ์ training
    └── classify/
        └── banana_ripeness/
            ├── weights/
            │   ├── best.pt   # ✅ Model ที่ดีที่สุด
            │   └── last.pt   # Model รอบสุดท้าย
            ├── confusion_matrix.png
            ├── results.png
            └── results.csv
```

---

## 📊 ผลลัพธ์

หลังจาก train model เสร็จ สามารถดูผลลัพธ์ได้ที่:

- **Confusion Matrix** → `runs/classify/banana_ripeness/confusion_matrix.png`
- **Training Curves** → `runs/classify/banana_ripeness/results.png`
- **Metrics** → `runs/classify/banana_ripeness/results.csv`

---

## 🛠️ เทคโนโลยีที่ใช้

| เทคโนโลยี | เวอร์ชัน | ใช้สำหรับ |
|-----------|---------|----------|
| Python | 3.8+ | ภาษาหลัก |
| Ultralytics YOLOv8 | 8.0+ | Deep Learning Model |
| Streamlit | 1.30+ | Web UI |
| OpenCV | 4.8+ | Image Processing |
| Roboflow | 1.1+ | Dataset Management |
| Pillow | 10.0+ | Image Handling |

---

## 📝 Hyperparameters

| Parameter | ค่า | คำอธิบาย |
|-----------|-----|---------|
| Model | YOLOv8n-cls | Nano model (เล็ก เร็ว) |
| Epochs | 50 | จำนวนรอบ training |
| Image Size | 224px | ขนาดรูป input |
| Batch Size | 16 | จำนวนรูปต่อ batch |
| Optimizer | Adam | ตัวปรับค่า weights |
| Learning Rate | 0.001 | อัตราการเรียนรู้ |
| Patience | 15 | Early stopping |

---

## 👨‍💻 DIGI Final Project

สร้างสำหรับวิชา Digital Image Processing

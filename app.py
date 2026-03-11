"""
app.py — Streamlit Web App สำหรับตรวจจับความสุกของกล้วย
======================================================
Web UI ภาษาไทย สวยงาม สำหรับใช้ trained YOLOv8 model ทำนาย

วิธีใช้:
    streamlit run app.py
"""

import streamlit as st
import numpy as np
from pathlib import Path
from PIL import Image
from datetime import datetime

# =============================================
# PAGE CONFIG
# =============================================
st.set_page_config(
    page_title="🍌 ตรวจจับความสุกของกล้วย",
    page_icon="🍌",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# =============================================
# CUSTOM CSS
# =============================================
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');

    /* Global */
    .stApp {
        font-family: 'Prompt', sans-serif;
    }

    /* Header */
    .main-header {
        text-align: center;
        padding: 2rem 0 1rem;
    }
    .main-header h1 {
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #22c55e, #eab308, #f97316);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    .main-header p {
        color: #9ca3af;
        font-size: 1rem;
    }

    /* Result Card */
    .result-card {
        text-align: center;
        padding: 2rem;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
        border: 1px solid rgba(255,255,255,0.1);
        margin: 1rem 0;
    }
    .result-emoji {
        font-size: 4rem;
        margin-bottom: 0.5rem;
    }
    .result-status {
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    .result-status.unripe { color: #4ade80; }
    .result-status.ripe { color: #facc15; }
    .result-status.overripe { color: #a16207; }
    .result-desc {
        color: #9ca3af;
        font-size: 0.95rem;
    }

    /* Tips */
    .tips-box {
        padding: 1rem 1.5rem;
        border-radius: 12px;
        background: rgba(234, 179, 8, 0.08);
        border: 1px solid rgba(234, 179, 8, 0.2);
        margin: 1rem 0;
    }
    .tips-box p {
        color: #d4d4d8;
        font-size: 0.9rem;
        line-height: 1.6;
    }

    /* History Item */
    .history-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        border-radius: 10px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 0.5rem;
    }

    /* Badge */
    .model-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        font-size: 0.8rem;
        font-weight: 500;
    }

    /* Hide Streamlit defaults */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# =============================================
# RIPENESS DATA
# =============================================
RIPENESS_INFO = {
    "unripe": {
        "thai": "ยังไม่สุก",
        "emoji": "🟢🍌",
        "css_class": "unripe",
        "color": "#4ade80",
        "description": "กล้วยยังเขียวอยู่ ต้องรออีกหลายวันกว่าจะสุก",
        "tip": "💡 เก็บกล้วยไว้ในอุณหภูมิห้อง (25-28°C) เพื่อให้สุกเร็วขึ้น หรือใส่ถุงกระดาษปิดสนิทร่วมกับผลไม้ที่ปล่อยก๊าซเอทิลีน เช่น แอปเปิ้ล",
    },
    "ripe": {
        "thai": "สุกแล้ว",
        "emoji": "🟡🍌",
        "css_class": "ripe",
        "color": "#facc15",
        "description": "กล้วยสุกพอดี พร้อมรับประทาน! 🎉",
        "tip": "💡 กล้วยสุกพอดีอุดมไปด้วยโพแทสเซียม วิตามินบี 6 และเส้นใยอาหาร รับประทานได้เลย หรือเก็บในตู้เย็นเพื่อยืดอายุอีก 2-3 วัน",
    },
    "overripe": {
        "thai": "สุกเกินไป",
        "emoji": "🟤🍌",
        "css_class": "overripe",
        "color": "#a16207",
        "description": "กล้วยสุกเกินไปแล้ว มีจุดน้ำตาล เหมาะทำขนม",
        "tip": "💡 กล้วยสุกเกินไปเหมาะสำหรับทำขนมปัง กล้วยทอด สมูทตี้ หรือไอศกรีมกล้วย! หากยังไม่ได้ใช้ ให้แกะเปลือกแล้วแช่แข็งเก็บไว้",
    },
}


# =============================================
# MODEL LOADING
# =============================================
@st.cache_resource
def load_model():
    """โหลด trained YOLOv8 model"""
    from ultralytics import YOLO

    model_path = Path("runs/classify/banana_ripeness/weights/best.pt")

    if not model_path.exists():
        # ค้นหา model ล่าสุดใน runs/
        runs_dir = Path("runs/classify")
        if runs_dir.exists():
            for d in sorted(runs_dir.iterdir(), reverse=True):
                best = d / "weights" / "best.pt"
                if best.exists():
                    model_path = best
                    break

    if not model_path.exists():
        return None

    return YOLO(str(model_path))


def predict_image(model, image: Image.Image):
    """ทำนายความสุกของกล้วย"""
    results = model.predict(source=image, verbose=False)

    if results and len(results) > 0:
        result = results[0]
        probs = result.probs

        if probs is not None:
            top1_idx = probs.top1
            top1_conf = probs.top1conf.item()
            class_name = result.names[top1_idx]

            # สร้าง dict ของ confidence ทุกคลาส
            all_probs = {}
            for idx, prob in enumerate(probs.data.tolist()):
                all_probs[result.names[idx]] = prob

            return {
                "class": class_name,
                "confidence": top1_conf,
                "all_probs": all_probs,
            }

    return None


# =============================================
# MAIN UI
# =============================================

def main():
    # Header
    st.markdown("""
    <div class="main-header">
        <h1>🍌 ตรวจจับความสุกของกล้วย</h1>
        <p>Banana Ripeness Detection with YOLOv8</p>
    </div>
    """, unsafe_allow_html=True)

    # Load model
    model = load_model()

    if model is None:
        st.error("❌ ไม่พบ trained model!")
        st.info("กรุณารัน `python train.py` ก่อนเพื่อ train model")
        st.code("python train.py", language="bash")

        st.markdown("---")
        st.markdown("### 📚 วิธีเริ่มต้น")
        st.markdown("""
        1. ดาวน์โหลด dataset: `python download_dataset.py`
        2. Train model: `python train.py`
        3. เปิด Web UI: `streamlit run app.py`
        """)
        return

    st.markdown('<div style="text-align:center;"><span class="model-badge">✅ Model พร้อมใช้งาน</span></div>',
                unsafe_allow_html=True)
    st.markdown("")

    # =============================================
    # INPUT TABS
    # =============================================
    tab_upload, tab_camera = st.tabs(["📁 อัพโหลดรูป", "📷 ถ่ายจากกล้อง"])

    image = None

    with tab_upload:
        uploaded_file = st.file_uploader(
            "เลือกรูปกล้วย",
            type=["jpg", "jpeg", "png", "webp"],
            help="รองรับ JPG, PNG, WEBP",
        )
        if uploaded_file is not None:
            image = Image.open(uploaded_file).convert("RGB")

    with tab_camera:
        camera_image = st.camera_input("ถ่ายรูปกล้วย")
        if camera_image is not None:
            image = Image.open(camera_image).convert("RGB")

    # =============================================
    # DISPLAY IMAGE & ANALYZE
    # =============================================
    if image is not None:
        # Show image
        st.image(image, caption="รูปที่เลือก", use_container_width=True)

        # Analyze button
        if st.button("🔍 วิเคราะห์ความสุกของกล้วย", type="primary", use_container_width=True):
            with st.spinner("🍌 กำลังวิเคราะห์..."):
                result = predict_image(model, image)

            if result:
                class_name = result["class"]
                confidence = result["confidence"]
                all_probs = result["all_probs"]

                info = RIPENESS_INFO.get(class_name, {
                    "thai": class_name,
                    "emoji": "🍌",
                    "css_class": "ripe",
                    "color": "#facc15",
                    "description": "",
                    "tip": "",
                })

                # Result Card
                st.markdown(f"""
                <div class="result-card">
                    <div class="result-emoji">{info['emoji']}</div>
                    <div class="result-status {info['css_class']}">{info['thai']}</div>
                    <div class="result-desc">{info['description']}</div>
                    <div style="margin-top:1rem; color: {info['color']}; font-size:1.2rem; font-weight:600;">
                        ความมั่นใจ {confidence:.1%}
                    </div>
                </div>
                """, unsafe_allow_html=True)

                # Confidence Breakdown
                st.markdown("#### 📊 ระดับความมั่นใจแต่ละคลาส")

                for cls_name, prob in sorted(all_probs.items(), key=lambda x: x[1], reverse=True):
                    cls_info = RIPENESS_INFO.get(cls_name, {"thai": cls_name, "color": "#888"})
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.progress(prob, text=f"{cls_info['emoji'] if 'emoji' in cls_info else '🍌'} {cls_info['thai']}")
                    with col2:
                        st.markdown(f"**{prob:.1%}**")

                # Tips
                if info["tip"]:
                    st.markdown(f"""
                    <div class="tips-box">
                        <p>{info['tip']}</p>
                    </div>
                    """, unsafe_allow_html=True)

                # Save to history
                if "history" not in st.session_state:
                    st.session_state.history = []

                st.session_state.history.insert(0, {
                    "status": info["thai"],
                    "emoji": info["emoji"],
                    "confidence": confidence,
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "class": class_name,
                })
                # Keep last 10
                st.session_state.history = st.session_state.history[:10]

            else:
                st.error("❌ ไม่สามารถวิเคราะห์ได้ กรุณาลองรูปอื่น")

    # =============================================
    # HISTORY
    # =============================================
    st.markdown("---")
    st.markdown("### 📋 ประวัติการตรวจจับ")

    if "history" in st.session_state and st.session_state.history:
        for item in st.session_state.history:
            info = RIPENESS_INFO.get(item["class"], {"color": "#888"})
            st.markdown(f"""
            <div class="history-item">
                <span style="font-size:1.5rem;">{item['emoji']}</span>
                <div style="flex:1;">
                    <div style="color:{info['color']}; font-weight:600;">{item['status']}</div>
                    <div style="color:#6b7280; font-size:0.8rem;">{item['time']} • ความมั่นใจ {item['confidence']:.1%}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)

        if st.button("🗑️ ล้างประวัติ"):
            st.session_state.history = []
            st.rerun()
    else:
        st.caption("ยังไม่มีประวัติการตรวจจับ")

    # =============================================
    # FOOTER
    # =============================================
    st.markdown("---")
    st.markdown(
        "<div style='text-align:center; color:#6b7280; font-size:0.8rem;'>"
        "🍌 Banana Ripeness Detection — DIGI Final Project | Powered by YOLOv8"
        "</div>",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()

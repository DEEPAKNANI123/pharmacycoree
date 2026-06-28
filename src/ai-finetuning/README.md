# PharmaCore Custom LLM Fine-Tuning Pipeline (Approach A)

This module provides a local training pipeline to fine-tune an open-source Vision-Language Model (VLM) specifically to read handwritten prescriptions and return structured JSON metadata. 

## Hardware Requirements
*   **Operating System**: Windows / Linux / macOS (CUDA-enabled GPU highly recommended)
*   **Recommended Hardware**: NVIDIA GPU with at least **12 GB VRAM** (e.g., RTX 3060, RTX 4070, or higher) for QLoRA training.
*   **System Memory**: 16 GB+ RAM.

---

## 1. Environment Setup

It is highly recommended to run the training pipeline in a dedicated Python environment.

```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate the environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 3. Install required packages
pip install -r requirements.txt
```

---

## 2. Preparing the Dataset

VLMs require paired data consisting of an image of the handwritten prescription and a corresponding JSON output detailing the ground-truth extracted metadata.

To generate a sample dataset containing dummy images and annotations for verification:

```bash
python prepare_dataset.py
```

This creates a `dataset/` directory structured as follows:
*   `dataset/images/`: Preprocessed input images.
*   `dataset/train_metadata.jsonl`: Training metadata containing conversational turns in Hugging Face dataset format.

---

## 3. Running the Fine-Tuning Script

Run the main fine-tuning loop:

```bash
python finetune_vision_model.py --model_id "Qwen/Qwen2-VL-7B-Instruct" --dataset_path "./dataset/train_metadata.jsonl" --output_dir "./finetuned_weights"
```

### Key Optimizations Used:
*   **QLoRA (4-bit Quantization)**: Compresses the base model to load on a consumer-grade GPU.
*   **Gradient Checkpointing**: Reduces memory usage during backpropagation.
*   **PEFT (LoRA)**: Restricts fine-tuning to small projection layer adapters, preserving the base model's visual reasoning.

---

## 4. Running Inference

To test your fine-tuned weights against a new prescription image:

```bash
python inference.py --model_id "Qwen/Qwen2-VL-7B-Instruct" --weights_path "./finetuned_weights" --image_path "path_to_prescription_image.jpg"
```

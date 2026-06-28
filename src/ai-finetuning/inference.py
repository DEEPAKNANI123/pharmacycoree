import torch
import argparse
import json
from PIL import Image
from transformers import AutoProcessor, AutoModelForVision2Seq
from peft import PeftModel

def parse_args():
    parser = argparse.ArgumentParser(description="Run Inference on Fine-Tuned Vision LLM")
    parser.add_argument(
        "--model_id", 
        type=str, 
        default="Qwen/Qwen2-VL-7B-Instruct", 
        help="Base Vision-Language Model HuggingFace ID"
    )
    parser.add_argument(
        "--weights_path", 
        type=str, 
        required=True, 
        help="Path to fine-tuned LoRA weights directory"
    )
    parser.add_argument(
        "--image_path", 
        type=str, 
        required=True, 
        help="Path to prescription image"
    )
    return parser.parse_args()

def run_inference():
    args = parse_args()
    print(f"📦 Loading base model: {args.model_id}")
    
    # Check GPU availability
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🖥️ Using compute device: {device.upper()}")

    # 1. Load Processor
    processor = AutoProcessor.from_pretrained(args.weights_path)

    # 2. Load Base Model
    base_model = AutoModelForVision2Seq.from_pretrained(
        args.model_id,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        low_cpu_mem_usage=True,
        device_map="auto"
    )

    # 3. Load Fine-Tuned LoRA Adapters
    print(f"📂 Merging fine-tuned adapter weights from: {args.weights_path}")
    model = PeftModel.from_pretrained(base_model, args.weights_path)
    model.eval()

    # 4. Prepare Image and Text Prompts
    print(f"🖼️ Loading image: {args.image_path}")
    image = Image.open(args.image_path).convert("RGB")
    
    prompt = "Read the handwritten prescription in this image and return the patient name, doctor name, prescription date, and prescribed medicines in raw JSON format."
    
    # Process inputs specifically for Vision models
    # Hugging Face conversation representation format
    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt}
            ]
        }
    ]
    
    # Use processor template to format tokens
    text = processor.apply_chat_template(conversation, tokenize=False, add_generation_prompt=True)
    
    # 5. Extract Features and Tokenize Inputs
    inputs = processor(
        text=[text],
        images=[image],
        padding=True,
        return_tensors="pt"
    ).to(device)

    # 6. Generate Response
    print("🔥 Running model forward pass...")
    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=512,
            temperature=0.1,
            do_sample=False
        )
        
    # Trim inputs from generated ids
    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    
    # 7. Decode Output
    output_text = processor.batch_decode(
        generated_ids_trimmed, 
        skip_special_tokens=True, 
        clean_up_tokenization_spaces=False
    )[0]

    print("\n🎉 Custom LLM Extraction Result:")
    print("---------------------------------")
    print(output_text)
    print("---------------------------------")
    
    # Verify JSON structure
    try:
        parsed_data = json.loads(output_text)
        print("✅ Structured JSON extraction verified successfully!")
    except Exception as e:
        print("⚠️ Warning: Extracted text is not syntactically valid JSON. Review prompt context.")

if __name__ == "__main__":
    run_inference()

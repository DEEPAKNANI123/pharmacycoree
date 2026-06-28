import os
import torch
import argparse
from datasets import load_dataset
from transformers import (
    AutoProcessor,
    AutoModelForVision2Seq,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

def parse_args():
    parser = argparse.ArgumentParser(description="QLoRA Fine-Tuning Vision LLM for Rx Validation")
    parser.add_argument(
        "--model_id", 
        type=str, 
        default="Qwen/Qwen2-VL-7B-Instruct", 
        help="Base Vision-Language Model HuggingFace ID"
    )
    parser.add_argument(
        "--dataset_path", 
        type=str, 
        default="./dataset/train_metadata.jsonl", 
        help="Path to training jsonl metadata file"
    )
    parser.add_argument(
        "--output_dir", 
        type=str, 
        default="./finetuned_weights", 
        help="Output directory to save fine-tuned adapters"
    )
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=1, help="Training batch size per device")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    return parser.parse_args()

def train():
    args = parse_args()
    print(f"🚀 Initializing QLoRA fine-tuning for model: {args.model_id}")

    # 1. 4-bit Quantization Config (reduces GPU memory requirement by ~70%)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True
    )

    # 2. Load Base Model and Processor
    print("📦 Loading base model and processor...")
    processor = AutoProcessor.from_pretrained(args.model_id)
    model = AutoModelForVision2Seq.from_pretrained(
        args.model_id,
        quantization_config=bnb_config,
        device_map="auto"
    )

    # 3. Enable Gradient Checkpointing and Prepare model for 8/4-bit training
    model.gradient_checkpointing_enable()
    model = prepare_model_for_kbit_training(model)

    # 4. LoRA Adapter Config (targets attention layers and projection adapters)
    # Target modules vary by architecture. For Qwen2-VL, we target 'q_proj', 'v_proj', 'k_proj', 'o_proj'.
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    
    model = get_peft_model(model, lora_config)
    print("📈 Adaptable model parameters configured:")
    model.print_trainable_parameters()

    # 5. Load Dataset
    print(f"📊 Loading dataset from: {args.dataset_path}")
    dataset = load_dataset("json", data_files=args.dataset_path)

    # Custom Collator to align image sizes and tokenize targets
    def collate_fn(batch):
        # Extracts image files and wraps them with target processor specifications
        # Standard Hugging Face vision-to-language SFT processing loop
        texts = [entry["conversations"][0]["value"] for entry in batch]
        # In a real environment, load PIL Images from disk: Image.open(entry["image"])
        # We process prompts dynamically.
        return {}

    # 6. Configure Training Arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_strategy="epoch",
        learning_rate=args.lr,
        fp16=True, # Set to bf16=True if supported by GPU
        logging_steps=10,
        warmup_ratio=0.03,
        lr_scheduler_type="constant",
        disable_tqdm=False,
        report_to="none"
    )

    # 7. Trainer Setup
    print("🏋️ Setting up SFTTrainer loop...")
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset["train"],
        peft_config=lora_config,
        dataset_text_field="conversations", # Matches our pre-formatted conversation keys
        max_seq_length=512,
        processor=processor,
        args=training_args
    )

    # 8. Start Fine-Tuning
    print("🔥 Starting the training loop...")
    trainer.train()

    # 9. Save Trained Adapters
    print(f"💾 Saving trained LoRA weights to: {args.output_dir}")
    model.save_pretrained(args.output_dir)
    processor.save_pretrained(args.output_dir)
    print("🎉 Fine-tuning completed successfully!")

if __name__ == "__main__":
    train()

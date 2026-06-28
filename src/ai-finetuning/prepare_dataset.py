import os
import json
from PIL import Image, ImageDraw

def create_mock_prescription_image(filename, patient_name, doctor_name, date, meds):
    """
    Creates a simple mock prescription image with text drawn on it.
    """
    # Create a blank white page (A4 proportion roughly)
    img = Image.new("RGB", (600, 800), color="white")
    draw = ImageDraw.Draw(img)
    
    # Draw simple header
    draw.text((50, 50), "PHARMACYCORE MEDICAL CENTER", fill="black")
    draw.text((50, 70), "D.No. 2-57/5/101/102, Dubai, UAE", fill="gray")
    draw.line((50, 100, 550, 100), fill="black", width=2)
    
    # Draw doctor and patient details
    draw.text((50, 130), f"Doctor: {doctor_name}", fill="black")
    draw.text((50, 150), f"Patient: {patient_name}", fill="black")
    draw.text((400, 130), f"Date: {date}", fill="black")
    
    draw.text((50, 200), "Rx:", fill="black")
    
    # Draw medicines list
    y = 230
    for med in meds:
        draw.text((80, y), f"- {med['name']} ({med['dosage']})", fill="black")
        draw.text((100, y + 20), f"Qty: {med['qty']} | Sig: {med['sig']}", fill="gray")
        y += 60
        
    draw.line((50, 650, 550, 650), fill="gray", width=1)
    draw.text((350, 680), "Authorized Signature", fill="black")
    
    # Ensure folder exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    img.save(filename)
    print(f"✅ Generated mock image: {filename}")

def prepare_dataset():
    """
    Prepares a set of mock images and outputs metadata in Hugging Face conversation dataset format.
    """
    output_dir = "./dataset"
    images_dir = os.path.join(output_dir, "images")
    metadata_file = os.path.join(output_dir, "train_metadata.jsonl")
    
    os.makedirs(images_dir, exist_ok=True)
    
    # Mock data definitions
    mock_prescriptions = [
        {
            "img_name": "rx_001.jpg",
            "patient": "Sara Hassan",
            "doctor": "Dr. John Pramod",
            "date": "28/05/2026",
            "meds": [
                {"name": "Amoxicillin", "dosage": "500mg", "qty": 10, "sig": "1 capsule 3 times daily"},
                {"name": "Paracetamol", "dosage": "500mg", "qty": 20, "sig": "1 tablet every 6 hours as needed"}
            ]
        },
        {
            "img_name": "rx_002.jpg",
            "patient": "Ahmed Rashid",
            "doctor": "Dr. John Pramod",
            "date": "27/05/2026",
            "meds": [
                {"name": "Amlodipine", "dosage": "5mg", "qty": 30, "sig": "1 tablet daily in the morning"},
                {"name": "Atorvastatin", "dosage": "20mg", "qty": 30, "sig": "1 tablet at bedtime"}
            ]
        },
        {
            "img_name": "rx_003.jpg",
            "patient": "Fatima Zaabi",
            "doctor": "Dr. John Pramod",
            "date": "26/05/2026",
            "meds": [
                {"name": "Albuterol Inhaler", "dosage": "90mcg", "qty": 1, "sig": "2 puffs every 4 hours as needed"}
            ]
        }
    ]
    
    with open(metadata_file, "w") as f:
        for idx, rx in enumerate(mock_prescriptions):
            img_path = os.path.join(images_dir, rx["img_name"])
            
            # Generate the mock image
            create_mock_prescription_image(
                img_path, 
                rx["patient"], 
                rx["doctor"], 
                rx["date"], 
                rx["meds"]
            )
            
            # Create a target output JSON representation
            target_json = {
                "patientName": rx["patient"],
                "doctorName": rx["doctor"],
                "prescriptionDate": rx["date"],
                "medicines": rx["meds"]
            }
            
            # Hugging Face conversation template for Vision-Language Models (VLM)
            # Typically looks like: List of user prompts with <image> token, followed by assistant replies.
            prompt = "Read the handwritten prescription in this image and return the patient name, doctor name, prescription date, and prescribed medicines in raw JSON format."
            
            conversation_entry = {
                "id": f"rx_train_{idx}",
                "image": f"images/{rx['img_name']}",
                "conversations": [
                    {
                        "from": "user",
                        "value": f"<image>\n{prompt}"
                    },
                    {
                        "from": "assistant",
                        "value": json.dumps(target_json, indent=2)
                    }
                ]
            }
            
            f.write(json.dumps(conversation_entry) + "\n")
            
    print(f"🎉 Generated metadata file: {metadata_file}")
    print("Dataset preparation complete! You are ready to start fine-tuning.")

if __name__ == "__main__":
    prepare_dataset()

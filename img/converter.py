import os
from PIL import Image

def convert_all_images_to_webp(input_folder, output_folder="output"):
    # Ensure output directory exists
    os.makedirs(output_folder, exist_ok=True)
    
    # Supported image formats
    valid_extensions = (".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff")

    # Loop through all files in the input folder
    for filename in os.listdir(input_folder):
        if filename.lower().endswith(valid_extensions):
            input_path = os.path.join(input_folder, filename)
            output_path = os.path.join(output_folder, os.path.splitext(filename)[0] + ".webp")
            
            try:
                # Open, resize, and save the image
                image = Image.open(input_path)
                image = image.resize((448, 600), Image.LANCZOS)
                image.save(output_path, format="WEBP", quality=80)
                print(f"Converted: {filename} → {output_path}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

# Example usage
convert_all_images_to_webp("templates")  # Replace "images" with your actual input folder name

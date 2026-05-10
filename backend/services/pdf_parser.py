import sys
import json
import io

# Force UTF-8 encoding for stdout to handle Unicode characters (like arrows) on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF (pymupdf) is not installed. Please run 'pip install pymupdf'.")
    sys.exit(1)

def extract_text(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        if not text.strip():
            return "Error: No text extracted from PDF. Document might be image-only."
        return text
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    extracted_text = extract_text(pdf_path)
    print(extracted_text)

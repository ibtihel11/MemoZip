from io import BytesIO

import pypdfium2 as pdfium
import pytesseract
from pypdf import PdfReader

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

def extract_pdf_text(file_content: bytes) -> tuple[int, list[dict]]:
    reader = PdfReader(BytesIO(file_content))

    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported")

    pdf = pdfium.PdfDocument(file_content)
    pages = []

    try:
        for page_number, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()

            if not text:
                pdf_page = pdf[page_number - 1]
                bitmap = None
                image = None

                try:
                    bitmap = pdf_page.render(scale=2)
                    image = bitmap.to_pil()
                    text = pytesseract.image_to_string(
                        image,
                        lang="eng+fra",
                    ).strip()
                finally:
                    if image is not None:
                        image.close()
                    if bitmap is not None:
                        bitmap.close()
                    pdf_page.close()

            if text:
                pages.append({
                    "page_number": page_number,
                    "text": text,
                })
    finally:
        pdf.close()

    if not pages:
        raise ValueError(
            "No text could be extracted from this PDF, even with OCR."
        )

    return len(reader.pages), pages

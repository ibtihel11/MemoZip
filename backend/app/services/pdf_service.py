
import pytesseract
import pypdfium2 as pdfium

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_pdf_text(file_content: bytes) -> tuple[int, list[dict]]:
    pdf = pdfium.PdfDocument(file_content)
    pages = []

    try:
        page_count = len(pdf)

        for page_number in range(page_count):
            page = pdf[page_number]
            textpage = None
            bitmap = None
            image = None

            try:
                textpage = page.get_textpage()
                text = textpage.get_text_range().strip()

                if not text:
                    bitmap = page.render(scale=2)
                    image = bitmap.to_pil()
                    text = pytesseract.image_to_string(
                        image,
                        lang="eng+fra",
                    ).strip()

                if text:
                    pages.append({
                        "page_number": page_number + 1,
                        "text": text,
                    })
            finally:
                if image is not None:
                    image.close()
                if bitmap is not None:
                    bitmap.close()
                if textpage is not None:
                    textpage.close()
                page.close()
    finally:
        pdf.close()

    if not pages:
        raise ValueError(
            "No text could be extracted from this PDF, even with OCR."
        )

    return page_count, pages

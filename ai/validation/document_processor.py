import io
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MultiFormatDocumentProcessor:
    """
    Multi-format document processing engine supporting:
    - PDF via PyMuPDF (fitz)
    - DOCX via python-docx
    - XLSX via openpyxl
    - TXT / Raw text decoding
    """

    def process_file_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str = ""
    ) -> Dict[str, Any]:
        """
        Parses binary file contents and extracts text content and structural metadata.
        """
        lower_name = filename.lower()
        extracted_text = ""
        metadata = {}
        file_type = "unknown"

        if lower_name.endswith(".pdf") or "pdf" in content_type.lower():
            file_type = "pdf"
            extracted_text, metadata = self._parse_pdf(file_bytes)
        elif lower_name.endswith(".docx") or "word" in content_type.lower() or "officedocument.wordprocessingml" in content_type.lower():
            file_type = "docx"
            extracted_text, metadata = self._parse_docx(file_bytes)
        elif lower_name.endswith(".xlsx") or lower_name.endswith(".xls") or "excel" in content_type.lower() or "officedocument.spreadsheetml" in content_type.lower():
            file_type = "xlsx"
            extracted_text, metadata = self._parse_xlsx(file_bytes)
        else:
            file_type = "txt"
            extracted_text, metadata = self._parse_txt(file_bytes)

        return {
            "filename": filename,
            "file_type": file_type,
            "extracted_text": extracted_text.strip(),
            "character_count": len(extracted_text.strip()),
            "word_count": len(extracted_text.strip().split()),
            "metadata": metadata
        }

    def _parse_pdf(self, file_bytes: bytes) -> tuple[str, dict]:
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text_pages = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                text_pages.append(page.get_text())
            full_text = "\n".join(text_pages)
            return full_text, {"page_count": len(doc)}
        except Exception as e:
            logger.error(f"PyMuPDF PDF extraction failed: {e}")
            return file_bytes.decode("utf-8", errors="ignore"), {"page_count": 1, "error": str(e)}

    def _parse_docx(self, file_bytes: bytes) -> tuple[str, dict]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n".join(paragraphs)
            return full_text, {"paragraph_count": len(paragraphs)}
        except Exception as e:
            logger.error(f"python-docx extraction failed: {e}")
            return file_bytes.decode("utf-8", errors="ignore"), {"paragraph_count": 0, "error": str(e)}

    def _parse_xlsx(self, file_bytes: bytes) -> tuple[str, dict]:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet_texts = []
            for sheet_name in wb.sheetnames:
                sheet = wb[sheet_name]
                sheet_lines = [f"--- Sheet: {sheet_name} ---"]
                for row in sheet.iter_rows(values_only=True):
                    row_vals = [str(val) for val in row if val is not None]
                    if row_vals:
                        sheet_lines.append(" | ".join(row_vals))
                sheet_texts.append("\n".join(sheet_lines))
            full_text = "\n\n".join(sheet_texts)
            return full_text, {"sheet_count": len(wb.sheetnames), "sheet_names": wb.sheetnames}
        except Exception as e:
            logger.error(f"openpyxl extraction failed: {e}")
            return file_bytes.decode("utf-8", errors="ignore"), {"sheet_count": 0, "error": str(e)}

    def _parse_txt(self, file_bytes: bytes) -> tuple[str, dict]:
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1", errors="ignore")
        return text, {"encoding": "utf-8"}

document_processor = MultiFormatDocumentProcessor()

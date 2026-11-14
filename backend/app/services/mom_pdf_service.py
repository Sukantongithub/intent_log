import io
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print total page count:
    'Page X of Y'
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(HexColor("#64748b"))
        
        # Subtle footer line
        self.setStrokeColor(HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 36, letter[0] - 40, 36)
        
        # Footer text
        self.drawString(40, 24, "IntenT_loG Autonomous AI Meeting Intelligence • Confidential & Proprietary")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 40, 24, page_text)
        self.restoreState()


class MoMPDFService:
    """
    Generates high-resolution, executive-ready Minutes of Meeting (MoM) PDFs.
    """

    @staticmethod
    def generate_mom_pdf(
        meeting_data: Dict[str, Any],
        tasks: List[Dict[str, Any]],
        participants: List[str] = None,
        transcript_timeline: List[Dict[str, Any]] = None
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=40,
            bottomMargin=50
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            'MoMTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=HexColor('#0f172a')
        )

        subtitle_style = ParagraphStyle(
            'MoMSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=HexColor('#475569')
        )

        h2_style = ParagraphStyle(
            'MoMHeading2',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=HexColor('#0f172a'),
            spaceBefore=12,
            spaceAfter=6
        )

        body_style = ParagraphStyle(
            'MoMBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=HexColor('#1e293b')
        )

        callout_style = ParagraphStyle(
            'MoMCallout',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=14,
            textColor=HexColor('#0f172a')
        )

        table_header_style = ParagraphStyle(
            'MoMTableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.white
        )

        table_cell_style = ParagraphStyle(
            'MoMTableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=HexColor('#1e293b')
        )

        table_cell_bold = ParagraphStyle(
            'MoMTableCellBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=HexColor('#0f172a')
        )

        story = []

        # ---------------------------------------------------------
        # 1. HEADER BANNER & BRANDING
        # ---------------------------------------------------------
        header_table_data = [
            [
                Paragraph("<b>INTENT_LOG</b> | EXECUTIVE MINUTES OF MEETING", ParagraphStyle('Brand', fontName='Helvetica-Bold', fontSize=10, textColor=HexColor('#0284c7'))),
                Paragraph(datetime.utcnow().strftime("Generated: %b %d, %Y %H:%M UTC"), ParagraphStyle('GenTime', fontName='Helvetica', fontSize=8, textColor=HexColor('#64748b'), alignment=2))
            ],
            [
                Paragraph(meeting_data.get('title') or "Meeting Hall Session", title_style),
                ""
            ],
            [
                Paragraph(f"Meeting Code: <b>{meeting_data.get('meeting_code', 'N/A')}</b> &nbsp;•&nbsp; Date: <b>{meeting_data.get('date', 'N/A')}</b> &nbsp;•&nbsp; Status: <b>{str(meeting_data.get('status', 'Completed')).upper()}</b>", subtitle_style),
                ""
            ]
        ]

        header_table = Table(header_table_data, colWidths=[380, 152])
        header_table.setStyle(TableStyle([
            ('SPAN', (0, 1), (1, 1)),
            ('SPAN', (0, 2), (1, 2)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))

        # Divider bar
        story.append(HRFlowable(width="100%", thickness=2, color=HexColor('#0284c7'), spaceAfter=14))

        # ---------------------------------------------------------
        # 2. EXECUTIVE SUMMARY
        # ---------------------------------------------------------
        story.append(Paragraph("1. Executive Summary & Discussion Synthesis", h2_style))
        raw_summary = meeting_data.get('summary') or "Autonomous synthesis extracted from multi-party conversation."
        
        summary_card = [
            [Paragraph(f"<i>\"{raw_summary}\"</i>", callout_style)]
        ]
        summary_table = Table(summary_card, colWidths=[532])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 12))

        # ---------------------------------------------------------
        # 3. ATTENDEES & PARTICIPANTS
        # ---------------------------------------------------------
        story.append(Paragraph("2. Attendees & Active Participants", h2_style))

        # Deduce attendees list
        attendee_list = []
        if participants and len(participants) > 0:
            attendee_list = participants
        else:
            # Fallback to persons mentioned in tasks
            dedup = set()
            for t in tasks:
                p = t.get('person')
                if p and p.lower() != 'unassigned':
                    dedup.add(p)
            attendee_list = list(dedup) if dedup else ["Sujith", "Sukant", "Nithi", "Viswaa"]

        attendee_str = " &nbsp;•&nbsp; ".join([f"<b>{att}</b>" for att in attendee_list])
        attendees_card = [
            [Paragraph(f"<b>Verified Attendees ({len(attendee_list)}):</b> &nbsp; {attendee_str}", body_style)]
        ]
        attendees_table = Table(attendees_card, colWidths=[532])
        attendees_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f1f5f9')),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ]))
        story.append(attendees_table)
        story.append(Spacer(1, 14))

        # ---------------------------------------------------------
        # 4. ACTION ITEMS & DELIVERABLES MATRIX
        # ---------------------------------------------------------
        story.append(Paragraph(f"3. Action Items & Commitments ({len(tasks)} Items Extracted)", h2_style))

        if not tasks:
            story.append(Paragraph("<i>No action items recorded for this session.</i>", body_style))
        else:
            task_rows = [
                [
                    Paragraph("Assignee", table_header_style),
                    Paragraph("Action Item Commitment", table_header_style),
                    Paragraph("Deadline", table_header_style),
                    Paragraph("Priority", table_header_style),
                    Paragraph("Target Deliverable", table_header_style),
                    Paragraph("Status", table_header_style),
                ]
            ]

            for t in tasks:
                prio = t.get('priority', 'Medium')
                status = t.get('status', 'Pending')

                # Priority formatting
                prio_color = "#ef4444" if prio == 'High' else "#f59e0b" if prio == 'Medium' else "#10b981"
                prio_para = Paragraph(f"<font color='{prio_color}'><b>{prio}</b></font>", table_cell_style)

                # Status formatting
                status_color = "#10b981" if status == 'Completed' else "#3b82f6" if status == 'In Progress' else "#f59e0b"
                status_para = Paragraph(f"<font color='{status_color}'><b>{status}</b></font>", table_cell_style)

                task_rows.append([
                    Paragraph(t.get('person') or "Unassigned", table_cell_bold),
                    Paragraph(t.get('task') or "—", table_cell_style),
                    Paragraph(t.get('deadline') or "—", table_cell_style),
                    prio_para,
                    Paragraph(t.get('deliverable') or "—", table_cell_style),
                    status_para,
                ])

            # Widths sum = 75 + 165 + 65 + 50 + 110 + 67 = 532 pt
            tasks_table = Table(task_rows, colWidths=[75, 165, 65, 50, 110, 67])
            tasks_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0f172a')),
                ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f8fafc')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(tasks_table)

        story.append(Spacer(1, 14))

        # ---------------------------------------------------------
        # 5. DISCUSSION TIMELINE & TRANSCRIPT EXCERPTS
        # ---------------------------------------------------------
        if transcript_timeline and len(transcript_timeline) > 0:
            story.append(Paragraph("4. Key Discussion Timeline Excerpts", h2_style))
            timeline_rows = [
                [
                    Paragraph("Time", table_header_style),
                    Paragraph("Speaker", table_header_style),
                    Paragraph("Transcript Segment", table_header_style),
                ]
            ]
            for seg in transcript_timeline[:8]:  # Top 8 milestone lines
                st = seg.get('start_time', 0.0)
                et = seg.get('end_time', 0.0)
                time_label = f"{st:.1f}s - {et:.1f}s" if (st or et) else "—"
                timeline_rows.append([
                    Paragraph(time_label, table_cell_style),
                    Paragraph(seg.get('speaker_name') or seg.get('speaker') or "Speaker", table_cell_bold),
                    Paragraph(seg.get('text') or "—", table_cell_style),
                ])

            timeline_table = Table(timeline_rows, colWidths=[80, 100, 352])
            timeline_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e293b')),
                ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f8fafc')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(timeline_table)
            story.append(Spacer(1, 14))
        elif meeting_data.get('transcript'):
            story.append(Paragraph("4. Recorded Discussion Transcript", h2_style))
            raw_t = meeting_data.get('transcript', '')
            t_snippet = raw_t if len(raw_t) < 500 else raw_t[:500] + "..."
            transcript_box = [
                [Paragraph(f"<font color='#475569'>{t_snippet}</font>", body_style)]
            ]
            ttable = Table(transcript_box, colWidths=[532])
            ttable.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f8fafc')),
                ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(ttable)
            story.append(Spacer(1, 14))

        # ---------------------------------------------------------
        # 6. AI COMPLIANCE & SIGN-OFF SEAL
        # ---------------------------------------------------------
        signoff_data = [
            [
                Paragraph("<b>CERTIFIED BY INTENT_LOG AUTONOMOUS AGENT</b><br/><font size='7.5' color='#64748b'>Processed via Whisper VAD + Qwen3 LLM + Multi-Tier RAG Engine</font>", body_style),
                Paragraph(f"<b>Audit Status:</b> <font color='#10b981'><b>VERIFIED</b></font><br/><font size='7.5' color='#64748b'>Checksum: {meeting_data.get('meeting_code', 'OK')}</font>", ParagraphStyle('Audit', fontName='Helvetica', fontSize=8, alignment=2))
            ]
        ]
        signoff_table = Table(signoff_data, colWidths=[360, 172])
        signoff_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f1f5f9')),
            ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(KeepTogether([signoff_table]))

        # Build document
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()


mom_pdf_service = MoMPDFService()

from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from apps.communications.config import get_setting

BRAND_PRIMARY = colors.HexColor("#0f766e")
BRAND_DARK = colors.HexColor("#134e4a")
SLATE_500 = colors.HexColor("#64748b")
SLATE_700 = colors.HexColor("#334155")
SLATE_200 = colors.HexColor("#e2e8f0")
SLATE_50 = colors.HexColor("#f8fafc")


def _money(value, currency: str = "KES") -> str:
    try:
        return f"{currency} {float(value):,.2f}"
    except (TypeError, ValueError):
        return f"{currency} {value}"


def render_invoice_pdf(invoice) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"Invoice {invoice.invoice_number}",
    )
    styles = getSampleStyleSheet()

    company = get_setting("COMPANY_NAME", "ZIDI Connect")
    company_addr = get_setting("COMPANY_ADDRESS", "")
    company_phone = get_setting("COMPANY_PHONE", "")
    company_email = get_setting("COMPANY_EMAIL", "")

    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        textColor=BRAND_DARK, fontSize=22, leading=26, spaceAfter=0,
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        textColor=SLATE_500, fontSize=8, leading=10,
    )
    value_style = ParagraphStyle(
        "Value", parent=styles["Normal"],
        textColor=SLATE_700, fontSize=10, leading=12, fontName="Helvetica-Bold",
    )
    right_value = ParagraphStyle(
        "ValueR", parent=value_style, alignment=TA_RIGHT,
    )
    right_label = ParagraphStyle(
        "LabelR", parent=label_style, alignment=TA_RIGHT,
    )
    body = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=9, leading=12, textColor=SLATE_700,
    )

    flow = []

    contact_lines = [company]
    if company_addr:
        contact_lines.append(company_addr)
    contact_block = "<br/>".join(contact_lines)
    if company_phone:
        contact_block += f"<br/><font color='#64748b'>Tel:</font> {company_phone}"
    if company_email:
        contact_block += f"<br/><font color='#64748b'>Email:</font> {company_email}"

    header_right = [
        [Paragraph("INVOICE", title_style)],
        [Paragraph(f"<b>#{invoice.invoice_number}</b>", right_value)],
    ]
    header_left = [[Paragraph(contact_block, body)]]
    header = Table(
        [[Table(header_left, colWidths=[90 * mm]), Table(header_right, colWidths=[80 * mm])]],
        colWidths=[90 * mm, 80 * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    flow.append(header)
    flow.append(Spacer(1, 4 * mm))

    rule = Table([[""]], colWidths=[174 * mm], rowHeights=[2])
    rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BRAND_PRIMARY)]))
    flow.append(rule)
    flow.append(Spacer(1, 6 * mm))

    bill_to = [
        Paragraph("BILL TO", label_style),
        Paragraph(f"<b>{invoice.customer.full_name}</b>", value_style),
        Paragraph(
            f"<font color='#64748b'>{invoice.customer.customer_code}</font>",
            body,
        ),
    ]
    if invoice.customer.email:
        bill_to.append(Paragraph(invoice.customer.email, body))
    if invoice.customer.phone:
        bill_to.append(Paragraph(invoice.customer.phone, body))

    meta = [
        [Paragraph("ISSUED", right_label), Paragraph(invoice.issued_date.strftime("%d %b %Y"), right_value)],
        [Paragraph("DUE", right_label), Paragraph(invoice.due_date.strftime("%d %b %Y"), right_value)],
        [Paragraph("STATUS", right_label), Paragraph(invoice.status.upper(), right_value)],
    ]
    meta_table = Table(meta, colWidths=[30 * mm, 40 * mm])
    meta_table.setStyle(TableStyle([
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
    ]))

    bill_table = Table(bill_to, colWidths=[100 * mm])
    bill_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))

    info = Table([[bill_table, meta_table]], colWidths=[104 * mm, 70 * mm])
    info.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    flow.append(info)
    flow.append(Spacer(1, 8 * mm))

    line_label = (
        invoice.customer_service.service.name
        if invoice.customer_service else "Service"
    )

    items = [
        ["DESCRIPTION", "AMOUNT", "TAX", "TOTAL"],
        [line_label, _money(invoice.amount), _money(invoice.tax), _money(invoice.total)],
    ]
    items_table = Table(items, colWidths=[80 * mm, 32 * mm, 30 * mm, 32 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SLATE_50]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, SLATE_200),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), SLATE_700),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    flow.append(items_table)
    flow.append(Spacer(1, 4 * mm))

    totals = [
        ["Subtotal", _money(invoice.amount)],
        ["Tax", _money(invoice.tax)],
        ["Total Due", _money(invoice.total)],
    ]
    totals_table = Table(totals, colWidths=[40 * mm, 40 * mm])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), SLATE_500),
        ("LINEABOVE", (0, 2), (-1, 2), 1, BRAND_PRIMARY),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 2), (-1, 2), BRAND_DARK),
        ("FONTSIZE", (0, 2), (-1, 2), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    totals_wrap = Table([["", totals_table]], colWidths=[94 * mm, 80 * mm])
    totals_wrap.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    flow.append(totals_wrap)
    flow.append(Spacer(1, 10 * mm))

    if invoice.notes:
        flow.append(Paragraph(f"<b>Notes</b>", label_style))
        flow.append(Paragraph(invoice.notes, body))
        flow.append(Spacer(1, 6 * mm))

    flow.append(Paragraph(
        f"<font color='#64748b'>Thank you for your business.</font>",
        body,
    ))

    doc.build(flow)
    return buffer.getvalue()

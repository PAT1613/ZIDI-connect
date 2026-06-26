from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def render_invoice_pdf(invoice) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    flow = []

    flow.append(Paragraph("<b>ZIDI Connect</b>", styles["Title"]))
    flow.append(Paragraph(f"Invoice {invoice.invoice_number}", styles["Heading2"]))
    flow.append(Spacer(1, 6 * mm))

    meta_rows = [
        ["Issued", invoice.issued_date.strftime("%Y-%m-%d")],
        ["Due", invoice.due_date.strftime("%Y-%m-%d")],
        ["Status", invoice.status.upper()],
        ["Customer", f"{invoice.customer.full_name} ({invoice.customer.customer_code})"],
        ["Phone", invoice.customer.phone or "—"],
        ["Email", invoice.customer.email or "—"],
    ]
    meta_table = Table(meta_rows, colWidths=[40 * mm, 120 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#475569")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    flow.append(meta_table)
    flow.append(Spacer(1, 8 * mm))

    line_label = (
        f"{invoice.customer_service.service.name}"
        if invoice.customer_service else "Service"
    )
    items = [
        ["Description", "Amount", "Tax", "Total"],
        [line_label, str(invoice.amount), str(invoice.tax), str(invoice.total)],
    ]
    items_table = Table(items, colWidths=[80 * mm, 30 * mm, 25 * mm, 25 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    flow.append(items_table)
    flow.append(Spacer(1, 8 * mm))

    if invoice.notes:
        flow.append(Paragraph(f"<b>Notes:</b> {invoice.notes}", styles["BodyText"]))
        flow.append(Spacer(1, 4 * mm))

    flow.append(Paragraph(
        "Thank you for your business. — ZIDI Connect",
        styles["Italic"],
    ))

    doc.build(flow)
    return buffer.getvalue()

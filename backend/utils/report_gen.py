from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
from models.log_entry import AttackLog, db
from sqlalchemy import func
from datetime import datetime, timedelta
import os

def generate_pdf_report(filename="report.pdf"):
    """Generate a professional PDF report of honeypot attack data"""
    
    doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=20,
        textColor=colors.HexColor('#ef4444'),
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#1f2937'),
        fontName='Helvetica-Bold'
    )
    
    # Title
    elements.append(Paragraph("🍯 HONEYPOT SECURITY REPORT", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Summary Stats
    elements.append(Paragraph("📊 Executive Summary", heading_style))
    
    total_attacks = AttackLog.query.count()
    unique_ips = db.session.query(func.count(func.distinct(AttackLog.ip_address))).scalar() or 0
    
    # Get attack type counts
    type_stats = db.session.query(
        AttackLog.attack_type, 
        func.count(AttackLog.id)
    ).group_by(AttackLog.attack_type).all()
    
    # Get country counts
    country_stats = db.session.query(
        AttackLog.country, 
        func.count(AttackLog.id)
    ).group_by(AttackLog.country).order_by(func.count(AttackLog.id).desc()).limit(5).all()
    
    # Get attacks in last 24 hours
    since_24h = datetime.utcnow() - timedelta(hours=24)
    attacks_24h = AttackLog.query.filter(AttackLog.timestamp >= since_24h).count()
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Attacks Recorded', str(total_attacks)],
        ['Unique Attacker IPs', str(unique_ips)],
        ['Attacks in Last 24 Hours', str(attacks_24h)],
        ['Report Period', 'All Time'],
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9fafb')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 25))
    
    # Attack Types Breakdown
    elements.append(Paragraph("🎯 Attack Types Distribution", heading_style))
    
    if type_stats:
        type_data = [['Attack Type', 'Count', 'Percentage']]
        for attack_type, count in type_stats:
            percentage = (count / total_attacks * 100) if total_attacks > 0 else 0
            type_data.append([attack_type or 'Unknown', str(count), f"{percentage:.1f}%"])
        
        type_table = Table(type_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
        type_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#eff6ff')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bfdbfe')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(type_table)
    else:
        elements.append(Paragraph("No attack data available.", styles['Normal']))
    
    elements.append(Spacer(1, 25))
    
    # Top Attacking Countries
    elements.append(Paragraph("🌍 Top Attacking Locations", heading_style))
    
    if country_stats:
        country_data = [['Country/Location', 'Attacks']]
        for country, count in country_stats:
            country_data.append([country or 'Unknown', str(count)])
        
        country_table = Table(country_data, colWidths=[3*inch, 2*inch])
        country_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecfdf5')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#a7f3d0')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(country_table)
    
    elements.append(Spacer(1, 25))
    
    # Recent Attack Logs
    elements.append(Paragraph("📋 Recent Attack Logs (Last 20)", heading_style))
    
    recent_logs = AttackLog.query.order_by(AttackLog.timestamp.desc()).limit(20).all()
    
    if recent_logs:
        log_data = [['Time', 'IP Address', 'Type', 'Endpoint']]
        for log in recent_logs:
            time_str = log.timestamp.strftime('%m/%d %H:%M') if log.timestamp else 'N/A'
            log_data.append([
                time_str,
                log.ip_address or 'N/A',
                (log.attack_type[:15] + '..') if log.attack_type and len(log.attack_type) > 15 else (log.attack_type or 'N/A'),
                log.endpoint or 'N/A'
            ])
        
        log_table = Table(log_data, colWidths=[1.2*inch, 1.5*inch, 1.5*inch, 1.3*inch])
        log_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#eef2ff')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#c7d2fe')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(log_table)
    else:
        elements.append(Paragraph("No recent attacks recorded.", styles['Normal']))
    
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.gray,
        alignment=1  # Center
    )
    elements.append(Paragraph("─" * 60, footer_style))
    elements.append(Paragraph("Generated by Honeypot Security Dashboard", footer_style))
    elements.append(Paragraph("This report contains simulated attack data for educational purposes.", footer_style))
    
    # Build PDF
    doc.build(elements)
    return filename

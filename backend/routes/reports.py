from flask import Blueprint, send_file
from utils.report_gen import generate_pdf_report
import os

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/api/reports/generate', methods=['POST'])
def generate_report():
    filename = os.path.join(os.path.dirname(__file__), '..', 'report.pdf')
    generate_pdf_report(filename)
    return send_file(filename, as_attachment=True)

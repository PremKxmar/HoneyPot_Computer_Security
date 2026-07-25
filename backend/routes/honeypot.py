from flask import Blueprint, request, jsonify, Response
from models.log_entry import db, AttackLog
from models.ml_model import AttackClassifier
from utils.geoip import get_location
from utils.sse import announcer
import json

honeypot_bp = Blueprint('honeypot', __name__)
classifier = AttackClassifier()

def log_attack(endpoint, method, payload=None):
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    
    # Get location with coordinates
    location = get_location(ip)
    country = location["country"]
    city = location["city"]
    lat = location["lat"]
    lon = location["lon"]
    
    # Classify attack
    attack_type = classifier.predict(payload)
    
    log = AttackLog(
        ip_address=ip,
        country=country,
        city=city,
        endpoint=endpoint,
        method=method,
        payload=payload,
        user_agent=user_agent,
        attack_type=attack_type
    )
    db.session.add(log)
    db.session.commit()
    
    # Include coordinates in SSE notification
    log_dict = log.to_dict()
    log_dict['lat'] = lat
    log_dict['lon'] = lon
    
    # Notify SSE stream
    announcer.announce(f"data: {json.dumps(log_dict)}\n\n")

@honeypot_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        username = data.get('username')
        password = data.get('password')
        payload = f"User: {username}, Pass: {password}"
        log_attack('/login', 'POST', payload)
        return jsonify({"error": "Invalid credentials"}), 401
    
    log_attack('/login', 'GET')
    return jsonify({"message": "Login required"}), 200

@honeypot_bp.route('/api/admin', methods=['GET'])
def admin_api():
    log_attack('/api/admin', 'GET')
    return jsonify({"error": "Unauthorized"}), 403

@honeypot_bp.route('/wp-admin', methods=['GET'])
def wp_admin():
    log_attack('/wp-admin', 'GET')
    return "Not Found", 404

@honeypot_bp.route('/admin', methods=['GET', 'POST'])
@honeypot_bp.route('/administrator', methods=['GET', 'POST'])
def fake_admin():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        username = data.get('username')
        password = data.get('password')
        payload = f"Admin Attempt - User: {username}, Pass: {password}"
        log_attack(request.path, 'POST', payload)
        return jsonify({"error": "Invalid credentials"}), 401
    
    log_attack(request.path, 'GET')
    return jsonify({"message": "Admin Login Required"}), 200

@honeypot_bp.route('/backup', methods=['GET'])
@honeypot_bp.route('/database.sql', methods=['GET'])
def fake_backup():
    log_attack(request.path, 'GET', "Attempted to download database backup")
    # Return a fake SQL dump
    fake_sql = "-- MySQL dump 10.13  Distrib 8.0.23, for Linux (x86_64)\n--\n-- Host: localhost    Database: sensitive_data\n-- ------------------------------------------------------\n\nDROP TABLE IF EXISTS `users`;\nCREATE TABLE `users` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `username` varchar(255) NOT NULL,\n  `password` varchar(255) NOT NULL,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n-- Dumping data for table `users`\n-- (Fake data to trick attacker)\nINSERT INTO `users` VALUES (1,'admin','5f4dcc3b5aa765d61d8327deb882cf99');"
    return Response(fake_sql, mimetype='text/plain')

@honeypot_bp.route('/.env', methods=['GET'])
@honeypot_bp.route('/config.php', methods=['GET'])
def fake_env():
    log_attack(request.path, 'GET', "Attempted to access sensitive config file")
    fake_env_content = "DB_HOST=localhost\nDB_USER=root\nDB_PASS=password123\nSECRET_KEY=supersecretkey"
    return Response(fake_env_content, mimetype='text/plain')

@honeypot_bp.route('/api/login', methods=['POST'])
def brute_force_login():
    data = request.get_json(silent=True) or request.form
    username = data.get('username', '')
    password = data.get('password', '')
    payload = f"Brute Force Attempt - User: {username}, Pass: {password}"
    log_attack('/api/login', 'POST', payload)
    return jsonify({"error": "Invalid credentials", "attempts_remaining": 2}), 401

@honeypot_bp.route('/api/internal/proxy', methods=['GET', 'POST'])
def ssrf_proxy():
    target = request.args.get('url') or (request.get_json(silent=True) or {}).get('url', '')
    payload = f"SSRF Attempt - Target URL: {target}" if target else "SSRF probe on internal proxy endpoint"
    log_attack('/api/internal/proxy', request.method, payload)
    return jsonify({"error": "Proxy service unavailable", "internal": True}), 503

@honeypot_bp.route('/upload', methods=['GET', 'POST'])
@honeypot_bp.route('/api/upload', methods=['GET', 'POST'])
def file_upload():
    if request.method == 'POST':
        filename = ''
        if request.files:
            f = list(request.files.values())[0] if request.files else None
            filename = f.filename if f else 'unknown'
        else:
            data = request.get_json(silent=True) or {}
            filename = data.get('filename', 'unknown')
        payload = f"File Upload Attack - Filename: {filename}"
        log_attack(request.path, 'POST', payload)
        return jsonify({"error": "Upload failed", "message": "File type not allowed"}), 400
    
    log_attack(request.path, 'GET', "Probing upload endpoint")
    return jsonify({"message": "Upload endpoint", "allowed_types": [".jpg", ".png", ".pdf"]}), 200

@honeypot_bp.route('/api/ldap/search', methods=['GET', 'POST'])
@honeypot_bp.route('/api/directory/lookup', methods=['GET', 'POST'])
def ldap_search():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        query = data.get('query', data.get('username', ''))
    else:
        query = request.args.get('query', request.args.get('q', ''))
    payload = f"LDAP Injection Attempt - Query: {query}" if query else "LDAP endpoint probe"
    log_attack(request.path, request.method, payload)
    return jsonify({"error": "Directory service unavailable"}), 503

# ============ Dashboard API Endpoints ============

@honeypot_bp.route('/api/threats', methods=['GET'])
def get_threats():
    """Get recent attack logs for dashboard display"""
    limit = request.args.get('limit', 50, type=int)
    logs = AttackLog.query.order_by(AttackLog.timestamp.desc()).limit(limit).all()
    return jsonify([log.to_dict() for log in logs])

# Store blocked IPs in memory (in production, use database or firewall)
blocked_ips = set()

@honeypot_bp.route('/api/block-ip', methods=['POST'])
def block_ip():
    """Block an IP address (simulated)"""
    data = request.get_json()
    ip = data.get('ip')
    
    if not ip:
        return jsonify({"success": False, "message": "IP address required"}), 400
    
    blocked_ips.add(ip)
    
    # Log the block action
    log = AttackLog(
        ip_address=request.remote_addr,
        country="System",
        city="Console",
        endpoint="/api/block-ip",
        method="POST",
        payload=f"Blocked IP: {ip}",
        user_agent="Dashboard Admin",
        attack_type="Admin Action"
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": f"IP {ip} has been blocked",
        "blocked_count": len(blocked_ips)
    })

@honeypot_bp.route('/api/blocked-ips', methods=['GET'])
def get_blocked_ips():
    """Get list of blocked IPs"""
    return jsonify(list(blocked_ips))

# ============ Email Alert Configuration ============
# Store email alert settings in memory (in production, use database)
email_alert_config = {
    "enabled": False,
    "email": "",
    "threshold": "critical",  # critical, high, medium, low
    "alerts_sent": 0
}

@honeypot_bp.route('/api/email-alerts/config', methods=['GET'])
def get_email_config():
    """Get current email alert configuration"""
    return jsonify(email_alert_config)

@honeypot_bp.route('/api/email-alerts/config', methods=['POST'])
def set_email_config():
    """Configure email alerts"""
    data = request.get_json()
    
    email_alert_config["enabled"] = data.get("enabled", False)
    email_alert_config["email"] = data.get("email", "")
    email_alert_config["threshold"] = data.get("threshold", "critical")
    
    return jsonify({
        "success": True,
        "message": "Email alert configuration updated",
        "config": email_alert_config
    })

@honeypot_bp.route('/api/email-alerts/test', methods=['POST'])
def test_email_alert():
    """Send a test email alert (simulated)"""
    if not email_alert_config["enabled"] or not email_alert_config["email"]:
        return jsonify({
            "success": False,
            "message": "Email alerts are not configured"
        }), 400
    
    # Simulate sending email (in production, use smtplib or email service)
    email_alert_config["alerts_sent"] += 1
    
    return jsonify({
        "success": True,
        "message": f"Test alert sent to {email_alert_config['email']}",
        "simulated": True,
        "alerts_sent": email_alert_config["alerts_sent"]
    })

@honeypot_bp.route('/api/email-alerts/history', methods=['GET'])
def get_alert_history():
    """Get recent critical alerts that triggered email notifications"""
    # Get recent critical attacks
    severity_map = {
        'SQL Injection': 'critical',
        'Command Injection': 'critical',
        'SSRF': 'critical',
        'LDAP Injection': 'critical',
        'XSS': 'high',
        'Directory Traversal': 'high',
        'File Upload Attack': 'high',
        'Brute Force': 'medium'
    }
    
    critical_logs = AttackLog.query.filter(
        AttackLog.attack_type.in_(['SQL Injection', 'Command Injection', 'SSRF', 'LDAP Injection'])
    ).order_by(AttackLog.timestamp.desc()).limit(20).all()
    
    return jsonify({
        "alerts": [log.to_dict() for log in critical_logs],
        "total_sent": email_alert_config["alerts_sent"],
        "config": email_alert_config
    })



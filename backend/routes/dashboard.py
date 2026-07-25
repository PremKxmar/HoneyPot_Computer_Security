from flask import Blueprint, jsonify
from models.log_entry import AttackLog, db
from sqlalchemy import func
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/stats', methods=['GET'])
def stats():
    total_attacks = AttackLog.query.count()
    
    # Attacks by Country
    country_stats = db.session.query(AttackLog.country, func.count(AttackLog.id)).group_by(AttackLog.country).all()
    
    # Attacks by Type
    type_stats = db.session.query(AttackLog.attack_type, func.count(AttackLog.id)).group_by(AttackLog.attack_type).all()
    
    # Top Attackers (by IP) - Leaderboard
    top_attackers = db.session.query(
        AttackLog.ip_address, 
        func.count(AttackLog.id).label('attack_count')
    ).group_by(AttackLog.ip_address).order_by(func.count(AttackLog.id).desc()).limit(10).all()
    
    top_attackers_list = [
        {"ip": ip, "count": count, "rank": i+1} 
        for i, (ip, count) in enumerate(top_attackers)
    ]
    
    # Recent Logs
    recent_logs = AttackLog.query.order_by(AttackLog.timestamp.desc()).limit(10).all()
    
    # Attacks over Time (Last 24 Hours)
    attacks_over_time = []
    try:
        since = datetime.utcnow() - timedelta(hours=24)
        logs = AttackLog.query.filter(AttackLog.timestamp >= since).order_by(AttackLog.timestamp).all()
        
        if logs:
            hourly_counts = {}
            for log in logs:
                hour_key = log.timestamp.strftime('%H:00')
                hourly_counts[hour_key] = hourly_counts.get(hour_key, 0) + 1
            
            attacks_over_time = [
                {"time": time, "count": count}
                for time, count in sorted(hourly_counts.items())
            ]
    except Exception as e:
        print(f"Error calculating attacks over time: {e}")
        attacks_over_time = []
    
    # Severity Distribution (based on attack types)
    severity_map = {
        'SQL Injection': 'critical',
        'Command Injection': 'critical', 
        'XSS': 'high',
        'Directory Traversal': 'high',
        'Brute Force': 'medium',
        'SSRF': 'critical',
        'File Upload Attack': 'high',
        'LDAP Injection': 'critical',
        'Reconnaissance': 'low',
        'Suspicious Activity': 'medium'
    }
    
    severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    for attack_type, count in type_stats:
        severity = severity_map.get(attack_type, 'medium')
        severity_counts[severity] += count

    return jsonify({
        "total_attacks": total_attacks,
        "country_stats": dict(country_stats),
        "type_stats": dict(type_stats),
        "recent_logs": [log.to_dict() for log in recent_logs],
        "attacks_over_time": attacks_over_time,
        "top_attackers": top_attackers_list,
        "severity_stats": severity_counts
    })


@dashboard_bp.route('/api/attack-locations', methods=['GET'])
def attack_locations():
    """Get attack locations with coordinates for the world map"""
    from utils.geoip import get_location
    
    # Severity mapping
    severity_map = {
        'SQL Injection': 'critical',
        'Command Injection': 'critical', 
        'XSS': 'high',
        'Directory Traversal': 'high',
        'Brute Force': 'medium',
        'SSRF': 'critical',
        'File Upload Attack': 'high',
        'LDAP Injection': 'critical',
        'Reconnaissance': 'low',
        'Suspicious Activity': 'medium'
    }
    
    # Get recent attacks
    attacks = AttackLog.query.order_by(AttackLog.timestamp.desc()).limit(100).all()
    
    locations = []
    for attack in attacks:
        # Get coordinates for the IP
        loc = get_location(attack.ip_address)
        
        if loc['lat'] != 0 or loc['lon'] != 0:
            locations.append({
                'id': attack.id,
                'lat': loc['lat'],
                'lon': loc['lon'],
                'country': attack.country,
                'city': attack.city,
                'attack_type': attack.attack_type,
                'ip_address': attack.ip_address,
                'timestamp': attack.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'severity': severity_map.get(attack.attack_type, 'medium')
            })
    
    return jsonify(locations)

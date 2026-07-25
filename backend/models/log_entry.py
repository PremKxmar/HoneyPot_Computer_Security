from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class AttackLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))
    country = db.Column(db.String(50))
    city = db.Column(db.String(50))
    endpoint = db.Column(db.String(100))
    method = db.Column(db.String(10))
    payload = db.Column(db.Text)
    user_agent = db.Column(db.String(200))
    attack_type = db.Column(db.String(50))

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'ip_address': self.ip_address,
            'country': self.country,
            'city': self.city,
            'endpoint': self.endpoint,
            'method': self.method,
            'payload': self.payload,
            'user_agent': self.user_agent,
            'attack_type': self.attack_type
        }

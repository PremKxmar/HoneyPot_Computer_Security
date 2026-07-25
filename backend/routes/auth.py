from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models.log_entry import db
import jwt
import datetime
import os

auth_bp = Blueprint('auth', __name__)

# Secret key for JWT (use environment variable in production)
SECRET_KEY = os.getenv('SECRET_KEY', 'honeypot-secret-key-change-in-production')

# User Model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


def generate_token(user):
    """Generate JWT token for user"""
    payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)  # Token expires in 7 days
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token


def verify_token(token):
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@auth_bp.route('/api/auth/signup', methods=['POST'])
def signup():
    """Register a new user"""
    data = request.get_json()
    
    # Validate input
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    # Validation
    if not username or len(username) < 3:
        return jsonify({'success': False, 'message': 'Username must be at least 3 characters'}), 400
    
    if not email or '@' not in email:
        return jsonify({'success': False, 'message': 'Valid email is required'}), 400
    
    if not password or len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
    
    # Check if user already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        if existing_user.username == username:
            return jsonify({'success': False, 'message': 'Username already taken'}), 409
        else:
            return jsonify({'success': False, 'message': 'Email already registered'}), 409
    
    # Create new user
    try:
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        # Generate token
        token = generate_token(new_user)
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'token': token,
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to create account'}), 500


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Login existing user"""
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
    
    if not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
    
    if not user.is_active:
        return jsonify({'success': False, 'message': 'Account is deactivated'}), 403
    
    # Generate token
    token = generate_token(user)
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/api/auth/verify', methods=['GET'])
def verify():
    """Verify JWT token and return user data"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'success': False, 'message': 'Invalid or expired token'}), 401
    
    # Get fresh user data
    user = User.query.get(payload['user_id'])
    
    if not user or not user.is_active:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user (client-side token removal)"""
    # With JWT, logout is handled client-side by removing the token
    # This endpoint is for any server-side cleanup if needed
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200


@auth_bp.route('/api/auth/change-password', methods=['POST'])
def change_password():
    """Change user password"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'success': False, 'message': 'Invalid token'}), 401
    
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'success': False, 'message': 'Both passwords required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'New password must be at least 6 characters'}), 400
    
    user = User.query.get(payload['user_id'])
    
    if not user or not user.check_password(current_password):
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 401
    
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Password changed successfully'
    }), 200

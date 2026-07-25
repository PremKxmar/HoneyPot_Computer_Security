from flask import Flask, Response
from flask_cors import CORS
from dotenv import load_dotenv
import os
from models.log_entry import db
from routes.honeypot import honeypot_bp
from routes.dashboard import dashboard_bp
from routes.reports import reports_bp
from routes.auth import auth_bp, User
from utils.sse import announcer

load_dotenv()

app = Flask(__name__)

# Postgres (Render/Railway) if DATABASE_URL is set, otherwise a local SQLite file.
# SQLAlchemy 2.x dropped the legacy "postgres://" scheme that some providers
# still hand out, so normalise it here.
database_url = os.getenv('DATABASE_URL') or 'sqlite:///database.db'
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db.init_app(app)

# Register Blueprints
app.register_blueprint(honeypot_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(auth_bp)

# Create tables at import time so this works under gunicorn too, not just
# when the module is run directly.
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return "Honeypot Backend Running"

@app.route('/api/stream')
def stream():
    def event_stream():
        messages = announcer.listen()
        while True:
            msg = messages.get()  # blocks until a new message arrives
            yield msg
    
    response = Response(event_stream(), mimetype="text/event-stream")
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['Connection'] = 'keep-alive'
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

if __name__ == '__main__':
    # Local development only. Deployments run this through gunicorn (see Procfile).
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))

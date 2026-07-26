from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix
import os
from models.log_entry import db
from routes.honeypot import honeypot_bp
from routes.dashboard import dashboard_bp
from routes.reports import reports_bp
from routes.auth import auth_bp, User
from utils.sse import announcer

load_dotenv()

app = Flask(__name__)

# Recover the real client IP when running behind a reverse proxy.
#
# Render (and every other managed host) terminates TLS at a proxy and forwards
# to the app over loopback, so request.remote_addr is the proxy -- every attack
# gets logged as 127.0.0.1 and geolocates to the same place. The attacker's
# address is in X-Forwarded-For instead.
#
# PROXY_HOPS is the number of proxies between the internet and this app.
# ProxyFix counts from the right of X-Forwarded-For, so the value must match
# the real chain: too low and you log the outermost proxy, too high and a
# client can spoof its own address by sending the header itself. Set it to 0
# when running directly on a public port with no proxy in front.
proxy_hops = int(os.getenv('PROXY_HOPS', '1'))
if proxy_hops > 0:
    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=proxy_hops, x_proto=proxy_hops, x_host=proxy_hops
    )

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


@app.route('/api/debug/client-ip')
def client_ip():
    """Report how the request's source address is being resolved.

    Use this once after deploying to set PROXY_HOPS correctly: call it from a
    browser and compare `resolved_ip` against your real public address. If they
    differ, `forwarded_for` shows the full chain -- count from the right to find
    the position your address occupies, and set PROXY_HOPS to that number.
    """
    forwarded = request.headers.get('X-Forwarded-For', '')
    return jsonify({
        'resolved_ip': request.remote_addr,
        'forwarded_for': [h.strip() for h in forwarded.split(',') if h.strip()],
        'proxy_hops': proxy_hops,
        'hint': 'resolved_ip should equal your public IP; if not, adjust PROXY_HOPS',
    })

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

import geoip2.database
import os
import random

# Random coordinates for demo purposes (major cities worldwide)
DEMO_LOCATIONS = [
    {"country": "United States", "city": "New York", "lat": 40.7128, "lon": -74.0060},
    {"country": "United Kingdom", "city": "London", "lat": 51.5074, "lon": -0.1278},
    {"country": "China", "city": "Beijing", "lat": 39.9042, "lon": 116.4074},
    {"country": "Russia", "city": "Moscow", "lat": 55.7558, "lon": 37.6173},
    {"country": "India", "city": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"country": "Brazil", "city": "São Paulo", "lat": -23.5505, "lon": -46.6333},
    {"country": "Germany", "city": "Berlin", "lat": 52.5200, "lon": 13.4050},
    {"country": "Japan", "city": "Tokyo", "lat": 35.6762, "lon": 139.6503},
    {"country": "Australia", "city": "Sydney", "lat": -33.8688, "lon": 151.2093},
    {"country": "South Korea", "city": "Seoul", "lat": 37.5665, "lon": 126.9780},
    {"country": "France", "city": "Paris", "lat": 48.8566, "lon": 2.3522},
    {"country": "Canada", "city": "Toronto", "lat": 43.6532, "lon": -79.3832},
    {"country": "Netherlands", "city": "Amsterdam", "lat": 52.3676, "lon": 4.9041},
    {"country": "Singapore", "city": "Singapore", "lat": 1.3521, "lon": 103.8198},
    {"country": "United Arab Emirates", "city": "Dubai", "lat": 25.2048, "lon": 55.2708},
]


def get_location(ip_address):
    """Get location info including coordinates for map display"""
    
    # Coimbatore, Tamil Nadu, India - default location for local/private network attacks
    TAMIL_NADU = {
        "country": "India",
        "city": "Coimbatore, Tamil Nadu",
        "lat": 11.0168,  # Coimbatore coordinates
        "lon": 76.9558
    }
    
    # Handle localhost - show Tamil Nadu
    if ip_address in ['127.0.0.1', 'localhost', '::1']:
        return {
            "country": TAMIL_NADU["country"],
            "city": TAMIL_NADU["city"],
            "lat": TAMIL_NADU["lat"] + random.uniform(-0.1, 0.1),  # Slight variation
            "lon": TAMIL_NADU["lon"] + random.uniform(-0.1, 0.1)
        }
    
    # Check for private IP ranges - show Tamil Nadu
    if ip_address.startswith(('192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.')):
        return {
            "country": TAMIL_NADU["country"],
            "city": TAMIL_NADU["city"],
            "lat": TAMIL_NADU["lat"] + random.uniform(-0.1, 0.1),
            "lon": TAMIL_NADU["lon"] + random.uniform(-0.1, 0.1)
        }
    
    try:
        # Path to the GeoLite2-City.mmdb file
        db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'GeoLite2-City.mmdb')
        
        if not os.path.exists(db_path):
            # No GeoIP database - use random demo location
            demo = random.choice(DEMO_LOCATIONS)
            return {
                "country": demo["country"],
                "city": demo["city"] + " (Simulated)",
                "lat": demo["lat"] + random.uniform(-0.5, 0.5),
                "lon": demo["lon"] + random.uniform(-0.5, 0.5)
            }

        with geoip2.database.Reader(db_path) as reader:
            response = reader.city(ip_address)
            country = response.country.name or "Unknown"
            city = response.city.name or "Unknown"
            lat = response.location.latitude or 0
            lon = response.location.longitude or 0
            return {
                "country": country,
                "city": city,
                "lat": lat,
                "lon": lon
            }
    except Exception as e:
        # Fallback to random demo location
        demo = random.choice(DEMO_LOCATIONS)
        return {
            "country": demo["country"],
            "city": demo["city"] + " (Simulated)",
            "lat": demo["lat"] + random.uniform(-0.5, 0.5),
            "lon": demo["lon"] + random.uniform(-0.5, 0.5)
        }


# Backward compatible function for existing code
def get_location_tuple(ip_address):
    """Returns tuple (country, city) for backward compatibility"""
    result = get_location(ip_address)
    return result["country"], result["city"]

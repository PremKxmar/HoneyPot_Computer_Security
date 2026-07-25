import pickle
import os
import re

class AttackClassifier:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), 'classifier.pkl')
        self.vectorizer_path = os.path.join(os.path.dirname(__file__), 'vectorizer.pkl')
        self.model = None
        self.vectorizer = None
        self.load_model()

    def load_model(self):
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(self.vectorizer_path, 'rb') as f:
                    self.vectorizer = pickle.load(f)
                print("ML Model loaded successfully.")
            else:
                print("ML Model not found. Using pattern-based detection.")
        except Exception as e:
            print(f"Error loading ML model: {e}. Using pattern-based detection.")
    
    def pattern_based_detect(self, payload):
        """Fallback pattern-based attack detection"""
        if not payload:
            return None
        
        # SQL Injection patterns
        sql_patterns = [
            r"('\s*(OR|AND)\s*'?\d*\s*=\s*'?\d*)",
            r"('?\s*OR\s+1\s*=\s*1)",
            r"(UNION\s+SELECT)",
            r"(DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO)",
            r"(SELECT\s+.+\s+FROM)",
            r"('--)",
        ]
        for pattern in sql_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "SQL Injection"
        
        # XSS patterns
        xss_patterns = [
            r"(<script[^>]*>)",
            r"(javascript\s*:)",
            r"(on\w+\s*=)",
            r"(alert\s*\(|confirm\s*\(|prompt\s*\()",
            r"(document\.cookie|document\.location)",
        ]
        for pattern in xss_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "XSS"
        
        # Directory Traversal patterns
        dir_patterns = [
            r"(\.\./|\.\.\\)",
            r"(%2e%2e/|%2e%2e\\)",
            r"(\.\..*etc.*passwd)",
        ]
        for pattern in dir_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "Directory Traversal"
        
        # Command Injection patterns
        cmd_patterns = [
            r"(;\s*cat\s|;\s*ls\s|;\s*wget\s|;\s*curl\s)",
            r"(\|\s*cat\s|\|\s*ls\s)",
            r"(`[^`]+`)",
            r"(\$\([^)]+\))",
            r"(rm\s+-rf)",
            r"(--no-preserve-root)",
        ]
        for pattern in cmd_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "Command Injection"
        
        # Brute Force patterns
        brute_patterns = [
            r"(admin|root|administrator|user|test|guest)\s*.*\s*(password|pass|123|admin|root|qwerty|letmein)",
            r"(multiple\s*login|brute\s*force|credential\s*stuff)",
            r"(password\d+|pass\d+|admin\d+)",
        ]
        for pattern in brute_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "Brute Force"
        
        # SSRF (Server-Side Request Forgery) patterns
        ssrf_patterns = [
            r"(https?://(127\.0\.0\.1|localhost|0\.0\.0\.0|10\.\d|172\.(1[6-9]|2\d|3[01])|192\.168))",
            r"(https?://169\.254\.169\.254)",  # AWS metadata
            r"(file:///|gopher://|dict://|ftp://127)",
            r"(metadata\.google|metadata\.azure)",
            r"(@localhost|@127\.0\.0\.1)",
        ]
        for pattern in ssrf_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "SSRF"
        
        # File Upload Attack patterns
        upload_patterns = [
            r"\.(php|jsp|asp|aspx|exe|sh|bat|cmd|py|pl|cgi)\s*$",
            r"(multipart/form-data.*\.(php|exe|sh|jsp))",
            r"(Content-Disposition.*filename.*\.(php|exe|sh|jsp|asp))",
            r"(webshell|shell\.php|c99|r57|b374k)",
            r"(<\?php|<%@\s*page)",
        ]
        for pattern in upload_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "File Upload Attack"
        
        # LDAP Injection patterns
        ldap_patterns = [
            r"(\*\)\(&|\)\(\||\)\(!\s*\()",
            r"(objectClass=\*|objectCategory=\*)",
            r"(\)\(uid=\*\)|\)\(cn=\*\))",
            r"(ldap://|ldaps://|LDAP\s+injection)",
            r"(\x00|\x0a|\x0d).*=(.*\*)",  # null byte injection in LDAP
        ]
        for pattern in ldap_patterns:
            if re.search(pattern, payload, re.IGNORECASE):
                return "LDAP Injection"
        
        return None

    def predict(self, payload):
        if not payload:
            return "Reconnaissance"
        
        # FIRST: Try ML model (it was trained with 97% accuracy!)
        if self.model and self.vectorizer:
            try:
                features = self.vectorizer.transform([payload])
                prediction = self.model.predict(features)[0]
                if prediction and prediction != "Normal":
                    print(f"ML classified: {prediction}")
                    return prediction
            except Exception as e:
                print(f"ML Prediction Error: {e}")
        
        # FALLBACK: Pattern-based detection if ML fails
        pattern_result = self.pattern_based_detect(payload)
        if pattern_result:
            print(f"Pattern classified: {pattern_result}")
            return pattern_result
        
        # Default
        return "Suspicious Activity"

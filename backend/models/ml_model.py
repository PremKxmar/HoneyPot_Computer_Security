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
    
    # Categories the trained model has no label for. The dataset covers only
    # SQL Injection, XSS, SSRF, Command Injection and Suspicious Activity, so
    # for anything below the model can only ever guess wrong -- it has no class
    # for the right answer. These run *before* the model is consulted;
    # otherwise a confident-but-wrong ML label short-circuits the regex layer
    # and these four categories become unreachable in practice.
    #
    # Every pattern here must be high precision, since it overrides the model.
    # Note the deliberately narrow Brute Force rule: the full rule set matches
    # "admin" near "pass", which would swallow SQL injection submitted through
    # the same login form. Only the unambiguous literals are trusted this early.
    PRIORITY_RULES = (
        ("Directory Traversal", (
            r"(\.\./|\.\.\\)",
            r"(%2e%2e/|%2e%2e\\)",
            r"(\.\..*etc.*passwd)",
        )),
        ("File Upload Attack", (
            r"\.(php|jsp|asp|aspx|exe|sh|bat|cmd|py|pl|cgi)\s*$",
            r"(multipart/form-data.*\.(php|exe|sh|jsp))",
            r"(Content-Disposition.*filename.*\.(php|exe|sh|jsp|asp))",
            r"(webshell|shell\.php|c99|r57|b374k)",
            r"(<\?php|<%@\s*page)",
        )),
        ("LDAP Injection", (
            r"(\*\)\(&|\)\(\||\)\(!\s*\()",
            r"(objectClass=\*|objectCategory=\*)",
            r"(\)\(uid=\*\)|\)\(cn=\*\))",
            r"(ldap://|ldaps://|LDAP\s+injection)",
        )),
        ("Brute Force", (
            r"(brute\s*force|credential\s*stuff|multiple\s*login)",
        )),
    )

    # Payloads the honeypot itself synthesises when a trap is probed without an
    # attack string. They describe the event rather than carrying attacker
    # input, so they are reconnaissance by definition.
    RECON_MARKERS = ("Attempted to", "probe on", "endpoint probe", "Probing")

    # Ordered detection rules. Order is significant: the first category whose
    # pattern matches wins, so the specific rules must precede the broad ones.
    RULES = (
        ("SQL Injection", (
            r"('\s*(OR|AND)\s*'?\d*\s*=\s*'?\d*)",
            r"('?\s*OR\s+1\s*=\s*1)",
            r"(UNION\s+SELECT)",
            r"(DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO)",
            r"(SELECT\s+.+\s+FROM)",
            r"('--)",
        )),
        ("XSS", (
            r"(<script[^>]*>)",
            r"(javascript\s*:)",
            r"(on\w+\s*=)",
            r"(alert\s*\(|confirm\s*\(|prompt\s*\()",
            r"(document\.cookie|document\.location)",
        )),
        ("Directory Traversal", (
            r"(\.\./|\.\.\\)",
            r"(%2e%2e/|%2e%2e\\)",
            r"(\.\..*etc.*passwd)",
        )),
        ("Command Injection", (
            r"(;\s*cat\s|;\s*ls\s|;\s*wget\s|;\s*curl\s)",
            r"(\|\s*cat\s|\|\s*ls\s)",
            r"(`[^`]+`)",
            r"(\$\([^)]+\))",
            r"(rm\s+-rf)",
            r"(--no-preserve-root)",
        )),
        ("SSRF", (
            r"(https?://(127\.0\.0\.1|localhost|0\.0\.0\.0|10\.\d|172\.(1[6-9]|2\d|3[01])|192\.168))",
            r"(https?://169\.254\.169\.254)",   # cloud instance metadata
            r"(file:///|gopher://|dict://|ftp://127)",
            r"(metadata\.google|metadata\.azure)",
            r"(@localhost|@127\.0\.0\.1)",
        )),
        ("File Upload Attack", (
            r"\.(php|jsp|asp|aspx|exe|sh|bat|cmd|py|pl|cgi)\s*$",
            r"(multipart/form-data.*\.(php|exe|sh|jsp))",
            r"(Content-Disposition.*filename.*\.(php|exe|sh|jsp|asp))",
            r"(webshell|shell\.php|c99|r57|b374k)",
            r"(<\?php|<%@\s*page)",
        )),
        ("LDAP Injection", (
            r"(\*\)\(&|\)\(\||\)\(!\s*\()",
            r"(objectClass=\*|objectCategory=\*)",
            r"(\)\(uid=\*\)|\)\(cn=\*\))",
            r"(ldap://|ldaps://|LDAP\s+injection)",
            r"(\x00|\x0a|\x0d).*=(.*\*)",       # null-byte injection
        )),
        # Broad by nature -- kept last so specific rules get first refusal.
        ("Brute Force", (
            r"(admin|root|administrator|user|test|guest)\s*.*\s*(password|pass|123|admin|root|qwerty|letmein)",
            r"(multiple\s*login|brute\s*force|credential\s*stuff)",
            r"(password\d+|pass\d+|admin\d+)",
        )),
    )

    def pattern_based_detect(self, payload, rules=None):
        """Regex attack detection against `rules` (the full set by default)."""
        if not payload:
            return None

        for label, patterns in (rules if rules is not None else self.RULES):
            for pattern in patterns:
                if re.search(pattern, payload, re.IGNORECASE):
                    return label

        return None

    def predict(self, payload):
        """Classify an attack payload.

        Three tiers, in order:
          1. High-precision rules for categories the model has no label for.
          2. The trained model, for the five categories it does know.
          3. The full rule set, as a safety net when the model is missing,
             fails to load, or returns nothing usable.
        """
        if not payload:
            return "Reconnaissance"

        # A trap that was probed without an attack string: the payload is our
        # own description of the event, not attacker input.
        if any(marker in payload for marker in self.RECON_MARKERS):
            return "Reconnaissance"

        # Tier 1 -- the model cannot represent these, so never let it guess.
        blind_spot = self.pattern_based_detect(payload, rules=self.PRIORITY_RULES)
        if blind_spot:
            print(f"Pattern classified: {blind_spot}")
            return blind_spot

        # Tier 2 -- the model, for the classes it was actually trained on.
        if self.model and self.vectorizer:
            try:
                features = self.vectorizer.transform([payload])
                prediction = self.model.predict(features)[0]
                if prediction and prediction != "Normal":
                    print(f"ML classified: {prediction}")
                    return prediction
            except Exception as e:
                print(f"ML Prediction Error: {e}")

        # Tier 3 -- full rule set.
        pattern_result = self.pattern_based_detect(payload)
        if pattern_result:
            print(f"Pattern classified: {pattern_result}")
            return pattern_result

        return "Suspicious Activity"

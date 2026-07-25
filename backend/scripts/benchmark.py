import pickle
import os
from sklearn.metrics import classification_report

def benchmark():
    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'classifier.pkl')
    vectorizer_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'vectorizer.pkl')

    if not os.path.exists(model_path):
        print("Model not found. Please train it first.")
        return

    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    with open(vectorizer_path, 'rb') as f:
        vectorizer = pickle.load(f)

    # Test Data (Simulating OWASP CRS triggers)
    test_payloads = [
        "' OR '1'='1",
        "<img src=x onerror=alert(1)>",
        "UNION SELECT 1,2,3--",
        "javascript:alert(1)",
        "Just a normal comment",
        "user@example.com"
    ]
    true_labels = [
        "SQL Injection",
        "XSS",
        "SQL Injection",
        "XSS",
        "Normal",
        "Normal"
    ]

    print("Running Benchmark...")
    try:
        X_test = vectorizer.transform(test_payloads)
        y_pred = model.predict(X_test)

        print(classification_report(true_labels, y_pred))
    except Exception as e:
        print(f"Benchmark Error: {e}")

if __name__ == '__main__':
    benchmark()

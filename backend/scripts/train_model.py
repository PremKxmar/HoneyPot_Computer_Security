import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import pickle
import os

def train():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'training_data.csv')
    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'classifier.pkl')
    vectorizer_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'vectorizer.pkl')

    if not os.path.exists(data_path):
        print("Training data not found. Creating dummy data...")
        # Create dummy data
        df = pd.DataFrame({
            'payload': [
                'SELECT * FROM users', 
                '<script>alert(1)</script>', 
                'normal user input', 
                'admin', 
                '1 OR 1=1',
                'hello world',
                'UNION SELECT',
                'javascript:void(0)',
                'search term',
                'login'
            ],
            'label': [
                'SQL Injection', 
                'XSS', 
                'Normal', 
                'Normal', 
                'SQL Injection',
                'Normal',
                'SQL Injection',
                'XSS',
                'Normal',
                'Normal'
            ]
        })
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)

    print("Training model...")
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(df['payload'])
    y = df['label']

    clf = RandomForestClassifier()
    clf.fit(X, y)

    with open(model_path, 'wb') as f:
        pickle.dump(clf, f)
    
    with open(vectorizer_path, 'wb') as f:
        pickle.dump(vectorizer, f)

    print("Model trained and saved.")

if __name__ == '__main__':
    train()

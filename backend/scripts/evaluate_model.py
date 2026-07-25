"""
Script to evaluate the accuracy of the trained ML model
Uses train-test split to measure performance metrics
"""

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import os

def evaluate():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'training_data.csv')
    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'classifier.pkl')
    vectorizer_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'vectorizer.pkl')

    # Load data
    print("=" * 60)
    print("             ML MODEL EVALUATION REPORT")
    print("=" * 60)
    
    df = pd.read_csv(data_path)
    print(f"\n[Dataset Statistics]")
    print(f"   Total samples: {len(df)}")
    print(f"\n   Label distribution:")
    for label, count in df['label'].value_counts().items():
        print(f"     - {label}: {count} ({count/len(df)*100:.1f}%)")

    # Prepare data
    X = df['payload']
    y = df['label']
    
    # Split data (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\n[Train/Test Split]")
    print(f"   Training samples: {len(X_train)}")
    print(f"   Testing samples: {len(X_test)}")
    
    # Train model
    print("\n[Training model...]")
    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    clf.fit(X_train_vec, y_train)
    
    # Predictions
    y_pred = clf.predict(X_test_vec)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    
    print("\n" + "=" * 60)
    print("                    RESULTS")
    print("=" * 60)
    
    print(f"\n*** ACCURACY: {accuracy * 100:.2f}% ***")
    
    # Cross-validation
    print("\n[Cross-Validation (5-fold)]")
    X_all_vec = vectorizer.fit_transform(X)
    cv_scores = cross_val_score(clf, X_all_vec, y, cv=5)
    print(f"   Scores: {[f'{s*100:.1f}%' for s in cv_scores]}")
    print(f"   Mean: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*2*100:.2f}%)")
    
    # Classification report
    print("\n[Classification Report]")
    print("-" * 60)
    print(classification_report(y_test, y_pred))
    
    # Confusion Matrix
    print("\n[Confusion Matrix]")
    print("-" * 60)
    labels = sorted(y.unique())
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    
    # Print header
    print(f"{'Predicted ->':>25}", end="")
    for label in labels:
        print(f"{label[:8]:>10}", end="")
    print()
    print("-" * (25 + 10 * len(labels)))
    
    # Print matrix
    for i, label in enumerate(labels):
        print(f"{'Actual: ' + label[:15]:>25}", end="")
        for j in range(len(labels)):
            print(f"{cm[i][j]:>10}", end="")
        print()
    
    print("\n" + "=" * 60)
    print("Model evaluation complete!")
    print("=" * 60)
    
    # Save the improved model
    print("\n[Saving improved model...]")
    
    # Retrain on full dataset for production
    vectorizer_full = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_full_vec = vectorizer_full.fit_transform(X)
    clf_full = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    clf_full.fit(X_full_vec, y)
    
    with open(model_path, 'wb') as f:
        pickle.dump(clf_full, f)
    
    with open(vectorizer_path, 'wb') as f:
        pickle.dump(vectorizer_full, f)
    
    print("[OK] Model saved successfully!")

if __name__ == '__main__':
    evaluate()

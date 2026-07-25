"""
Script to convert WEB_APPLICATION_PAYLOADS.jsonl to training_data.csv
This converts the JSON dataset to the format expected by train_model.py
Uses regex to extract payloads directly for robustness
"""

import csv
import os
import re

def convert_dataset():
    # Paths
    input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'WEB_APPLICATION_PAYLOADS.jsonl')
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'training_data.csv')
    
    print(f"Reading from: {input_path}")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"File size: {len(content)} characters")
    
    # Extract individual objects using regex
    # Match patterns like "id": "...", "payload": "...", "type": "..."
    
    # Find all object blocks
    entries = []
    
    # Split by '  {' which marks start of each object
    blocks = re.split(r'\n  \{', content)
    print(f"Found {len(blocks)} blocks")
    
    for block in blocks[1:]:  # Skip first empty/bracket part
        # Extract id
        id_match = re.search(r'"id":\s*"([^"]+)"', block)
        # Extract payload
        payload_match = re.search(r'"payload":\s*"((?:[^"\\]|\\.)*)"', block)
        # Extract type
        type_match = re.search(r'"type":\s*"([^"]+)"', block)
        
        if payload_match:
            payload = payload_match.group(1)
            # Unescape the payload
            payload = payload.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
            
            item_id = id_match.group(1) if id_match else ''
            item_type = type_match.group(1).lower() if type_match else ''
            
            entries.append({
                'id': item_id,
                'payload': payload,
                'type': item_type
            })
    
    print(f"Extracted {len(entries)} payloads")
    
    # Map the dataset types to our model's labels
    type_mapping = {
        # SQL Injection types
        'tautology': 'SQL Injection',
        'union': 'SQL Injection',
        'blind-time': 'SQL Injection',
        'error-based': 'SQL Injection',
        'boolean-blind': 'SQL Injection',
        'stacked-queries': 'SQL Injection',
        
        # XSS types
        'stored': 'XSS',
        'reflected': 'XSS',
        'dom': 'XSS',
        'xss': 'XSS',
        
        # Command Injection
        'command': 'Command Injection',
        'command injection': 'Command Injection',
        'command-injection': 'Command Injection',
        'os-command': 'Command Injection',
        
        # SSRF
        'ssrf': 'SSRF',
        'server-side-request-forgery': 'SSRF',
        
        # Directory Traversal
        'path-traversal': 'Directory Traversal',
        'lfi': 'Directory Traversal',
        'rfi': 'Directory Traversal',
    }
    
    # Also detect from ID prefix
    id_prefix_mapping = {
        'sqli': 'SQL Injection',
        'xss': 'XSS',
        'cmd': 'Command Injection',
        'cmdi': 'Command Injection',
        'ssrf': 'SSRF',
        'path': 'Directory Traversal',
        'lfi': 'Directory Traversal',
    }
    
    # Write CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['payload', 'label'])
        
        converted = 0
        for item in entries:
            payload = item['payload']
            item_type = item['type']
            item_id = item['id'].lower()
            
            # Try to map the type
            label = type_mapping.get(item_type)
            
            # If not found, try ID prefix
            if not label:
                for prefix, mapped_label in id_prefix_mapping.items():
                    if item_id.startswith(prefix):
                        label = mapped_label
                        break
            
            # Default to Suspicious Activity
            if not label:
                label = 'Suspicious Activity'
            
            if payload:
                writer.writerow([payload, label])
                converted += 1
    
    print(f"\nConverted {converted} payloads to: {output_path}")
    print("\nLabel distribution:")
    
    # Read back and count
    label_counts = {}
    with open(output_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = row['label']
            label_counts[label] = label_counts.get(label, 0) + 1
    
    for label, count in sorted(label_counts.items(), key=lambda x: -x[1]):
        print(f"  {label}: {count}")
    
    print("\nDone! You can now run: python scripts/train_model.py")

if __name__ == '__main__':
    convert_dataset()

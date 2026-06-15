import json

filePath = r'C:\Users\mahes\.gemini\antigravity-ide\brain\81de4303-ec59-4045-94a8-bb5277251cab\n8n_workflow_revised.json'

with open(filePath, 'r', encoding='utf-8') as f:
    data = json.load(f)

for i, node in enumerate(data.get('nodes', [])):
    # Look for nodes of type langchain
    if 'langchain' in node.get('type', ''):
        print(f"Node index {i}, name: {node.get('name')}, type: {node.get('type')}")
        parameters = node.get('parameters', {})
        options = parameters.get('options', {})
        systemMessage = options.get('systemMessage')
        if systemMessage:
            print(f"  Has systemMessage (length: {len(systemMessage)})")
            # print first 100 chars
            print(f"  Preview: {repr(systemMessage[:100])}")
        else:
            print("  No systemMessage in parameters.options")
            # Print keys in parameters
            print(f"  Keys in parameters: {list(parameters.keys())}")
            # Check other locations
            for key, val in parameters.items():
                if isinstance(val, str) and 'Noor' in val:
                    print(f"  Found 'Noor' in parameter '{key}'")

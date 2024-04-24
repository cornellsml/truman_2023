import json
import re

def read_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.readlines()

def write_file(file_path, content):
    with open(file_path, 'w', encoding='utf-8') as file:
        file.writelines(content)

def insert_code(content, code, before=None, after=None):
    insertion_code = code.split("\n") if code else []
    insertion_code = [line + '\n' for line in insertion_code]

    if before:
        before_index = next((i for i, line in enumerate(content) if before in line), None)
        if before_index is not None:
            content = content[:before_index + 1] + insertion_code + content[before_index + 1:]
    elif after:
        after_index = next((i for i, line in enumerate(content) if after in line), None)
        if after_index is not None:
            content = content[:after_index + 1] + insertion_code + content[after_index + 1:]
    else:
        content.extend(insertion_code)

    return content

def process_instructions(instructions):
    for instruction in instructions:
        file_path = instruction["File Name"]
        code_to_insert = instruction["Code"]
        before_marker = instruction.get("Before")
        after_marker = instruction.get("After")

        file_content = read_file(file_path)
        updated_content = insert_code(file_content, code_to_insert, before_marker, after_marker)
        write_file(file_path, updated_content)
        print(f"Updated {file_path} successfully.")

def read_and_parse_instructions(file_path):
    with open(file_path, 'r') as file:
        content = file.read()
    content = content.replace('“', '"').replace('”', '"')
    blocks = re.findall(r'\[CONTENT\](.*?)\[/CONTENT\]', content, re.DOTALL)
    instructions = []
    for block in blocks:
        if not block.strip():
            continue 
        file_name_match = re.search(r'"File Name":\s*"([^"]+)"', block)
        code_match = re.search(r'"Code":\s*"([^"]+)"', block)
        before_match = re.search(r'"Before":\s*"([^"]+)"', block)
        after_match = re.search(r'"After":\s*"([^"]+)"', block)

        if file_name_match and code_match:
            instruction = {
                "File Name": file_name_match.group(1),
                "Code": code_match.group(1).replace('\\n', '\n').strip()
            }
            if before_match and before_match.group(1) != "None":
                instruction["Before"] = before_match.group(1).replace('\\n', '\n').strip()
            if after_match and after_match.group(1) != "None":
                instruction["After"] = after_match.group(1).replace('\\n', '\n').strip()

            instructions.append(instruction)

    return instructions

file_path = 'instructions.txt'
instructions = read_and_parse_instructions(file_path)
print(instructions)
process_instructions(instructions)
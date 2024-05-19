# import json
# import re

# def read_file(file_path):
#     with open(file_path, 'r', encoding='utf-8') as file:
#         return file.readlines()

# def write_file(file_path, content):
#     with open(file_path, 'w', encoding='utf-8') as file:
#         file.writelines(content)

# def insert_code(content, code, before=None, after=None):
#     insertion_code = code.split("\n") if code else []
#     insertion_code = [line + '\n' for line in insertion_code]

#     if before:
#         before_index = next((i for i, line in enumerate(content) if before in line), None)
#         if before_index is not None:
#             content = content[:before_index + 1] + insertion_code + content[before_index + 1:]
#     elif after:
#         after_index = next((i for i, line in enumerate(content) if after in line), None)
#         if after_index is not None:
#             content = content[:after_index + 1] + insertion_code + content[after_index + 1:]
#     else:
#         content.extend(insertion_code)

#     return content

# def process_instructions(instructions):
#     for instruction in instructions:
#         file_path = instruction["File Name"]
#         code_to_insert = instruction["Code"]
#         before_marker = instruction.get("Before")
#         after_marker = instruction.get("After")

#         file_content = read_file(file_path)
#         updated_content = insert_code(file_content, code_to_insert, before_marker, after_marker)
#         write_file(file_path, updated_content)
#         print(f"Updated {file_path} successfully.")

# import re

# def read_and_parse_instructions(file_path):
#     with open(file_path, 'r') as file:
#         content = file.read()

#     # Normalize quotes
#     content = content.replace('“', '"').replace('”', '"')

#     # Extract content blocks
#     blocks = re.findall(r'\[CONTENT\](.*?)\[/CONTENT\]', content, re.DOTALL)
#     instructions = []

#     for block in blocks:
#         if not block.strip():
#             continue

#         # Using explicit boundaries for each section
#         file_name_match = re.search(r'"File Name":\s*"([^"]+)"', block)
#         code_match = extract_section(block, '"Code":')
#         before_match = extract_section(block, '"Before":')
#         after_match = extract_section(block, '"After":')

#         if file_name_match and code_match:
#             instruction = {
#                 "File Name": file_name_match.group(1),
#                 "Code": code_match.strip()
#             }

#             if before_match and before_match != "None":
#                 instruction["Before"] = before_match.strip()
#             if after_match and after_match != "None":
#                 instruction["After"] = after_match.strip()

#             instructions.append(instruction)

#     return instructions

# def extract_section(text, start_marker):
#     start_idx = text.find(start_marker)
#     if start_idx == -1:
#         return None
#     start_idx += len(start_marker) + 1  # Move index past the end of the start marker and skip initial quote
#     end_idx = text.find('",', start_idx)  # Assume that a ", follows the closing quote
#     if end_idx == -1:
#         end_idx = len(text)  # If no following ", assume end of text
#     section_text = text[start_idx:end_idx].strip()
#     # Replace escaped newlines and quotes correctly
#     section_text = section_text.replace('\\n', '\n').replace('\\"', '"')
#     if section_text.startswith('"'):
#         section_text = section_text[1:]  # Remove leading quote if it still exists
#     if section_text.endswith('"'):
#         section_text = section_text[:-1]  # Remove trailing quote if it still exists
#     return section_text



# file_path = 'instructions.txt'
# instructions = read_and_parse_instructions(file_path)
# print(instructions)
# process_instructions(instructions)
import json
import os
import re

def apply_instructions(instruction_file_path):
    with open(instruction_file_path, 'r') as file:
        data = file.read()

    # Define patterns to extract file names and contents
    file_name_pattern = r"Update File: \[\('([^']+)',"
    content_pattern = r'"Updated File Content": "\[CONTENT\]\n{\n  "Updated File Content": "(.*?)"\n}\n\[/CONTENT\]"'

    file_names = re.findall(file_name_pattern, data)
    file_contents = re.findall(content_pattern, data, re.DOTALL)

    if len(file_names) != len(file_contents):
        raise ValueError("Mismatch between number of file names and file contents.")

    for file_name, updated_file_content in zip(file_names, file_contents):
        print(file_name)
        print(updated_file_content)
        # Replace escaped newline characters with actual newlines
        updated_file_content = updated_file_content.replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")
        replace_file_content(file_name, updated_file_content)

def replace_file_content(file_name, new_content):
    # Ensure the directory exists
    os.makedirs(os.path.dirname(file_name), exist_ok=True)
    
    with open(file_name, 'w') as file:
        file.write(new_content)
    
    print(f"Updated {file_name}")

# Apply the instructions from the provided instructions.txt file
apply_instructions('instructions.txt')

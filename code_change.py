

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
    paths = []
    for instruction in instructions:
        file_path = instruction["File Name"]
        code_to_insert = instruction["Code"]
        before_marker = instruction.get("Before")
        after_marker = instruction.get("After")

        file_content = read_file(file_path)
        updated_content = insert_code(file_content, code_to_insert, before_marker, after_marker)
        write_file(file_path, updated_content)
        print(f"Updated {file_path} successfully.")
        paths.append(file_path)
    
    return paths

def json_transform_develop(input_string):
    content_blocks = [block.strip() for block in input_string.split('[CONTENT]') if block.strip()]

    json_list = []

    for val in content_blocks:
        content_dict = {"File Name": "", "Code": "", "Before": "", "After": ""}

        # Parsing for File Name
        file_name_match = re.search(r'"File Name":\s*"([^"]+)"', val)
        if file_name_match:
            content_dict["File Name"] = file_name_match.group(1)

        # Parsing for Code
        code_match = re.search(r'"Code":\s*"([^"]+)"', val)
        if code_match:
            content_dict["Code"] = code_match.group(1).replace("\\n", "\n").replace('\\"', '"').replace("\\'", "'")

        # Parsing for Before
        before_match = re.search(r'"Before":\s*"([^"]*)"', val)
        if before_match:
            content_dict["Before"] = before_match.group(1).replace("\\n", "\n").replace('\\"', '"').replace("\\'", "'")

        # Parsing for After
        after_match = re.search(r'"After":\s*"([^"]*)"', val)
        if after_match:
            content_dict["After"] = after_match.group(1).replace("\\n", "\n").replace('\\"', '"').replace("\\'", "'")

        json_list.append(content_dict)

    return json_list

async def main(
    msg: str = "",
):
    instructions = json_transform_develop(msg)
    paths = process_instructions(instructions)
    return paths

if __name__ == "__main__":
    import asyncio
    import fire

    fire.Fire(main)

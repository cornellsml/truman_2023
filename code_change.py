import json

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

instructions = [
    {
        "File Name": "views/partials/actorPost.pug",
        "Code": ".div(class='actor-feelings')\n  p How is #{val.actor.profile.name} feeling?",
        "Before": "a.ui.basic.red.left.pointing.label.count=val.likes",
        "After": "if val.comments.length > 0\n    .content\n      .ui.comments"
    },
    {
        "File Name": "public/css/script.css",
        "Code": "\n.grey-box {\n    background-color: #f2f2f2;\n    color: #333;\n    padding: 10px;\n    margin: 10px 0;\n    border-radius: 4px;\n}\n\n.grey-box p {\n    margin: 0;\n    padding: 0;\n    line-height: 1.5;\n}",
        "Before": ".modal .ui.form .grouped.fields .field {\n    margin-left: 5px !important;\n}"
    }
]

# Process each instruction
process_instructions(instructions)
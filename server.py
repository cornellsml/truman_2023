from flask import Flask, request, make_response, jsonify
import json
from flask_cors import CORS, cross_origin
import requests
import asyncio
import main
import analyze
import develop
import update
import code_change


app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "Hello TrumanAI Server"

@app.route('/code-implement', methods=['POST'])
@cross_origin()
def implement():
    print("POST BODY")
    print(request.json)
    develop_output = request.json.get("develop_output", "")

    #function to correctly format develop_output
    print("DEVELOP OUTPUT")
    print(develop_output)
    code_change_response = ""
    try:
        output = asyncio.run(code_change.main(develop_output))
        code_change_response = output
        status = "success"
    except Exception as e:
        code_change_response = f"Something went wrong with your request. Please try again. Error: {str(e)}"
        status = "Fail"
    
    server_response = { 
            "status" : status, 
            "response" : code_change_response
    }

    return jsonify(server_response)

@app.route('/analyze', methods=['POST'])
@cross_origin()
def get_query_TL():
    status = ""
    response_metagpt = ""
    response_metagpt_str = ""
    try:
        #metagpt parameters
        msg = request.json.get("message", "Add a grey box above each comment box in actor post. The grey box include a feeling prompt question: “How is Jane Done feeling?”. Each prompt was customized by the poster’s name. ")
        investment = request.json.get("investment", 20.0)
        n_round = request.json.get("n_round", 3)

        #metagpt call
        output = asyncio.run(analyze.main(msg=msg, investment=investment, n_round=n_round))
        json_output = json_transform_analyze(str(output))

        response_metagpt = json.loads(json_output)
        response_metagpt_str = str(output)
        status = "Success"
    except Exception as e:
        response_metagpt = f"Something went wrong with your request. Please try again. Error: {str(e)}"
        status = "Fail"
    
    print("==== METAGPT RESPONSE ====")
    print(response_metagpt)

    server_response = { 
            "status" : status, 
            "response" : response_metagpt,
            "response_str": response_metagpt_str
    } 

    return jsonify(server_response)
    

@app.route('/develop', methods=['POST'])
@cross_origin()
def response_dev():
    status = ""
    response_metagpt = ""
    response_raw = ""
    try:
        #metagpt parameters
        pm_string = request.json.get("projectManager", """
    Project Manager: [CONTENT]
{
    "General Requirement": "add the following functionality: When they upload a new photo, display a popup window after they click Submit. The popup window should prompt the user with the text 'Do you really want to share this image? Everyone on EatSnap.Love could potentially see this.' then have 2 buttons: a green button that says 'Yes, share it' and a red button that says 'No, don't share it'. If the green button is clicked, the photo should be uploaded. If the red button is clicked, the upload should not be uploaded.",
    "Type of Change": [
        "Feature addition (not to an actor post) But no recording needed"
    ],
    "Detailed Specification": [
        "Implement a popup window that appears after a user clicks the 'Submit' button for photo upload.",
        "The popup window should contain the message: 'Do you really want to share this image? Everyone on EatSnap.Love could potentially see this.'",
        "Include two buttons within the popup: a green button labeled 'Yes, share it' and a red button labeled 'No, don't share it'.",
        "If the user clicks the 'Yes, share it' button, proceed with the photo upload process.",
        "If the user clicks the 'No, don't share it' button, cancel the photo upload process."
    ],
    "Clarifications Needed": [
        "Should the popup window have a specific design or theme consistent with the current platform aesthetics?",
        "Is there a need for a feedback message or notification to the user after they decide to share or not share the photo?",
        "Should the photo upload process have a loading or progress indicator?",
        "Are there any specific conditions or settings under which this popup should not be triggered?"
    ]
}
[/CONTENT];
    """)
        clarification = request.json.get("clarification", "1. no 2. no 3. no 4. no")
        investment = request.json.get("investment", 20.0)
        n_round = request.json.get("n_round", 3)

        pm_final_string = pm_string + " Social Scientist: " + clarification
        print("FINAL STRING PM")
        print(pm_final_string)
        #metagpt call
        output = asyncio.run(develop.main(msg=pm_final_string, investment=investment, n_round=n_round))
        response_raw = output
        json_output = json_transform_develop(str(output))
        print(json_output)
        response_metagpt = json.loads(json_output)
        status = "Success"
    except Exception as e:
        response_metagpt = f"Something went wrong with your request. Please try again. Error: {str(e)}"
        response_raw = ""
        status = "Fail"
    
    print("==== METAGPT RESPONSE ====")
    print(response_metagpt)

    server_response = { 
            "status" : status, 
            "response" : response_metagpt,
            "raw-response" : response_raw
    } 

    return jsonify(server_response)
    

def jsonTransform(txt):
    # Split the input string by lines and clean up the results
    parts = txt.strip().split('\n')
    roles = ["Human", "ProjectManager", "Engineer"]
    parsed_response = {}

    current_role = None
    for line in parts:
        # Check if the line contains a role identifier
        role_identifier = [role for role in roles if line.startswith(role + ":")]
        if role_identifier:
            # Remove the role identifier from the line for the 'Human' section
            line_content = line[len(role_identifier[0]) + 1:].strip() if role_identifier[0] == "Human" else ''
            current_role = role_identifier[0]
            parsed_response[current_role] = line_content
        elif current_role:
            # Append line to the current role's content
            parsed_response[current_role] += ('\n' if parsed_response[current_role] else '') + line.strip()

    # Process ProjectManager and Engineer sections to extract JSON content
    for role in ["ProjectManager", "Engineer"]:
        if role in parsed_response:  # Check if the role exists in parsed response
            content_start = parsed_response[role].find('{')
            content_end = parsed_response[role].rfind('}') + 1
            json_content = parsed_response[role][content_start:content_end]
            parsed_response[role] = json.loads(json_content) if json_content else {}

    # Convert to JSON
    json_output = json.dumps(parsed_response, indent=4)

    return json_output

def json_transform_analyze(txt):
    # Strip the input string and split it by lines
    parts = txt.strip().split('\n')
    parsed_response = {}

    # Check for the start of the JSON content
    content_start = txt.find('{')
    content_end = txt.rfind('}') + 1
    json_content = txt[content_start:content_end]

    # Convert the extracted JSON content to a Python dictionary
    if json_content:
        parsed_response["ProjectManager"] = json.loads(json_content)

    # Convert the dictionary back to JSON string for output with formatting
    json_output = json.dumps(parsed_response, indent=4)

    return json_output

def json_transform_develop(input_string):
    # Split the input string by '[CONTENT]' and filter out any empty results
    content_blocks = [block.strip() for block in input_string.split('[CONTENT]') if block.strip()]
    val = content_blocks[0]
    val.strip()
    print(val)

    json_list = []

    for val in content_blocks:
        content_dict = {"FileName" : "", "Code" : "", "Before" : "", "After" : ""}

        #(1) Parsing for FileName
        strt = val.find('"File Name":')
        end = val.find('"Code":')
        filename_txt = val[strt + len("File Name: "):end]
        filename_txt = filename_txt[filename_txt.find('"') + 1 : filename_txt.rfind('"')]
        content_dict["FileName"] = filename_txt

        #(2) Parsing for Code
        strt = val.find('"Code":')
        end = val.rfind('"Before":')
        code_txt = val[strt + len("Code: "):end ]
        print(code_txt)
        print()
        code_txt = code_txt[code_txt.find('"') + 1 : code_txt.rfind('"')]
        content_dict["Code"] = code_txt.replace("\\", "")
        

        #(3) Parsing for Before
        strt = val.rfind('"Before":')
        end = val.rfind('"After":')
        before_txt = val[strt + len("Before: "):end ]
        print(before_txt)
        print()
        before_txt = before_txt[before_txt.find('"') + 1 : before_txt.rfind('"')]
        content_dict["Before"] = before_txt.replace("\\", "")

        #(4) Parsing for After
        strt = val.rfind('"After":')
        end = val.rfind('}')
        after_txt = val[strt + len("Before: "):end ]
        print(after_txt)
        print()
        after_txt = after_txt[after_txt.find('"') + 1 : after_txt.rfind('"')]
        content_dict["After"] = after_txt.replace("\\", "")
        json_list.append(content_dict)


    return json.dumps(json_list, indent=4)


        
if __name__ == "__main__":
    app.run(host='0.0.0.0', port="9874",debug=True)
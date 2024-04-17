from flask import Flask, request, make_response, jsonify
import json
from flask_cors import CORS
import requests
import asyncio
import main


app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "Hello TrumanAI Server"

@app.route('/code-gen', methods=['POST'])
def get_query():
    #responses
    status = ""
    response_metagpt = ""
    try:
        #metagpt parameters
        msg = request.json.get("message", "Add a grey box above each comment box in actor post. The grey box include a feeling prompt question: “How is Jane Done feeling?”. Each prompt was customized by the poster’s name. ")
        investment = request.json.get("investment", 20.0)
        n_round = request.json.get("n_round", 4)

        #metagpt call
        output = asyncio.run(main.main(msg=msg, investment=investment, n_round=n_round))
        json_output = jsonTransform(output)
        response_metagpt = json.loads(json_output)
        status = "Success"
    except Exception as e:
        response_metagpt = f"Something went wrong with your request. Please try again. Error: {str(e)}"
        status = "Fail"
    
    print("==== METAGPT RESPONSE ====")
    print(response_metagpt)

    server_response = { 
            "status" : status, 
            "response" : response_metagpt
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
        
if __name__ == "__main__":
    app.run(host='0.0.0.0', port="9874",debug=True)
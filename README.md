The Truman Platform 2.0
=======================
_Updated version of The Truman Platform https://github.com/cornellsml/truman_ 

Named after the 1998 film, The Truman Show, **The Truman Platform** is a social media simulation platform created by [The Cornell Social Media Lab](https://socialmedialab.cornell.edu/) to provide researchers a community research infrastructure to conduct social media experiments in ecologically-valid realistic environments. Researchers can create different social media environments with a repertoire of features and affordances that fit their research goals and purposes, while ensuring participants have a naturalistic social media experience. 

This project and software development was supported by the National Science Foundation through IIS-1405634. Special thanks to everyone at Cornell Social Media Lab in the Department of Communication. 

Also special thanks to Sahat Yalkabov and his [Hackathon Starter](https://github.com/sahat/hackathon-starter) project, which provided the basic organization for this project. 

## **Demo**
**[https://truman-2023-82f66bc03792.herokuapp.com/](https://truman-2023-82f66bc03792.herokuapp.com/)**. You may enter a random 6-digit ID when prompted to make an account and provide a Mechanical Turk ID.

## To create an administrator account
To create an administrator account, enter the following command in the terminal:
```bash
node addNewAdmin.js <email> <username> <password>
```
replacing `<email>`, `<username>`, and `<password>` with the appropriate values for the administrator account.

## The Truman Project
In the base directory, install the project NPM dependencies:
```bash
npm install 
```
Update your API keys:
1. Create a copy of .env.example and update `REACT_APP_OPENAI_API_KEY` and `OPENAI_API_KEY` with your OpenAPI Key.
2. Update `OPENAI_API_KEY` in key.yaml in `truman_2023/config/`. 

Build the chatbot application: 
`cd` into `/ai-frontend` and enter the following command in the terminal: 
```bash
npm run build
```

To run the Truman Project (with the chat application & API), `cd` back to the base directory. Use the following command in the terminal: 
```bash
npm start dev
```
This command starts the API server (on port 5000) and Node.js application (on port 3000) concurrently. You can then access the Truman Project application on http://localhost:3000/.


## `./MetaGPT` (MetaGPT infrastructure)
### Usage
To run the script, use the following command in the terminal in the file directory:
```bash
python code-gen-system.py
```

#### Optional Arguments
- `msg`: A string representing the task or requirement. Example:
  ```bash
  python code-gen-system.py --msg "Your requirement description here"
  ```
- `investment`: A float representing the investment amount for the task. Default is 20.0. Example:
  ```bash
  python code-gen-system.py --investment 50.0
  ```
- `n_round`: An integer representing the number of rounds for the process. Default is 5. Example:
  ```bash
  python code-gen-system.py --n_round 10
  ```

### Roles
The script has two roles:
- `ProjectManager`: Manages project tasks.
- `Engineer`: Handles engineering tasks.

### Actions
1. **Requirement Understanding**: Interprets project requirements and identifies relevant files and implementation plans.
2. **OpenFile**: Opens and reads files.
3. **WriteCode**: Generates code snippets.

### Run Flask app
To run the flask app, use the following command in the terminal in the file directory:
```bash
flask --app server run
```

## `./ai-frontend` (Chatbot application)
### Usage
Install the project NPM dependencies in the file directory:
```bash
npm install
```
Create a copy of .env.example and update `REACT_APP_OPENAI_API_KEY` with your OpenAPI Key.
To run the chatbot application, use the following command in the terminal in the file directory:
```bash
npm start
```
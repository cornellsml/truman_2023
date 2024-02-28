The Truman Platform 
=======================
_Updated version of The Truman Platform https://github.com/cornellsml/truman_ 

Named after the 1998 film, The Truman Show, **The Truman Platform** is a social media simulation platform created by [The Cornell Social Media Lab](https://socialmedialab.cornell.edu/) to provide researchers a community research infrastructure to conduct social media experiments in ecologically-valid realistic environments. Researchers can create different social media environments with a repertoire of features and affordances that fit their research goals and purposes, while ensuring participants have a naturalistic social media experience. 

This project and software development was supported by the National Science Foundation through IIS-1405634. Special thanks to everyone at Cornell Social Media Lab in the Department of Communication. 

Also special thanks to Sahat Yalkabov and his [Hackathon Starter](https://github.com/sahat/hackathon-starter) project, which provided the basic organization for this project. 

## **Demo**
**[https://truman-2023-82f66bc03792.herokuapp.com/](https://truman-2023-82f66bc03792.herokuapp.com/)**. You may enter a random 6-digit ID when prompted to make an account and provide a Mechanical Turk ID.

## Usage
To run the script, use the following command in the terminal:
```bash
python code-gen-system.py
```

### Optional Arguments
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

## Roles
The script has two roles:
- `ProjectManager`: Manages project tasks.
- `Engineer`: Handles engineering tasks.

## Actions
1. **Requirement Understanding**: Interprets project requirements and identifies relevant files and implementation plans.
2. **OpenFile**: Opens and reads files.
3. **WriteCode**: Generates code snippets.

## Notes
- Update your OPENAI-APY KEY in key.yaml (you can find it under truman_2023/config/)

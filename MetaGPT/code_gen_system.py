from metagpt.actions.add_requirement import BossRequirement
from metagpt.team import Team
from metagpt.utils.custom_decoder import CustomDecoder
from metagpt.llm import LLM
from metagpt.roles import Role
from metagpt.actions import Action
from metagpt.logs import logger
from metagpt.schema import Message

from metagpt.const import DATA_PATH, PROJECT_ROOT

import json
import fire
import re

with open(DATA_PATH / "files_and_descriptions.json", 'r') as f:
    file_descriptions = json.load(f)

def parse_data(rsp):
    pattern = r"\[CONTENT\](\s*\{.*?\}\s*)\[/CONTENT\]"
    matches = re.findall(pattern, rsp, re.DOTALL)

    for match in matches:
        if match:
            content = match
            break

    parsed_data = CustomDecoder(strict=False).decode(content)
    return parsed_data

class RequirementUnderstanding(Action):

    PROMPT_TEMPLATE = """
    ### Truman Platform: The Truman Platform (Truman) is a web application that uses a Node.js, MongoDB, Express.js and Pug templating engine webstack. The project follows a basic MVC (Model View Control) framework.

    ## Original Requirement Description: {original_req}

    ## Format Example: {FORMAT_EXAMPLE}

    ### Project Structure: The main node application (that defines the express server, connects to the MongoDB, and defines all the routes) is in app.js. Below is a breakdown of the project files, with the name of each file and a brief description of each file's purpose. {PROJECT_STRUCTURE}
    ------
    Role: You are a professional project manager of Truman platform. You should understand the project structure and how they are interconnected based on the provided Project Structure.
    Requirement: Please analyze the Original Requirement Description, identify the files that need to be modified, and provide a Implementation Plan for the requirement.
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.

    ## Relevant Files: Provided as Python list[str]. Output the `Relevant Files` identified.

    ## Implementation Plan: Provided as Python list[list[str]]. Output the detailed steps for implementing the interface change in terms of front-end, backend, and database updates. Use the complete file path.

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like format example,
    and only output the json inside this tag, nothing else
    """

    FORMATE_EXAMPLE = """
    [CONTENT]
    {
    "Relevant Files": [],
    "Implementation Plan": [["S1", "step1 implementation"], ["S2", "step2 implementation"]],
    }
    [/CONTENT]
    """

    def __init__(self, name: str = "RequirementUnderstanding", context=None, llm: LLM=None):
        super().__init__(name, context, llm)

    async def run(self, msg: str):
        prompt = self.PROMPT_TEMPLATE.format(
            original_req=msg,
            FORMAT_EXAMPLE=self.FORMATE_EXAMPLE,
            PROJECT_STRUCTURE=file_descriptions,
        )
        rsp = await self._aask(prompt)
        return rsp

class ProjectManager(Role):
    def __init__(self, name="PM", profile="ProjectManager", **kwargs):
        super().__init__(name, profile, **kwargs)
        self.name = name
        self._init_actions([RequirementUnderstanding])
        self._watch([BossRequirement])

    async def _act(self) -> Message:
        logger.info(f"{self._setting}: ready to {self._rc.todo}")
        todo = self._rc.todo

        msg = self.get_memories()[-1] # find the most k recent messages

        result = await todo.run(msg.content)

        msg = Message(content=result, role=self.profile, cause_by=type(todo))
        self._rc.memory.add(msg)

        return msg

class OpenFile(Action):

    PROMPT_TEMPLATE = """
    ## Implementation: {implementation}

    ## Format Example: {FORMAT_EXAMPLE}
    -----
    Role: You are a professional developer of Truman platform. The main goal is to open the file.
    Requirement: Please output the file path in this Implementation step. If there is no file to open, output "EMPTY".

    ## File Path: Provided as Python str. Output the file path in format like Format Example.
    """

    FORMAT_EXAMPLE = """
    "PATH/TO/FILE"
    """

    def __init__(self, name="OpenFile", context=None, llm: LLM=None):
        super().__init__(name, context, llm)

    async def run(self, step: str):
        prompt = self.PROMPT_TEMPLATE.format(implementation=step, FORMAT_EXAMPLE=self.FORMAT_EXAMPLE)
        rsp = await self._aask(prompt)
        if rsp == "EMPTY":
            return rsp
        logger.info(f'Opening {rsp}..')
        with open(PROJECT_ROOT / rsp.replace('`', '').replace('\n', '').replace('"', ''), 'r') as f:
            content = f.read()
        return content

class WriteCode(Action):

    PROMPT_TEMPLATE = """
    ## Implementation: {implementation}

    ## File Content: {file_content}
    ------
    Role: You are a professional developer of Truman platform. The main goal is to write PEP8 compliant, elegant, modular, easy to read and maintain code.
    Requirement: Please generate the code snippet according to the Implementation and File Content. Study and follow the existing codebase style. Write the code snippet that can be integrated into the existing codebase.
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.

    ## Generated Code Snippet: Provided as Python str. Output the generated code snippet as well as the location.

    output only the generated code snippet as a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like format example,
    and only output the json inside this tag, nothing else
    """

    def __init__(self, name="WriteCode", context=None, llm: LLM=None):
        super().__init__(name, context, llm)

    async def run(self, step: str, file_content: str):
        prompt = self.PROMPT_TEMPLATE.format(implementation=step, file_content=file_content)
        rsp = await self._aask(prompt)
        return rsp
    
class Engineer(Role):
    def __init__(self, name="SDE", profile="Engineer", **kwargs):
        super().__init__(name, profile, **kwargs)
        self.name = name
        self._init_actions([OpenFile, WriteCode])
        self._watch([RequirementUnderstanding])

    async def _act(self) -> Message:
        # logger.info(f"{self._setting}: ready to {self._rc.todo}")
        # todo = self._rc.todo
        req = self.get_memories()[-1]
        data = parse_data(req.content)
        for impl in data["Implementation Plan"]:
            logger.info(f'Implementing {impl[0]}: {impl[1]}..')
            content = await OpenFile().run(step=impl[1])
            result = await WriteCode().run(step=impl[1], file_content=content)
        
        msg = Message(content=result, role=self.profile, cause_by=type(WriteCode))
        return msg

class WriteFile(Action):
    PROMPT_TEMPLATE = """
    
    """

async def main(
    # msg: str = "Add a grey box above each comment box in actor post. The grey box include a feeling prompt question: “How is Jane Done feeling?”. Each prompt was customized by the poster’s name. ",
    msg: str = "Add a grey box above each comment box in actor post. The grey box include a feeling prompt question: “How is Jane Done feeling?”. Each prompt was customized by the poster’s name. ",
    investment: float = 20.0,
    n_round: int = 5,
):
    logger.info(msg)

    team = Team()
    team.hire(
        [
            ProjectManager(),
            Engineer(),
        ]
    )

    team.invest(investment=investment)
    team.start_project(msg)
    await team.run(n_round=n_round)

if __name__ == '__main__':
    fire.Fire(main)
from metagpt.actions.add_requirement import BossRequirement
from metagpt.team import Team
from metagpt.utils.custom_decoder import CustomDecoder
from metagpt.llm import LLM
from metagpt.roles import Role
from metagpt.actions import Action
from metagpt.logs import logger
from metagpt.schema import Message

from typing import List
import re
import json
import asyncio
import fire

from metagpt.const import DATA_PATH, PROJECT_ROOT
from metagpt.document_store.faiss_store import FaissStore


faiss_store = FaissStore(DATA_PATH / "file_descriptions.json", meta_col='file_name', content_col='description')


class SearchFile(Action):

    QUERY_TEMPLATE = """
    Context: {msg}. What files should edit? (The files might be CSS, JavaScript, and PUG files)
    """

    PROMPT_TEMPLATE = """
    ## Original Requirement: {original_req}
    ------
    Role: You are a professional developer of The Truman Platform. Please analyze the requirement and then output the front-end and back-end change according to original requirement. 
    """

    def __init__(self, name: str = "SearchFile", context=None, llm: LLM=None):
        super().__init__(name, context, llm)

    async def run(self, msg: str):
        prompt = self.PROMPT_TEMPLATE.format(original_req=msg)
        rsp = await self._aask(prompt)
        print(rsp)
        query = self.QUERY_TEMPLATE.format(msg=rsp)
        res = {"files": faiss_store.search(query, file_name=True), "original_req": msg}
        logger.info(res)
        return res
    

class RequirementUnderstanding(Action):

    PROMPT_TEMPLATE = """
    ## Requirement Description: {original_req}

    ## Potential Relevant Files: {files}

    ## Format Example: {FORMAT_EXAMPLE}

    ## Context: {TRUMAN_PLATFORM}
    ------
    Role: You are a professional developer of The Truman Platform.
    Requrements: Analyze and clarify the interface change requirement for the Truman social platform. Provide detailed insights and suggest specific actions that should be taken to implement this change. Consider technical aspects related to the webstack (Node.js, MongoDB, Express.js, and Pug templating engine) and best practices in web development.
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.

    ## Original Requirements: Provide as Plain text, place the polished complete original requirements here

    ## Potential Relevant Files: Provided as Python list[str]. Output the `Potential Relevant Files` provided.
    
    ## Front-end Modifications: Provided as Python list[str]. What modifications need to be made in the frontend (Pug templates, CSS, JavaScript)?

    ## Backend Updates: Provided as list[str]. What backend updates are required?

    ## Database Updates: Provided as list[str]. Is there a need for database schema updates (MongoDB)?

    ## Implementation Strategy: Provided as Python list[list[str]]. Outline the detailed steps for implementing this change according to above front-end, backend and database updates.

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like format example,
    and only output the json inside this tag, nothing else
    """

    FORMATE_EXAMPLE = """
    [CONTENT]
    {
    "Original Requirements": "",
    "Potential Relevant Files": [],
    "Front-end Modifications": [],
    "Backend Updates": [],
    "Database Updates": [],
    "Implementation Strategy": [["S1", "S1 implementation"], ["S2", "S2 implementation"]],
    }
    [/CONTENT]
    """

    OUTPUT_MAPPING = {
    "Original Requirements": (str, ...),
    "Potential Relevant Files": (List[str], ...),
    "Front-end Modifications": (List[str], ...),
    "Backend Updates": (List[str], ...),
    "Database Updates": (List[str], ...),
    "Implementation Strategy": (List[str], ...),
    }

    TRUMAN_PLATFORM = "The Truman Platform is a social media simulation platform to provide researchers a community research infrastructure to conduct social media experiments in ecologically-valid realistic environments. Researchers can create different social media environments with a repertoire of features and affordances that fit their research goals and purposes, while ensuring participants have a naturalistic social media experience. Specifically, researchers can: (1) Simulate realistic and interactive timelines and newsfeeds, by curating, creating and controlling every 'actor' (a simulated user on the website), post, like, reply, notification, and interaction that appears on the platform. (2) Customize the social media simulation platform's interface and functionality. (3) Create experiments with random assignment and exposure of participants' to different experimental conditions. (4) Collect a variety of participant behavioral metrics on the platform (including how they interact with posts and comments, how long they are on the site, and more.)"

    def __init__(self, name: str = "RequirementUnderstanding", context=None, llm: LLM=None):
        super().__init__(name, context, llm)

    async def run(self, msg: str):
        original_req = msg["original_req"]
        files = msg["files"]
        prompt = self.PROMPT_TEMPLATE.format(original_req=original_req, files=files, FORMAT_EXAMPLE=self.FORMATE_EXAMPLE, TRUMAN_PLATFORM=self.TRUMAN_PLATFORM)
        # rsp = await self._aask(prompt)
        rsp = await self._aask(prompt)
        return rsp
  

class ProjectManager(Role):
    def __init__(self, name="PM", profile="ProjectManager", **kwargs):
        super().__init__(name, profile, **kwargs)
        self.name = name
        self._init_actions([SearchFile, RequirementUnderstanding])
        self._watch([BossRequirement])
        self._set_react_mode(react_mode="by_order")

    async def _act(self) -> Message:
        logger.info(f"{self._setting}: ready to {self._rc.todo}")
        todo = self._rc.todo

        msg = self.get_memories()[-1] # find the most k recent messages

        result = await todo.run(msg.content)

        msg = Message(content=result, role=self.profile, cause_by=type(todo))
        self._rc.memory.add(msg)

        return msg


class WriteCode(Action):

    PROMPT_TEMPLATE = """
        ## Context: {context}.

        ## File Content: {file_content}
        ------
        Role: You are a professional developer of The Truman Platform.
        Please implement the changes in the provided file according to the requirements and implementation strategy. Do not create new files or delete existing files.

        output only the generated code snippet as a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like format example,
        and only output the json inside this tag, nothing else
        """
    
    FORMAT_EXAMPLE = """
    [CONTENT]
    {
        "File Name": "generated code snippet..."
    }
    [/CONTENT]
    """

    def __init__(self, name="WriteCode", context=None, llm: LLM=None):
        super().__init__(name, context, llm)

    async def run(self, context: str, file_content: dict):
        prompt = self.PROMPT_TEMPLATE.format(context=context, file_content=file_content)
        rsp = await self._aask(prompt)
        return rsp
    

class OpenFiles(Action):

    PROMPT_TEMPLATE = """
    ## Implementation: {context}. What files should be modified in these steps?

    ## Format Example: {FORMATE_EXAMPLE}

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like format example,
    and only output the json inside this tag, nothing else 
    """

    FORMATE_EXAMPLE = """
    [CONTENT]
    {
        "File Paths": ["PATH/TO/FILE", "PATH/TO/FILE"]
    }
    [/CONTENT]
    """

    def __init__(self, name="OpenFiles", context=None, llm: LLM=None):
        super().__init__(name, context, llm)
    
    async def run(self, context: str):
        prompt = self.PROMPT_TEMPLATE.format(context=context, FORMATE_EXAMPLE=self.FORMATE_EXAMPLE)
        rsp = await self._aask(prompt)

        pattern = r"\[CONTENT\](\s*\{.*?\}\s*)\[/CONTENT\]"
        matches = re.findall(pattern, rsp, re.DOTALL)

        for match in matches:
            if match:
                content = match
                break

        parsed_data = CustomDecoder(strict=False).decode(content)
        file_list = parsed_data["File Paths"]
        file_contents = {}
        for file in file_list:
            with open(file, "r") as f:
                content = f.read()
                file_contents[file] = content

        return file_contents

def parse_data(rsp):
    pattern = r"\[CONTENT\](\s*\{.*?\}\s*)\[/CONTENT\]"
    matches = re.findall(pattern, rsp, re.DOTALL)

    for match in matches:
        if match:
            content = match
            break

    parsed_data = CustomDecoder(strict=False).decode(content)
    return parsed_data


class Engineer(Role):
    def __init__(self, name="SDE", profile="Engineer", **kwargs):
        super().__init__(name, profile, **kwargs)
        self.name = name
        self._init_actions([WriteCode])
        self._watch([SearchFile, RequirementUnderstanding])

    async def _act(self) -> Message:
        logger.info(f"{self._setting}: ready to {self._rc.todo}")
        todo = self._rc.todo

        context = self.get_memories()[-1]
        file_list = parse_data(context.content)["Potential Relevant Files"]
        file_dict = {}
        for file in file_list:
            with open(PROJECT_ROOT / file, "r") as f:
                content = f.read()
                file_dict[file] = content
        for name, file_content in file_dict.items():
            logger.info(f"processing {name}")
            result = await todo.run(context.content, name+file_content)
        # pattern = r"\[CONTENT\](\s*\{.*?\}\s*)\[/CONTENT\]"
        # matches = re.findall(pattern, context, re.DOTALL)

        # for match in matches:
        #     if match:
        #         content = match
        #         break

        # parsed_data = CustomDecoder(strict=False).decode(content)
        # impls = parsed_data["Implementation Strategy"]
        # file_dict = await todo.run(impls.content)
        
        msg = Message(content=result, role=self.profile, cause_by=type(todo))
        return msg

    # async def _act(self) -> Message:
    #     logger.info(f"{self._setting}: ready to {self._rc.todo}")
    #     todo = self._rc.todo

    #     # msg = self.get_memories() # find recent messages

    #     # if isinstance(todo, OpenFiles):
    #     req = self._rc.memory.get_by_actions([RequirementUnderstanding])[-1]
    #     pattern = r"\[CONTENT\](\s*\{.*?\}\s*)\[/CONTENT\]"
    #     matches = re.findall(pattern, req, re.DOTALL)

    #     for match in matches:
    #         if match:
    #             content = match
    #             break

    #     parsed_data = CustomDecoder(strict=False).decode(content)
    #     impls = parsed_data["Implementation Strategy"]
    #     file_dict = await OpenFiles.run(impls.content)
    #     # elif isinstance(todo, WriteCode):
            
    #     # msg = self.get_memories() # find the most k recent messages
    #     req = self._rc.memory.get_by_actions([RequirementUnderstanding])[-1]

    #     # file_content = self._rc.memory.get_by_actions([OpenFiles])[-1]
    #     for name, file_content in file_dict.items():
    #         result = await WriteCode.run(req.content, name+file_content)


    #     msg = Message(content=result, role=self.profile, cause_by=todo)
    #     self._rc.memory.add(msg)

    #     return msg


async def main(
    msg: str = "Add an audience size indicator below the main content of the post, next to the right boarder. The audience size indicator should consist of an icon and a text indicating how many people have viewed. The users could see the size of the audience who had read each post",
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

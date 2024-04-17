from typing import Coroutine
import fire
import re
import json
import MetaGPT.metagpt as metagpt

from metagpt.actions import Action, UserRequirement
from metagpt.rag.engines import SimpleEngine
from metagpt.team import Team
from metagpt.roles import Role
from metagpt.logs import logger
from metagpt.schema import Message
from metagpt.utils.custom_decoder import CustomDecoder

from metagpt.rag.schema import (
    BM25RetrieverConfig,
    ChromaIndexConfig,
    ChromaRetrieverConfig,
    FAISSRetrieverConfig,
    LLMRankerConfig,
)

from metagpt.const import DOCS_ROOT, TRUMAN_ROOT

KNOWLEDGE_BASE_PATH = DOCS_ROOT / "knowledge_base.json"
FILE_STRUC_PATH = DOCS_ROOT / "file_structure.json"
FILE_DESC_PATH = DOCS_ROOT / "file_descriptions.json"

def parse_data(rsp):
    pattern = r"\[CONTENT\](\s*\{.*?\}\s*)\[/CONTENT\]"
    matches = re.findall(pattern, rsp, re.DOTALL)

    for match in matches:
        if match:
            content = match
            break

    parsed_data = CustomDecoder(strict=False).decode(content)
    return parsed_data

class AnalzeRequirement(Action):

    PROMPT_TEMPLATE: str = """
    ## Knowledge Base: {document}

    ## Social Scientist Requirement: {requirement}

    ## Format Example: {FORMAT_EXAMPLE}
    -----
    Role: You are a project manager of 'Truman Platform'. You are receiving a requirement from a social scientist with no techical background. You will then develop a comprehensive specification that outlines this change in detail. The purpose of this specification is to ensure clear communication and mutual understanding of the requirements between you and the social scientist. It's important to focus solely on clarifying these requirements without considering implementation aspects at this stage.
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.

    ## General Requirement: Provided as Python str. Output the general requirement.

    ## Type of Change: Provided as Python list[str]. Output the type of change.

    ## Detailed Specification: Provided as Python list[str]. Output the specific changes.

    ## Clarifications Needed: Provided as Python list[str]. Output the clarification questions.

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like Format Example, and only output the json inside this tag, nothing else
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    "General Requirement": "",
    "Type of Change": [],
    "Detailed Specification": [],
    "Clarifications Needed": []
    [/CONTENT]
    """

    name: str = "AnalzeRequirement"

    async def run(self, requirement: str):
        # logger.info(f"user input: {requirement}")
        with open(KNOWLEDGE_BASE_PATH, "r") as f:
            document = json.load(f)
        prompt = self.PROMPT_TEMPLATE.format(document=document, requirement=requirement, FORMAT_EXAMPLE=self. FORMAT_EXAMPLE)

        rsp = await self._aask(prompt)

        return rsp

class ProjectManager(Role):
    name: str = "PM"
    profile: str = "ProjectManager"
    goal: str = "analyze requirement, clarify requirement, and generate a specification."
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.set_actions([AnalzeRequirement])
        self._watch([UserRequirement])

    async def _act(self) -> Message:
        logger.info(f"{self._setting}: to do {self.rc.todo}({self.rc.todo.name})")
        todo = self.rc.todo

        msg = self.get_memories(k=1) # find the most k recent messages

        result = await todo.run(msg)

        msg = Message(content=result, role=self.profile, cause_by=type(todo))

        return msg

class WriteSpec(Action):

    PROMPT_TEMPLATE: str = """
    ## Context: {context}
    Review the requirement. Input `OK` if you think we can procceed. Otherwise, tell me what's missing or what you'd like to add.
    """

    name: str = "WriteSpec"

    async def run(self, context: str):
        prompt = self.PROMPT_TEMPLATE.format(context=context)
        rsp = await self._aask(prompt)
        return rsp


class SpecWriter(Role):
    name: str = "SW"
    profile: str = "SpecWriter"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.set_actions([WriteSpec])
        self._watch([AnalzeRequirement])

class SumarizeRequirement(Action):

    PROMPT_TEMPLATE: str = """
    ## Knowledge Base: {document}

    ## Conversation: {conversation}

    ## Format Example: {FORMAT_EXAMPLE}
    -----
    Role: You are a TechLead of a web application 'Truman Platform'. You are receiving the conversation between the project manager and the social scientist (SpecWriter). Your task is to summarize the requirement.
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.
    ## Requirement: Provided as Python list[str]. Output the summarized requirement.
    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like Format Example, and only output the json inside this tag, nothing else.
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    "Requirement": []
    [/CONTENT]
    """

    name: str = "SumarizeRequirement"

    async def run(self, conversation: str):
        with open(KNOWLEDGE_BASE_PATH, "r") as f:
            document = json.load(f)
        prompt = self.PROMPT_TEMPLATE.format(document=document, conversation=conversation, FORMAT_EXAMPLE=self.FORMAT_EXAMPLE)

        rsp = await self._aask(prompt)

        return rsp

class RAGEngine:

    def __init__(self):
        self.engine = SimpleEngine.from_docs(
            input_files=[FILE_DESC_PATH, FILE_STRUC_PATH],
            retriever_configs=[FAISSRetrieverConfig(), BM25RetrieverConfig()],
            ranker_configs=[LLMRankerConfig()],
        )
    
    async def run_pipeline(self, question, print_title=True):
        """This example run rag pipeline, use faiss&bm25 retriever and llm ranker, will print something like:

        Retrieve Result:
        0. Productivi..., 10.0
        1. I wrote cu..., 7.0
        2. I highly r..., 5.0

        Query Result:
        Passion, adaptability, open-mindedness, creativity, discipline, and empathy are key qualities to be a good writer.
        """
        if print_title:
            self._print_title("Run Pipeline")

        nodes = await self.engine.aretrieve(question)
        self._print_retrieve_result(nodes)
        # print("DEBUG:", question)
        answer = await self.engine.aquery(question)
        self._print_query_result(answer)
        return answer

    @staticmethod
    def _print_title(title):
        logger.info(f"{'#'*30} {title} {'#'*30}")

    @staticmethod
    def _print_retrieve_result(result):
        """Print retrieve result."""
        logger.info("Retrieve Result:")

        for i, node in enumerate(result):
            logger.info(f"{i}. {node.text[:10]}..., {node.score}")

        logger.info("")

    @staticmethod
    def _print_query_result(result):
        """Print query result."""
        logger.info("Query Result:")

        logger.info(f"{result}\n")

    async def _retrieve_and_print(self, question):
        nodes = await self.engine.aretrieve(question)
        self._print_retrieve_result(nodes)
        return nodes

class RAGSearch(Action):

    QUESTION: str = """
    ## Requirement: {requirement}

    ## Format Example: {FORMAT_EXAMPLE}
    ---
    Given the requirement, please find the files should be modified. 
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.

    ## Files: Provided as Python list[str]. Output the relevant files.

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like Format Example, and only output the json inside this tag, nothing else.
    """
    QUESTION: str = """
    ## Requirement: {requirement}
    -----
    Given the requirement, please find the files should be modified.
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    "Files": []
    [/CONTENT]
    """
    name: str = "RAGSearch"

    async def run(self, requirement):
        # question = self.QUESTION.format(requirement=requirement, FORMAT_EXAMPLE=self.FORMAT_EXAMPLE)
        question = self.QUESTION.format(requirement=requirement)
        engine = RAGEngine()
        answer = await engine.run_pipeline(question=question)
        return f"{answer}\n"
        
class WritePlan(Action):
    
    PROMPT_TEMPLATE: str = """
    ## Requirement: {requirement}

    ## Relevant Files: {files}

    ## Format Example: {FORMAT_EXAMPLE}
    ---
    Role: You are a TechLead of a web application 'Truman Platform'. You are receiving a requirement from a project manager. Your task is to develop an implementation plan for the interface change the project manager wants to make based on the identified relevant files (exclude the files with 'Optinal' tag). This plan should be detailed enough for a developer to implement. 
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.
    # Implementation Plan: Provided as Python list[list[str]]. Output the implementation plan. Each item in the list should be a list of two strings: the first string is the path to the file that needs to be modified, and the second string is the plan for that file.
    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like Format Example, and only output the json inside this tag, nothing else.
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    "Implementation Plan": [["PATH/TO/FILE", "Plan"], ["PATH/TO/FILE", "Plan"], ["PATH/TO/FILE", "Plan"], ...]
    [/CONTENT]
    """

    name: str = "WritePlan"

    async def run(self, requirement: str, files: str):
        prompt = self.PROMPT_TEMPLATE.format(requirement=requirement, files=files, FORMAT_EXAMPLE=self.FORMAT_EXAMPLE)
        rsp = await self._aask(prompt)
        return rsp
    

class TechLead(Role):
    name: str = "TL"
    profile: str = "TechLead"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._set_react_mode("by_order")
        self.set_actions([SumarizeRequirement, RAGSearch, WritePlan])
        self._watch([WriteSpec])
    
    async def _act(self) -> Message:
        logger.info(f"{self._setting}: to do {self.rc.todo}({self.rc.todo.name})")
        todo = self.rc.todo

        if todo.name == "SumarizeRequirement":
            contexts = self.get_memories(k=2)
            specification = contexts[0].content
            answer = contexts[1].content
            conversation = f"Project Manager: {specification}; Social Scientist: {answer}"
            # print("DEBUG:", conversation)
            requirement = await todo.run(conversation)
            msg = Message(content=requirement, role=self.profile, cause_by=type(todo))
            self.rc.memory.add(msg)
        elif todo.name == "RAGSearch":
            contexts = self.get_memories(k=1) # find the most k recent messages
            # requirement = contexts[0].content
            # print("DEBUGGGG:",contexts)
            requirement = parse_data(contexts[0].content)["Requirement"]
            # print("DEBUG:",requirement)
            files = await todo.run(requirement)
            msg = Message(content=files, role=self.profile, cause_by=type(todo))
            self.rc.memory.add(msg)
        else:
            contexts = self.get_memories(k=2) # find the most k recent messages
            requirement = contexts[0].content
            files = contexts[1].content
            # print("DEBUG:",requirement, files)
            result = await todo.run(requirement=requirement, files=files)
            msg = Message(content=result, role=self.profile, cause_by=type(todo))
            self.rc.memory.add(msg)
        return msg

class WriteCode(Action):

    PROMPT_FORMAT: str = """
    ## File Name: {name}
    ## File content: {file_content}
    ## Implementation plan: {impl_plan}
    ---
    Role: You are a senior software developer. The main goal is to write PEP8 compliant, elegant, modular, easy to read and maintain code based on the TechLead's implementation plan.

    ## File Name: Provided as Python str. Output the file name.

    ## Code: Provided as Python str. Output the code snippet.

    ## Location: Provided as Python str. Output the location of the code snippet in the file.

    output only the generated code snippet as a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like format example,
    and only output the json inside this tag, nothing else
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    "File Name": "",
    "Code": "",
    "Location": ""
    [/CONTENT]
    """
    name: str = "WriteCode"

    async def run(self, plan):
        output = []
        for p in plan:
            with open(TRUMAN_ROOT / p[0], "r") as f:
                file_content = f.read()
            prompt = self.PROMPT_FORMAT.format(name=p[0], file_content=file_content, impl_plan=p[1])
            rsp = await self._aask(prompt)
            output.append(rsp)
        return f'{output}'


class Developer(Role):
    name: str = "Dev"
    profile: str = "Developer"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.set_actions([WriteCode])
        self._watch([WritePlan])

    async def _act(self) -> Message:
        logger.info(f"{self._setting}: to do {self.rc.todo}({self.rc.todo.name})")
        todo = self.rc.todo
        contexts = self.get_memories(k=1)
        plans = parse_data(contexts[0].content)["Implementation Plan"]
        result = await todo.run(plan=plans)
        msg = Message(content=result, role=self.profile, cause_by=type(todo))
        self.rc.memory.add(msg)
        return msg

async def main(
    msg: str = "Add a grey box above each comment box in actor post. The grey box include a feeling prompt question: “How is Jane Done feeling?”. Each prompt was customized by the poster's name. ",
    
    # msg: str = "When a user creates an account, randomly assign them to one of 6 experimental conditions: 'view:large', 'view:small', 'view:none', 'none:large', 'none:small', 'none:none'. This information should not be displayed to the user.",

    # msg: str = """When a user creates an account, randomly assign them to one of 4 experimental conditions: "none:view", "empathy:view", "none:none", "empathy:none". This information should not be displayed to the user.""",
    
    # msg: str = """
    # When a user creates an account, randomly assign them to one of 6 experimental conditions: "users:ambiguous", "ai:ambiguous", "none:ambiguous", "users:unambiguous", "ai:unambiguous", "none:unambiguous". This information should not be displayed to the user.
    # """,

    # msg: str = """
    # When a user creates an account, randomly assign them to one of 4 experimental conditions: "5:nudge", "5:none", "80:nudge", "80:none". This information should not be displayed to the user.
    # """,

    # msg: str = """
    # When a user creates an account, randomly assign them to one of 6 experimental conditions: "others:ambig", "ai:ambig", "none:ambig", "others:unambig", "ai:unambig", "none:unambig". This information should not be displayed to the user.
    # """,

    # msg: str = """
    # When a user creates an account, randomly assign them to one of 3 experimental conditions: "5", "4", "2". This information should not be displayed to the user.
    # """,

    # msg: str = """
    # 1. For each post, assign a large view count and a small view count. The large view count value should be a random number between 145 and 203, and the small view count value should be a random number between 6 and 20.

    # 2. If the user is in the experimental group "view:large", "none:large", "view:small" or "none:small", then at the bottom right of each post (below the picture but above the reply, flag, share, like buttons), display a small check icon and the text "Seen by #" next to it. The # should be replaced by the post's large view count if the user is in the experimental group "view:large" or "none:large" or by post's small view count if the user is in the experimental group "view:small" or "none:small".
    # """,

    # msg: str = """
    # If the user is in the experimental group "view: large", "view:small", or "view:none", then for each post, when they scroll past the post, display an opaque overlay over the post. This overlay should have the following: a large eye icon, the text "You've read this!", and a black button "Read Again?". If the user is in the experimental group "view:large" or "view:small", the overlay should also display the original poster's profile photo alongside text that says "Jane Doe" has been notified, where "Jane Doe" is replaced with the orignal poster's name. All these items should appear one above another and centered on the overlay. When the "Read Again?" button is clicked, the overlay should fade away so the user can see the post again.
    # """,
        
    # msg: str = """
    # After a user signs up for the platform and views the community rules, add a page that allows users to choose 2 cuisines out of a list of 5 (Cajun, Asian, American, Italian, Mexican). Display the text: "Choose 2 cuisines you are interested in for a more personalized newsfeed" above the selection form. Record the user's selection. Only display the posts with labels matching the user's selection in the newsfeed.

    # Posts labeled with the class "Cajun", "Asian", "American", "Italian", "Mexican" should be displayed differently. They should be displayed with a light gray background. The username should have a blue verified check icon to it's right, and below the username should be the text "Sponsored Ad". The timestamp of the post should be replaced with a button "Follow" that when clicked, changes to "Following" with a check mark and follows the original poster. Above the post should be a header that says "Suggested for you" on the left and a close icon on the right. When the close icon is clicked, the post should be hidden. In it's place should be a blank post that says "This post has been hidden". Whether a post has been hidden or not by the user should be recorded. 
    # """,

    investment: float = 20.0,
    n_round: int = 3,
):
    logger.info(msg)

    team = Team()
    team.hire(
        [
            ProjectManager(),
            SpecWriter(is_human=True),
            TechLead(),
            Developer()
        ]
    )

    team.invest(investment=investment)
    team.run_project(msg)
    await team.run(n_round=n_round)

if __name__ == '__main__':
    fire.Fire(main)
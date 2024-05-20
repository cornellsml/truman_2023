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
    # print("DEBUG:", matches)
    for match in matches:
        if match:
            content = match
            break

    parsed_data = CustomDecoder(strict=False).decode(content)
    return parsed_data

def dev_parse_data(rsp):
    pattern = r"Developer:\s*\[CONTENT\](\s*\{.*?\}\s*)\[/CONTENT\]"
    matches = re.findall(pattern, rsp)
    for match in matches:
        if match:
            content = match
            break

    parsed_data = CustomDecoder(strict=False).decode(content[1])
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
    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like "Format Example", and only output the json inside this tag, nothing else.
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

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like "Format Example", and only output the json inside this tag, nothing else.
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

    ## Knowledge Base: {document}

    ## Format Example: {FORMAT_EXAMPLE}
    ---
    Role: You are a TechLead of a web application 'Truman Platform'. You are receiving a requirement from a project manager. Remember the Technical guidance in Knowledge Base. Your task is to develop an implementation plan for the interface change the social scientist wants to make based on the identified relevant files (exclude the files with 'Optinal' tag). This plan should be detailed enough for a developer to implement. 
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.

    # Implementation Plan: Provided as Python list[list[str]]. Output the implementation plan. Each item in the list should be a list of two strings: the first string is the path to the file that needs to be modified, and the second string is the plan for that file.

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like 'Format Example', and only output the json inside this tag, nothing else. The key of the JSON should be 'Implementation Plan'.
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    "Implementation Plan": [["PATH/TO/FILE", "Plan"], ["PATH/TO/FILE", "Plan"], ["PATH/TO/FILE", "Plan"], ...]
    [/CONTENT]
    """

    name: str = "WritePlan"

    async def run(self, requirement: str, files: str):
        with open(KNOWLEDGE_BASE_PATH, "r") as f:
            document = json.load(f)
        prompt = self.PROMPT_TEMPLATE.format(document=document, requirement=requirement, files=files, FORMAT_EXAMPLE=self.FORMAT_EXAMPLE)
        rsp = await self._aask(prompt)
        return rsp
    

class TechLead(Role):
    name: str = "TL"
    profile: str = "TechLead"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._set_react_mode("by_order")
        self.set_actions([SumarizeRequirement, RAGSearch, WritePlan])
        self._watch([UserRequirement])
    
    async def _act(self) -> Message:
        logger.info(f"{self._setting}: to do {self.rc.todo}({self.rc.todo.name})")
        todo = self.rc.todo

        if todo.name == "SumarizeRequirement":
            conversation = self.get_memories(k=1)
            # specification = contexts[0].content
            # answer = contexts[1].content
            # conversation = f"Project Manager: {specification}; Social Scientist: {answer}"
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
    ## Format Example: {FORMAT_EXAMPLE}
    ---
    Role: You are a senior software developer. The main goal is to write PEP8 compliant, elegant, modular, easy to read and maintain code based on the TechLead's implementation plan.

    ## File Name: Provided as Python str. Output the file name.

    ## Code: Provided as Python str. Output the generated code snippet.

    ## Before: Provided as Python str. Output the 3 lines of code before the generated code snippet.

    ## After: Provided as Python str. Output the 3 lines of code after the generated code snippet.

    output only the generated code snippet as a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like Format Example,
    and only output the json inside this tag, nothing else
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    "File Name": "",
    "Code": "",
    "Before": "",
    "After": ""
    [/CONTENT]
    """
    name: str = "WriteCode"

    async def run(self, plan):
        output = []
        for p in plan:
            try:
                with open(TRUMAN_ROOT / p[0], "r") as f:
                    file_content = f.read()
            except FileNotFoundError:
                file_content = "File not found. Please create a new file."
            prompt = self.PROMPT_FORMAT.format(name=p[0], file_content=file_content, impl_plan=p[1], FORMAT_EXAMPLE=self.FORMAT_EXAMPLE)
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
    msg: str = """
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
[/CONTENT]; Social Scientist: 1. no 2. no 3. no 4.no
    """,    
    
    # msg: str = "Add a grey box above each comment box in actor post. The grey box include a feeling prompt question: “How is Jane Done feeling?”. Each prompt was customized by the poster's name. ",
    
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
    # for each post, when they scroll past the post, display an opaque overlay over the post. This overlay should have the following: a large eye icon, the text "You've read this!", and a black button "Read Again?". If the user is in the experimental group "view:large" or "view:small", the overlay should also display the original poster's profile photo alongside text that says "Jane Doe" has been notified, where "Jane Doe" is replaced with the orignal poster's name. All these items should appear one above another and centered on the overlay. When the "Read Again?" button is clicked, the overlay should fade away so the user can see the post again.
    # """,

    # msg: str =  """
    # for each actor post, add a grey box above the comment box. The grey box should include a feeling prompt question: 'How is Jane Done feeling?' where the name "Jane Doe" is customized by the original poster's name.
    # """,
        
    # msg: str = """
    # for each post, when they scroll past a post, display a grey box over the bottom quarter of the picture. The grey box should span the entire width of the picture and display the text "You've read this!". Also, it should display the original poster's profile picture, and the text "Jane Doe has been notified", where "Jane Doe" is customized by the original poster's name. 
    # """,

    # msg: str = """
    # add the following functionality: When they upload a new photo, display a popup window after they click Submit. The popup window should prompt the user with the text "Do you really want to share this image? Everyone on EatSnap.Love could potentially see this." then have 2 buttons: a green button that says "Yes, share it" and a red button that says "No, don't share it". If the green button is clicked, the photo should be uploaded. If the red button is clicked, the upload should not be uploaded.
    # """,

    # msg: str = """
    # Show the post that has the comment labeled "ambig_flag" or "unambig_flag" at the top of the timeline each day. 
    # """,

    # msg: str = """
    # Show the post that has the comment labeled "ambig_none" or "unambig_none" in the middle of the newsfeed each day. Make sure the user always sees the unmoderated harassment comment post after the moderated harassment comment post. 
    # """,

    # msg: str = """
    # Below the comments labeled "ambig_flag" and "unambig_flag", put a prompt box. In this prompt box, an icon will be showed on the left and text and "Yes" and "No" buttons will be shown on the right. The icon and the text shown depends on the user's experimental condition. 
    # If the user is in the experimental condition "users:ambiguous" or "users: unambiguous", the icon shown is a flag and the text says "Other users have flagged this comment as harassment. Do you agree?". If the user is in the experimental condition "ai:ambiguous" or "ai:unambiguous", the icon shown is a computer and the text says "Our automated system has flagged this comment as harassment. Do you agree?". If the user is in the experimental condition "none:ambiguous" or "ai:ambiguous", the icons hown is a flag and the text says "This comment has been flagged as harassment. Do you agree?". 
    # The comment and the prompt should all be outlined by a box with a glowing red border. The background color of the entire post is also changed to red. 

    # The user's selection in the prompt box of "Yes" or "No" should be recorded.

    # After a user selects "Yes" or "No" in the prompt box, the background color of the entire post should change to it's original color. If the user selected "Yes", hide the comment. If the user selected "No", do not hide the comment. Additionally, the prompt box should be replaced with a new prompt box. This new prompt box shold be green, with a scale icon to the left and the text "Your response has been recorded. Do you want to view the moderation policy?" with "Yes" and "No" buttons below it to the right. If the user's selection in this prompt box is "No", the prompt box should disappear. If the user's selection in this prompt box is "Yes", redirect the user to the community rules page. 
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
            TechLead(),
            Developer()
        ]
    )

    team.invest(investment=investment)
    team.run_project(msg)
    msg = await team.run(n_round=n_round)
    # print(msg)
    start = msg.find("Developer: ['") + len("Developer: ['")
    end = msg.find("']", start)
    developer_content = msg[start:end].strip()
    # print(developer_content)
    return developer_content

if __name__ == '__main__':
    fire.Fire(main)

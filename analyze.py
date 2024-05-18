import asyncio
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

from metagpt.const import DOCS_ROOT

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

class AnalzeRequirement(Action):

    PROMPT_TEMPLATE: str = """
    ## Knowledge Base: {document}

    ## Social Scientist Requirement: {requirement}

    ## Format Example: {FORMAT_EXAMPLE}
    -----
    Role: You are a project manager of 'Truman Platform'. You are receiving a requirement from a social scientist with no technical background. You will then develop a comprehensive specification that outlines this change in detail. The purpose of this specification is to ensure clear communication and mutual understanding of the requirements between you and the social scientist. It's important to focus solely on clarifying these requirements without considering implementation aspects at this stage.
    ATTENTION: Use '##' to SPLIT SECTIONS, not '#'.

    ## General Requirement: Provided as Python str. Output the general requirement.

    ## Type of Change: Provided as Python list[str]. Output the type of change.

    ## Detailed Specification: Provided as Python list[str]. Output the specific changes.

    ## Clarifications Needed: Provided as Python list[str]. Output the clarification questions.

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like "Format Example", and only output the json inside this tag, nothing else
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

async def main(
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

    msg: str =  """
    for each actor post, add a grey box above the comment box. The grey box should include a feeling prompt question: 'How is Jane Done feeling?' where the name "Jane Doe" is customized by the original poster's name.
    """,
        
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

    # msg: str = """
    # 1. For each post, assign a large view count and a small view count. The large view count value should be a random number between 145 and 203, and the small view count value should be a random number between 6 and 20. 

    # 2. If the user is in the experimental group "view:large", "none:large", "view:small" or "none:small", then at the bottom right of each post (below the picture but above the reply, flag, share, like buttons), display a small check icon and the text "Seen by #" next to it. The # should be replaced by the post's large view count if the user is in the experimental group "view:large" or "none:large" or by post's small view count if the user is in the experimental group "view:small" or "none:small".
    # """,

    investment: float = 20.0,
    n_round: int = 3,
):
    logger.info(msg)

    # team.invest(investment=investment)
    # team.run_project(msg)
    # await team.run(n_round=n_round)
    Role = ProjectManager()
    result = await Role.run(msg)
    return result

if __name__ == '__main__':
    fire.Fire(main)
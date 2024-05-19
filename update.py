from typing import Coroutine
import fire
import re
import json
import os
import asyncio

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

class UpdateFile(Action):

    PROMPT_TEMPLATE: str = """
    ## File Content: {file_content}

    ## Generate Code Snippet: {code_snippet}

    ## Instruction: {instruction}

    ## Format Example: {FORMAT_EXAMPLE}
    -----
    Role: You are a senior software developer. You are receiving a code snippet from another developer. You need to follow the instructions to update the file accordingly.
    ATTENTION: Use `##` to SPLIT SECTIONS, not `#`.

    # Updated File Content: Provided as Python str. Output the updated file content.

    output a properly formatted JSON, wrapped inside [CONTENT][/CONTENT] like "Format Example", and only output the json inside this tag, nothing else.
    """

    FORMAT_EXAMPLE: str = """
    [CONTENT]
    {
      "Updated File Content": "updated content here"
    }
    [/CONTENT]
    """

    async def run(self, file_content: str, code_snippet: str, instruction: str):
        prompt = self.PROMPT_TEMPLATE.format(file_content=file_content, code_snippet=code_snippet, instruction=instruction, FORMAT_EXAMPLE=self.FORMAT_EXAMPLE)
        rsp = await self._aask(prompt)
        return rsp
        

class Writer(Role):
    name: str = "Writer"
    profile: str = "Update File"
    goal: str = "update the file based on the generated code snippet and instructions"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.set_actions([UpdateFile])
        self._watch([UserRequirement])
        
    async def _act(self) -> Message:
        logger.info(f"{self._setting}: to do {self.rc.todo}({self.rc.todo.name})")
        todo = self.rc.todo
        
        msg = self.get_memories(k=1)

        contents = re.findall(r'\[CONTENT](.*?)\[/CONTENT]', msg[0].content, re.DOTALL)
        updated_files = []
        for content in contents:
            rsp = f"[CONTENT]{content}[/CONTENT]"
            parsed_content = parse_data(rsp)
            file_name = parsed_content["File Name"]
            code_snippet = parsed_content["Code"]
            instruction = parsed_content["Instruction"]
            with open(TRUMAN_ROOT / file_name, "r") as f:
                file_content = f.read()
            updated_file_content = await todo.run(file_content=file_content, code_snippet=code_snippet, instruction=instruction)
            updated_files.append((file_name, updated_file_content))
            
            logger.info(f"Updated file: {file_name}")
        
        results = [f"Update File: [('{file_name}', '[CONTENT]\\n{{\\n  \"Updated File Content\": \"{content}\"\\n}}\\n[/CONTENT]')]" for file_name, content in updated_files]
        msg = Message(content="\n".join(results), role=self.profile, cause_by=type(todo))
        return msg
        

def main(
msg: str = 
"""[CONTENT]
{
  "File Name": "views/partials/actorPost.pug",
  "Code": ".feeling-prompt\n  | How is #{val.actor.profile.name} feeling?",
  "Instruction": "Add this code snippet above the .ui.fluid.left.labeled.right.icon.input div element."
}
[/CONTENT]
[CONTENT]
{
  "File Name": "public/css/script.css",
  "Code": ".feeling-prompt {\n    background-color: #f0f0f0;\n    font-family: Arial, sans-serif;\n    font-size: 14px;\n    pointer-events: none;\n}",
  "Instruction": "Add this CSS snippet at the end of the 'public/css/script.css' file to define styles for the 'feeling-prompt' class."
}
[/CONTENT]
"""
):
    logger.info(msg)

    Role = Writer()
    result = asyncio.run(Role.run(msg))  
    print(msg)
    return result
    
if __name__ == "__main__":
    fire.Fire(main)


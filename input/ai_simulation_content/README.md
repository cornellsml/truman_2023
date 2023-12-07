# Run AI Simulation Content Generation Script

## Install

Activate the environment `truman-env` and install the necessary dependencies with:
```bash
conda env create --file requirements.yaml
conda activate truman-env
python -m spacy download en_core_web_sm
pip install BeautifulSoup4 langchain chromadb openai tiktoken libmagic nest_asyncio 
```

## Startup Variables

Set the following fields in the User Input section of generate_content.ipynb:

```
actor_general_description: description of the simulation actors (e.g. “generic social media users” or “professional athletes”) 
num_random_actors: number of simulation actors
age_range: range for randomly generated age of actors for actors.csv generation
num_posts_per_actor: range for randomly generated number of posts per actor
num_replies_per_post: range for randomly generated number of replies per randomly generated post
num_hours_before_user_join: length of simulation BEFORE user joins in hours (max is 24)
num_hours_after_user_join: length of simulation AFTER user joins in hours
num_user_posts: maximum number of posts we expect participants to post
user_likes_per_post: range for randomly generate number of likes per post from participant
user_reads_per_post: range for randomly generated number of reads per post from user
user_replies_per_post: range for randomly generated number of replies per post from user
num_user_replies: maximum number of replies we expect participants to post
user_likes_per_reply: range for randomly generated number of likes per reply from participant
user_reads_per_reply: range for randomly generated number of reads per reply from user
```

## Run

Run all cells in the generate_content.ipynb.
